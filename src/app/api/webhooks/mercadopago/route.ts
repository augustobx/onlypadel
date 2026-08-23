// src/app/api/webhooks/mercadopago/route.ts
import { NextResponse } from 'next/server';
import { Payment, MercadoPagoConfig } from 'mercadopago';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmation, sendAdminNotification } from '@/lib/whatsapp/notifications';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'payment') {
      // Leer el token de MP desde SystemSetting (lo configura el admin desde la web)
      const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
      const mpToken = settings?.mpAccessToken;

      if (!mpToken) {
        console.error('❌ Webhook MP: No hay mpAccessToken en SystemSetting');
        return NextResponse.json({ success: false }, { status: 200 });
      }

      const client = new MercadoPagoConfig({ accessToken: mpToken });
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: data.id });

      if (paymentInfo.status === 'approved') {
        const reference = paymentInfo.external_reference;

        if (reference?.startsWith('TORN-')) {
          const teamId = reference.slice(5);
          const team = await prisma.tournamentTeam.findUnique({ where: { id: teamId } });
          if (team && !team.isPaid) {
            await prisma.tournamentTeam.update({
              where: { id: teamId },
              data: { isPaid: true, paymentId: String(paymentInfo.id) },
            });
            console.log(`Pago de torneo aprobado para la pareja ${teamId}`);
          }
        } else if (reference) {
          const bookingId = reference;
          // Verificar estado actual para no reenviar WSP en webhooks duplicados o de liberación de fondos
          const existingBooking = await prisma.booking.findUnique({
            where: { id: bookingId }
          });

          if (existingBooking && existingBooking.status !== 'CONFIRMED') {
            try {
              // Si el pago llegó tarde y el turno había vencido, intentamos
              // reclamar nuevamente el slot. La clave única evita confirmar
              // dos reservas para la misma cancha y hora.
              await prisma.booking.update({
                where: { id: bookingId },
                data: {
                  status: 'CONFIRMED',
                  paymentId: String(paymentInfo.id),
                  slotKey: `${existingBooking.courtId}:${existingBooking.startTime.toISOString()}`,
                },
              });
            } catch (error) {
              if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                await prisma.booking.update({
                  where: { id: bookingId },
                  data: {
                    paymentId: String(paymentInfo.id),
                    description: 'PAGO APROBADO FUERA DE TÉRMINO: el horario ya fue reasignado. Requiere devolución o reprogramación.',
                  },
                });
                console.error(`Pago tardío para booking ${bookingId}: el horario ya está ocupado.`);
                return NextResponse.json({ success: true }, { status: 200 });
              }
              throw error;
            }

            console.log(`✅ Pago aprobado para booking ${bookingId} — PaymentID: ${paymentInfo.id}`);

            // 2. Enviar confirmación automática por WhatsApp al cliente
            await sendBookingConfirmation(bookingId);

            // 3. NUEVO: Enviar notificación al administrador AHORA que está pagado
            await sendAdminNotification(bookingId);
          } else if (existingBooking?.status === 'CONFIRMED') {
            console.log(`ℹ️ Webhook MP ignorado: el booking ${bookingId} ya estaba confirmado.`);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error en webhook de MercadoPago:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
