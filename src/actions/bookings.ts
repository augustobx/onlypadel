'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { normalizePhoneForWhatsApp } from '@/lib/whatsapp/notifications';
import { z } from 'zod';
import { PENDING_BOOKING_TTL_MS } from '@/lib/bookings/constants';

const publicBookingSchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  requestKey: z.string().min(16).max(64).regex(/^[a-zA-Z0-9_-]+$/),
});

const activeBookingStatuses = ['PENDING', 'CONFIRMED', 'FIXED', 'BLOCKED'] as const;

function getSlotKey(courtId: string, startTime: Date) {
  return `${courtId}:${startTime.toISOString()}`;
}

// 1. Obtener reservas por día (Para el Panel de Admin)
export async function getBookingsByDate(dateStr: string) {
  try {
    // AUTO-CANCELAR RESERVAS PENDIENTES EXPIRADAS (>5 min)
    try {
        const cutoff = new Date(Date.now() - PENDING_BOOKING_TTL_MS);
        await prisma.booking.updateMany({
            where: { status: 'PENDING', createdAt: { lt: cutoff } },
            data: { status: 'CANCELLED', slotKey: null }
        });
    } catch(e) { console.error("Error auto-canceling pending bookings:", e); }

    const startOfDay = new Date(`${dateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999-03:00`);

    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
      include: {
        court: true,
        user: true,
      },
      orderBy: [
        { courtId: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return { success: true, data: bookings };
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return { success: false, error: 'Error al cargar las reservas del día.' };
  }
}

// 2. Crear una nueva reserva (Para el Frontend Público — PWA)
//    Usa Prisma $transaction para evitar CUALQUIER duplicación por race condition.
export async function createBooking(data: {
  courtId: string;
  date: string;      // "YYYY-MM-DD"
  time: string;      // "HH:mm"
  name: string;
  phone: string;
  requestKey: string;
}) {
  try {
    const parsed = publicBookingSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: 'Revisá los datos ingresados e intentá nuevamente.' };
    }
    data = parsed.data;
    // We need to parse time properly, even if time is wrapped around. Wait, public-bookings returns the actual next-day time if wrapped, e.g. "00:30". But we need to use the right date.
    // However, if the time is wrapped (e.g. 00:30) and date is the selected visual day, we should ensure the booking logic handles it. 
    // Actually, in public-bookings, the returned `time` is simply the wrapped "00:30" string. The user selects the `date` visually.
    // If we receive time "00:30" for a business that opens at 09:00, it's obviously the next day.
    const [h, m] = data.time.split(':').map(Number);
    let finalDateStr = data.date;
    // Simple heuristic: If hour is very early (e.g., < 6) but it's part of the evening schedule, it should belong to the next day.
    // We can fetch business hour to verify.
    const tempStartTime = new Date(`${data.date}T00:00:00-03:00`);
    const dayOfWeek = tempStartTime.getDay();
    const businessHour = await prisma.businessHour.findFirst({
      where: { courtId: data.courtId, dayOfWeek }
    });

    if (!businessHour) {
      return { success: false, error: 'La cancha no está disponible ese día.' };
    }

    const [openH] = businessHour.openTime.split(':').map(Number);
    if (h < openH && h < 6) { 
        // It's the next day
        tempStartTime.setDate(tempStartTime.getDate() + 1);
        finalDateStr = `${tempStartTime.getFullYear()}-${String(tempStartTime.getMonth() + 1).padStart(2, '0')}-${String(tempStartTime.getDate()).padStart(2, '0')}`;
    }

    const startTime = new Date(`${finalDateStr}T${data.time}:00-03:00`);


    const endTime = new Date(startTime.getTime() + businessHour.slotDuration * 60000);
    const slotKey = getSlotKey(data.courtId, startTime);

    // Importante: Normalizamos el teléfono para que PWA y WhatsApp coincidan siempre
    const normalizedPhone = normalizePhoneForWhatsApp(data.phone);

    // Si el servidor alcanzó a guardar la reserva pero el celular perdió la
    // respuesta, el mismo requestKey devuelve exactamente la reserva original.
    const previousAttempt = await prisma.booking.findUnique({ where: { requestKey: data.requestKey } });
    if (previousAttempt) {
      if (previousAttempt.courtId !== data.courtId || previousAttempt.startTime.getTime() !== startTime.getTime()) {
        return { success: false, error: 'La solicitud ya fue utilizada para otro turno. Volvé a elegir el horario.' };
      }
      if (previousAttempt.status === 'CANCELLED') {
        return { success: false, error: 'La reserva anterior venció. Volvé a elegir el horario para generar una nueva.' };
      }
      return {
        success: true,
        data: {
          bookingId: previousAttempt.id,
          fee: Number(previousAttempt.totalAmount),
          requireDeposit: previousAttempt.status === 'PENDING',
          reused: true,
        },
      };
    }

    // Buscar si hay sesión activa (usuario registrado)
    const { getUserSession } = await import('@/actions/user-auth');
    const session = await getUserSession();

    let user = null;

    if (session) {
      user = await prisma.user.findUnique({ where: { id: session.id } });
    }

    if (!user) {
      // Buscar o crear usuario ANTES de la transacción (no es crítico para race condition)
      user = await prisma.user.findFirst({
        where: { phone: normalizedPhone }
      });

      if (!user) {
        user = await prisma.user.upsert({
          where: { email: `${normalizedPhone}@cliente.tpadel` },
          create: {
            email: `${normalizedPhone}@cliente.tpadel`,
            name: data.name,
            phone: normalizedPhone,
            role: 'PLAYER',
          },
          update: { name: data.name, phone: normalizedPhone },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: data.name, phone: normalizedPhone }
        });
      }
    } else {
      // If user is found via session, ensure their phone is normalized in DB
      if (user.phone !== normalizedPhone) {
        // check if someone else is already using this normalized phone
        const exists = await prisma.user.findFirst({
          where: { phone: normalizedPhone, id: { not: user.id } }
        });
        if (!exists) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { phone: normalizedPhone }
          });
        }
      }
    }

    // Obtener config
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    const fee = settings?.reservationFee ?? 0;
    let requireDeposit = settings?.requireDeposit ?? false;

    if (settings?.usersModuleEnabled && settings?.requireDepositForRegistered === false) {
      if (user && user.password) {
        requireDeposit = false;
      }
    }

    // ========== TRANSACCIÓN ATÓMICA — ANTI-DUPLICACIÓN ==========
    // Dentro de la transacción: verificar overlap + crear booking.
    // Si 2 requests entran al mismo tiempo, solo 1 gana.
    const booking = await prisma.$transaction(async (tx) => {
      // Check de overlap DENTRO de la transacción (serializable)
      const existing = await tx.booking.findFirst({
        where: {
          courtId: data.courtId,
          status: { in: [...activeBookingStatuses] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        }
      });

      if (existing) {
        throw new Error('SLOT_TAKEN');
      }

      return tx.booking.create({
        data: {
          courtId: data.courtId,
          userId: user!.id,
          startTime,
          endTime,
          totalAmount: requireDeposit ? fee : 0,
          status: requireDeposit ? 'PENDING' : 'CONFIRMED',
          requestKey: data.requestKey,
          slotKey,
        }
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    revalidatePath('/admin/calendar');
    revalidatePath('/admin/dashboard');
    revalidatePath('/reservas');

    // === NOTIFICACIONES PUSH PARA ADMINS ===
    const push = await import('@/lib/push');
    push.sendAdminPushNotification(
      '🎾 Nuevo Turno Reservado',
      `${data.name} ha reservado el ${data.date} a las ${data.time} hs.`,
      `/admin/calendar?date=${data.date}&highlight=${booking.id}`
    ).catch(err => console.error('Error enviando push:', err));

    // === NOTIFICACIONES WHATSAPP AL CLIENTE (Y AL ADMIN) ===
    // CORRECCIÓN: Importamos el módulo completo. Ya no disparamos al admin a lo loco.
    const notifications = await import('@/lib/whatsapp/notifications');

    if (!requireDeposit) {
      // 1. Si NO requiere seña, el turno ya es seguro. Le confirmamos al cliente:
      notifications.sendBookingConfirmation(booking.id).catch(err =>
        console.error('Error enviando confirmación WhatsApp (PWA sin seña):', err)
      );

      // 2. Y también le avisamos de inmediato al admin:
      // @ts-ignore
      if (notifications.sendAdminNotification) {
        // @ts-ignore
        notifications.sendAdminNotification(booking.id).catch(err =>
          console.error('Error enviando WhatsApp al admin:', err)
        );
      }
    } else if (requireDeposit && fee > 0) {
      // Si SÍ requiere seña, le mandamos el link de pago al cliente.
      // AL ADMIN NO LE AVISAMOS NADA. El aviso saldrá desde el Webhook de MP al pagarse.
      try {
        const { createPaymentPreference } = await import('@/actions/payments');
        const paymentResult = await createPaymentPreference(booking.id);

        if (paymentResult.success && paymentResult.init_point) {
          notifications.sendBookingPendingPayment(booking.id, paymentResult.init_point).catch(err =>
            console.error('Error enviando link de pago WhatsApp (PWA con seña):', err)
          );
        }
      } catch (err) {
        console.error('Error generando preferencia de pago para WhatsApp:', err);
      }
    }

    return { success: true, data: { bookingId: booking.id, fee, requireDeposit } };
  } catch (error: any) {
    if (error?.message === 'SLOT_TAKEN') {
      return { success: false, error: 'Lo sentimos, este turno acaba de ser reservado por otra persona.' };
    }
    if (error?.code === 'P2002') {
      const existingAttempt = await prisma.booking.findUnique({ where: { requestKey: data.requestKey } });
      if (existingAttempt && existingAttempt.status !== 'CANCELLED') {
        return {
          success: true,
          data: {
            bookingId: existingAttempt.id,
            fee: Number(existingAttempt.totalAmount),
            requireDeposit: existingAttempt.status === 'PENDING',
            reused: true,
          },
        };
      }
      return { success: false, error: 'Ese horario acaba de ocuparse. Elegí otro turno disponible.' };
    }
    console.error('Error creating booking:', error);
    return { success: false, error: 'Ocurrió un error al procesar la reserva.' };
  }
}
