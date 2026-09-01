'use server';

import { MercadoPagoConfig, Preference } from 'mercadopago';
import { prisma } from '@/lib/prisma';
import { requireTenantFeature } from '@/lib/features';
import { resolveTenantContext } from '@/lib/tenant-context';

export async function createPaymentPreference(bookingId: string) {
  try {
    await requireTenantFeature('payments');
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        court: true,
      },
    });

    if (!booking) {
      throw new Error('Reserva no encontrada');
    }

    // Leer el token de MP desde SystemSetting (lo configura el admin desde la web)
    const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
    const mpToken = settings?.mpAccessToken;

    if (!mpToken) {
      return { success: false, error: 'No hay token de MercadoPago configurado en el panel de admin.' };
    }

    const client = new MercadoPagoConfig({
      accessToken: mpToken,
    });

    const preference = new Preference(client);
    const tenant = await resolveTenantContext();
    const appUrl = `https://${tenant.hostname}`;

    const result = await preference.create({
      requestOptions: { idempotencyKey: `booking-${booking.id}` },
      body: {
        items: [
          {
            id: booking.id,
            title: `Seña - ${booking.court.name}`,
            quantity: 1,
            unit_price: Number(booking.totalAmount),
            currency_id: 'ARS',
          }
        ],
        payer: {
          email: booking.user?.email || 'cliente@onlypadel.local',
          name: booking.user?.name || 'Cliente',
        },
        // CORRECCIÓN: Evitamos el 404 redirigiendo a la raíz de la app con un parámetro de estado.
        back_urls: {
          success: `${appUrl}?status=success`,
          failure: `${appUrl}?status=failure`,
          pending: `${appUrl}?status=pending`,
        },
        auto_return: 'approved',
        external_reference: booking.id,
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      }
    });

    return { success: true, init_point: result.init_point };
  } catch (error) {
    console.error('Error creando preferencia de MercadoPago:', error);
    return { success: false, error: 'No se pudo inicializar el pago' };
  }
}

export async function createTournamentPaymentPreference(teamId: string) {
  try {
    await requireTenantFeature('payments');
    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
      include: { category: { include: { tournament: true } }, player1: true }
    });

    if (!team) throw new Error('Equipo no encontrado');
    if (team.isPaid) return { success: false, error: 'La inscripción ya está pagada.' };

    const tournament = team.category.tournament;
    if (tournament.status !== 'REGISTRATION') {
      return { success: false, error: 'Las inscripciones están cerradas.' };
    }
    if (!tournament.requireDeposit || Number(tournament.depositAmount) <= 0) {
      return { success: false, error: 'Este torneo no requiere seña.' };
    }

    const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
    const mpToken = settings?.mpAccessToken;

    if (!mpToken) {
      return { success: false, error: 'No hay token de MercadoPago configurado.' };
    }

    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);
    const tenant = await resolveTenantContext();
    const appUrl = `https://${tenant.hostname}`;

    const result = await preference.create({
      requestOptions: { idempotencyKey: `tournament-${team.id}` },
      body: {
        items: [
          {
            id: `TORN-${team.id}`,
            title: `Seña Torneo - ${tournament.name} (${team.category.name})`,
            quantity: 1,
            unit_price: Number(tournament.depositAmount),
            currency_id: 'ARS',
          }
        ],
        payer: {
          email: team.player1?.email || 'cliente@onlypadel.local',
          name: team.name || team.player1?.name || 'Jugador',
        },
        back_urls: {
          success: `${appUrl}/torneos/${tournament.id}?status=success`,
          failure: `${appUrl}/torneos/${tournament.id}?status=failure`,
          pending: `${appUrl}/torneos/${tournament.id}?status=pending`,
        },
        auto_return: 'approved',
        external_reference: `TORN-${team.id}`,
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      }
    });

    return { success: true, init_point: result.init_point };
  } catch (error) {
    console.error('Error creando preferencia MP Torneo:', error);
    return { success: false, error: 'No se pudo inicializar el pago' };
  }
}
