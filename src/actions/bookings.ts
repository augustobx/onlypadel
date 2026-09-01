'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { normalizePhoneForWhatsApp } from '@/lib/whatsapp/notifications';
import { z } from 'zod';
import { PENDING_BOOKING_TTL_MS } from '@/lib/bookings/constants';

const publicBookingSchema = z.object({
  courtId: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  requestKey: z.string().min(10).max(64).regex(/^[a-zA-Z0-9_-]+$/),
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

    // Cálculo robusto e independiente de la zona horaria del servidor
    const [year, month, day] = data.date.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const businessHour = await prisma.businessHour.findFirst({
      where: { courtId: data.courtId, dayOfWeek }
    });

    if (!businessHour) {
      return { success: false, error: 'La cancha no está disponible ese día.' };
    }

    const [h] = data.time.split(':').map(Number);
    const [openH] = businessHour.openTime.split(':').map(Number);
    const [closeH] = businessHour.closeTime.split(':').map(Number);
    let finalDateStr = data.date;

    // Si el turno pertenece a la madrugada posterior de una jornada que cruza medianoche
    if (h < openH && (closeH <= openH || h < 6)) {
      const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1));
      finalDateStr = `${nextDayDate.getUTCFullYear()}-${String(nextDayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDayDate.getUTCDate()).padStart(2, '0')}`;
    }

    const startTime = new Date(`${finalDateStr}T${data.time}:00-03:00`);
    const endTime = new Date(startTime.getTime() + businessHour.slotDuration * 60000);
    const slotKey = getSlotKey(data.courtId, startTime);

    // Importante: Normalizamos el teléfono para que PWA y WhatsApp coincidan siempre
    const normalizedPhone = normalizePhoneForWhatsApp(data.phone);

    // Si el servidor alcanzó a guardar la reserva pero el celular perdió la
    // respuesta, el mismo requestKey devuelve exactamente la reserva original.
    const previousAttempt = await prisma.booking.findFirst({ where: { requestKey: data.requestKey } });
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
      // Buscar o crear usuario ANTES de la transacción
      const rawDigits = data.phone.replace(/\D/g, '');
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: data.phone },
            { phone: rawDigits }
          ]
        }
      });

      if (!user) {
        const emailToUse = `${normalizedPhone}@cliente.onlypadel`;
        const existingByEmail = await prisma.user.findFirst({ where: { email: emailToUse } });
        if (existingByEmail) {
          user = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { name: data.name, phone: normalizedPhone }
          });
        } else {
          user = await prisma.user.create({
            data: {
              email: emailToUse,
              name: data.name,
              phone: normalizedPhone,
              role: 'PLAYER',
            }
          });
        }
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: data.name, phone: normalizedPhone }
        });
      }
    } else {
      // Si el usuario está registrado con sesión, mantener sincronizado su teléfono
      if (user.phone !== normalizedPhone) {
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
    const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
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
      const existingAttempt = await prisma.booking.findFirst({ where: { requestKey: data.requestKey } });
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
