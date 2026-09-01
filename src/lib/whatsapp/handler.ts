// src/lib/whatsapp/handler.ts
// Handler principal del bot de WhatsApp para OnlyPadel.
// Flujo completo: Saludo → Fecha → Cancha → Horario → Nombre → Pago MP → Confirmación automática.

import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { sendWhatsAppMessage, sendInteractiveButtons, sendInteractiveList } from './api';
import { getSession, updateSession, clearSession, cleanupSessions } from './session';
import { getAvailableSlotsForDate } from './slots';
// NUEVO: Importamos la notificación para el admin
import { sendAdminNotification } from './notifications';
import { PENDING_BOOKING_TTL_MS } from '@/lib/bookings/constants';

// ============================================================================
// HELPERS
// ============================================================================

/** Formatea una fecha a "DD/MM/YYYY" */
function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

/** Devuelve "YYYY-MM-DD" para hoy, mañana o pasado mañana */
function getDateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Busca o crea un User por número de teléfono y nombre */
async function findOrCreateUser(phone: string, name?: string): Promise<string> {
    let user = await prisma.user.findFirst({
        where: { phone },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: `wa_${phone}@whatsapp.local`,
                phone,
                name: name || `WhatsApp ${phone.slice(-4)}`,
                role: 'PLAYER',
            },
        });
        console.log(`👤 Nuevo usuario creado: ${user.name} (${phone})`);
    } else if (name && user.name !== name) {
        // Si ya existe pero cambió el nombre, actualizar
        user = await prisma.user.update({
            where: { id: user.id },
            data: { name },
        });
    }

    return user.id;
}

/** Obtiene la config de reservas desde SystemSetting */
async function getBookingSettings(): Promise<{ fee: number; requireDeposit: boolean }> {
    const settings = await prisma.systemSetting.findFirst({
        where: { id: 1 },
    });
    return {
        fee: settings?.reservationFee ?? 0,
        requireDeposit: settings?.requireDeposit ?? false,
    };
}

/** Genera un link de pago de MercadoPago para un booking */
async function generatePaymentLink(bookingId: string): Promise<string | null> {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { court: true, user: true },
        });

        if (!booking) return null;

        // Leer el token de MP desde SystemSetting (lo configura el admin desde la web)
        const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
        const mpToken = settings?.mpAccessToken;

        if (!mpToken) {
            console.error('❌ No hay mpAccessToken configurado en SystemSetting');
            return null;
        }

        const client = new MercadoPagoConfig({
            accessToken: mpToken,
        });

        const preference = new Preference(client);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';

        const result = await preference.create({
            requestOptions: { idempotencyKey: `booking-${booking.id}` },
            body: {
                items: [
                    {
                        id: booking.id,
                        title: `Seña - ${booking.court.name} - ${booking.startTime.toLocaleDateString('es-AR')}`,
                        quantity: 1,
                        unit_price: Number(booking.totalAmount),
                        currency_id: 'ARS',
                    },
                ],
                payer: {
                    email: booking.user?.email || 'cliente@onlypadel.local',
                    name: booking.user?.name || 'Cliente',
                },
                back_urls: {
                    success: `${appUrl}?status=success`,
                    failure: `${appUrl}?status=failure`,
                    pending: `${appUrl}?status=pending`,
                },
                auto_return: 'approved',
                external_reference: booking.id,
                notification_url: `${appUrl}/api/webhooks/mercadopago`,
            },
        });

        return result.init_point || null;
    } catch (error) {
        console.error('❌ Error generando link de pago:', error);
        return null;
    }
}

// Limpieza periódica de sesiones viejas + auto-cancel de bookings impagos
let lastCleanup = 0;

async function maybeCleanupSessions() {
    const now = Date.now();
    if (now - lastCleanup > 60 * 1000) { // Chequear cada 1 min
        cleanupSessions();
        lastCleanup = now;

        // Auto-cancelar bookings PENDING que superaron la ventana de pago.
        try {
            const cutoff = new Date(Date.now() - PENDING_BOOKING_TTL_MS);
            const stale = await prisma.booking.updateMany({
                where: {
                    status: 'PENDING',
                    createdAt: { lt: cutoff },
                },
                data: { status: 'CANCELLED', slotKey: null },
            });
            if (stale.count > 0) {
                console.log(`🗑️ Auto-canceladas ${stale.count} reservas PENDING sin pagar (>15 min)`);
            }
        } catch (err) {
            console.error('❌ Error auto-cancelando reservas viejas:', err);
        }
    }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================
export async function handleIncomingMessage(phone: string, message: any) {
    await maybeCleanupSessions();

    const messageType = message.type;
    const session = getSession(phone);

    // ========================================================================
    // 1. MENSAJES DE TEXTO
    // ========================================================================
    if (messageType === 'text') {
        const text = message.text.body.trim();
        const textLower = text.toLowerCase();

        // Si estamos esperando el nombre del cliente
        if (session.step === 'WAITING_NAME') {
            await handleNameInput(phone, text);
            return;
        }

        // Saludo / Reset → Menú principal
        if (
            textLower.includes('hola') ||
            textLower.includes('turno') ||
            textLower.includes('reserva') ||
            textLower.includes('cancha') ||
            textLower === 'menu' ||
            textLower === 'menú'
        ) {
            clearSession(phone);
            await sendMainMenu(phone);
            return;
        }

        // Mensaje desconocido
        await sendWhatsAppMessage(
            phone,
            '¡Hola! 👋 Escribí *"hola"* o *"turno"* para empezar a reservar.'
        );
        return;
    }

    // ========================================================================
    // 2. RESPUESTAS INTERACTIVAS (Botones y Listas)
    // ========================================================================
    if (messageType === 'interactive') {
        const interactiveType = message.interactive.type;

        if (interactiveType === 'button_reply') {
            const buttonId = message.interactive.button_reply.id;
            await handleButtonReply(phone, buttonId);
            return;
        }

        if (interactiveType === 'list_reply') {
            const listId = message.interactive.list_reply.id;
            const listTitle = message.interactive.list_reply.title;
            await handleListReply(phone, listId, listTitle);
            return;
        }
    }
}

// ============================================================================
// MENÚ PRINCIPAL
// ============================================================================
async function sendMainMenu(phone: string) {
    const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
    const clubName = settings?.clubName || 'Padel Club';
    const template = settings?.wspWelcome || '¡Hola! 👋 Bienvenido a *{clubName}*.\n¿Qué querés hacer hoy?';

    // Replace {clubName} and others just in case
    const message = template.replace(/\{(\w+)\}/g, (match, key) => {
        if (key === 'clubName') return clubName;
        return match;
    });

    await sendInteractiveButtons(
        phone,
        message,
        [
            { id: 'btn_reservar', title: '🎾 Reservar Turno' },
            { id: 'btn_mis_reservas', title: '📋 Mis Reservas' },
        ]
    );
}

// ============================================================================
// MANEJO DE NOMBRE (texto libre después de la confirmación)
// ============================================================================
async function handleNameInput(phone: string, name: string) {
    const session = getSession(phone);

    // Validación básica del nombre
    if (name.length < 2 || name.length > 60) {
        await sendWhatsAppMessage(
            phone,
            '⚠️ Por favor, escribí tu nombre completo (ej: *Juan Pérez*)'
        );
        return;
    }

    updateSession(phone, { clientName: name });

    // Ahora procedemos a crear la reserva y generar el link de pago
    await createBookingAndSendPaymentLink(phone);
}

// ============================================================================
// BOTONES
// ============================================================================
async function handleButtonReply(phone: string, buttonId: string) {
    // ----- RESERVAR TURNO → Elegir fecha -----
    if (buttonId === 'btn_reservar') {
        updateSession(phone, { step: 'CHOOSING_DATE' });

        await sendInteractiveButtons(phone, '📅 ¿Para qué día querés reservar?', [
            { id: 'date_hoy', title: '📌 Hoy' },
            { id: 'date_manana', title: '📌 Mañana' },
            { id: 'date_pasado', title: '📌 Pasado Mañana' },
        ]);
        return;
    }

    // ----- ELEGIR FECHA → Mostrar canchas -----
    if (buttonId.startsWith('date_')) {
        let dateStr: string;
        let dateLabel: string;

        switch (buttonId) {
            case 'date_hoy':
                dateStr = getDateOffset(0);
                dateLabel = 'Hoy';
                break;
            case 'date_manana':
                dateStr = getDateOffset(1);
                dateLabel = 'Mañana';
                break;
            case 'date_pasado':
                dateStr = getDateOffset(2);
                dateLabel = 'Pasado Mañana';
                break;
            default:
                dateStr = getDateOffset(0);
                dateLabel = 'Hoy';
        }

        updateSession(phone, {
            step: 'CHOOSING_COURT',
            date: dateStr,
            dateLabel,
        });

        await sendWhatsAppMessage(
            phone,
            `🔍 Buscando canchas disponibles para *${dateLabel}* (${formatDate(dateStr)})...`
        );

        try {
            const canchas = await prisma.court.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc' },
            });

            if (canchas.length === 0) {
                await sendWhatsAppMessage(
                    phone,
                    'Lo siento, no hay canchas activas en este momento. 😢'
                );
                clearSession(phone);
                return;
            }

            await sendInteractiveList(
                phone,
                `Seleccioná una cancha para ver los horarios libres del *${dateLabel}*:`,
                'Ver Canchas',
                '🎾 Canchas Disponibles',
                canchas.map(c => ({
                    id: `cancha_${c.id}`,
                    title: c.name,
                    description: `Deporte: ${c.sport}`,
                }))
            );
        } catch (error) {
            console.error('❌ Error consultando canchas:', error);
            await sendWhatsAppMessage(
                phone,
                'Uy, hubo un problema buscando las canchas. Intentá de nuevo en un ratito. 🛠️'
            );
            clearSession(phone);
        }

        return;
    }

    // ----- CONFIRMAR → Pedir nombre -----
    if (buttonId === 'btn_confirmar') {
        const session = getSession(phone);

        if (session.step !== 'CONFIRMING' || !session.courtId || !session.date || !session.slotTime || !session.slotEnd) {
            await sendWhatsAppMessage(phone, 'La sesión expiró. Escribí *"hola"* para empezar de nuevo. ⏰');
            clearSession(phone);
            return;
        }

        // Verificar si ya conocemos al usuario
        const existingUser = await prisma.user.findFirst({ where: { phone } });

        if (existingUser && existingUser.name && !existingUser.name.startsWith('WhatsApp')) {
            // Ya lo conocemos, usar su nombre directamente
            updateSession(phone, { clientName: existingUser.name });
            await createBookingAndSendPaymentLink(phone);
        } else {
            // No lo conocemos → pedir nombre
            updateSession(phone, { step: 'WAITING_NAME' });
            await sendWhatsAppMessage(
                phone,
                '📝 Para completar la reserva, *escribí tu nombre y apellido*:\n\n_(Ej: Juan Pérez)_'
            );
        }

        return;
    }

    // ----- CANCELAR RESERVA EN PROGRESO -----
    if (buttonId === 'btn_cancelar') {
        clearSession(phone);
        await sendWhatsAppMessage(
            phone,
            'Reserva cancelada. ¡No hay drama! 😊\nEscribí *"hola"* cuando quieras reservar.'
        );
        return;
    }

    // ----- MIS RESERVAS -----
    if (buttonId === 'btn_mis_reservas') {
        await handleMisReservas(phone);
        return;
    }

    // ----- VOLVER AL MENÚ -----
    if (buttonId === 'btn_volver') {
        clearSession(phone);
        await sendMainMenu(phone);
        return;
    }
}

// ============================================================================
// LISTAS
// ============================================================================
async function handleListReply(phone: string, listId: string, listTitle: string) {
    const session = getSession(phone);

    // ----- ELIGIÓ UNA CANCHA → Mostrar horarios libres -----
    if (listId.startsWith('cancha_')) {
        const courtId = listId.replace('cancha_', '');

        if (!session.date) {
            await sendWhatsAppMessage(phone, 'La sesión expiró. Escribí *"hola"* para empezar de nuevo. ⏰');
            clearSession(phone);
            return;
        }

        updateSession(phone, {
            step: 'CHOOSING_SLOT',
            courtId,
            courtName: listTitle,
        });

        await sendWhatsAppMessage(
            phone,
            `🔍 Buscando horarios libres en *${listTitle}* para el *${session.dateLabel}*...`
        );

        try {
            const slots = await getAvailableSlotsForDate(courtId, session.date);

            if (slots.length === 0) {
                await sendWhatsAppMessage(
                    phone,
                    `😔 No hay horarios disponibles en *${listTitle}* para el *${session.dateLabel}*.\n\nProbá con otra cancha o fecha.`
                );
                await sendInteractiveButtons(phone, '¿Qué querés hacer?', [
                    { id: 'btn_reservar', title: '🔄 Otra fecha' },
                    { id: 'btn_volver', title: '🏠 Menú' },
                ]);
                return;
            }

            // Meta limita a 10 filas por sección
            const slotsToShow = slots.slice(0, 10);

            await sendInteractiveList(
                phone,
                `Horarios libres en *${listTitle}* para el *${session.dateLabel}* (${formatDate(session.date)}):`,
                'Ver Horarios',
                `🕐 Horarios - ${listTitle}`,
                slotsToShow.map(slot => ({
                    id: `slot_${slot.time.replace(':', '')}`,
                    title: slot.label,
                    description: `Turno de ${session.courtName}`,
                }))
            );
        } catch (error) {
            console.error('❌ Error calculando slots:', error);
            await sendWhatsAppMessage(
                phone,
                'Uy, hubo un problema buscando los horarios. Intentá de nuevo. 🛠️'
            );
            clearSession(phone);
        }

        return;
    }

    // ----- ELIGIÓ UN HORARIO → Pedir confirmación -----
    if (listId.startsWith('slot_')) {
        const timeRaw = listId.replace('slot_', ''); // "1430"
        const slotTime = `${timeRaw.substring(0, 2)}:${timeRaw.substring(2)}`;

        if (!session.courtId || !session.date) {
            await sendWhatsAppMessage(phone, 'La sesión expiró. Escribí *"hola"* para empezar de nuevo. ⏰');
            clearSession(phone);
            return;
        }

        // Calcular hora de fin usando el slotDuration de businessHour
        const targetDate = new Date(`${session.date}T00:00:00`);
        const dayOfWeek = targetDate.getDay();

        const businessHour = await prisma.businessHour.findFirst({
            where: { courtId: session.courtId, dayOfWeek },
        });

        const duration = businessHour?.slotDuration ?? 90;
        const [h, m] = slotTime.split(':').map(Number);
        const endMinutes = h * 60 + m + duration;
        const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0');
        const endM = (endMinutes % 60).toString().padStart(2, '0');
        const slotEnd = `${endH}:${endM}`;

        updateSession(phone, {
            step: 'CONFIRMING',
            slotTime,
            slotEnd,
        });

        // Obtener config de seña
        const { fee, requireDeposit } = await getBookingSettings();
        const priceText = requireDeposit && fee > 0 ? `\n💰 *Seña:* $${fee.toLocaleString('es-AR')}` : '';

        await sendInteractiveButtons(
            phone,
            `📋 *Resumen de tu reserva:*\n\n` +
            `📍 *Cancha:* ${session.courtName}\n` +
            `📅 *Fecha:* ${session.dateLabel} (${formatDate(session.date)})\n` +
            `🕐 *Horario:* ${slotTime} - ${slotEnd}` +
            priceText +
            `\n\n¿Confirmamos? 🎾`,
            [
                { id: 'btn_confirmar', title: '✅ Confirmar' },
                { id: 'btn_cancelar', title: '❌ Cancelar' },
            ]
        );
        return;
    }
}

// ============================================================================
// CREAR BOOKING + GENERAR LINK DE PAGO MP
// ============================================================================
async function createBookingAndSendPaymentLink(phone: string) {
    const session = getSession(phone);

    if (!session.courtId || !session.date || !session.slotTime || !session.slotEnd) {
        await sendWhatsAppMessage(phone, 'La sesión expiró. Escribí *"hola"* para empezar de nuevo. ⏰');
        clearSession(phone);
        return;
    }

    try {
        // 1. Buscar o crear usuario con nombre
        const userId = await findOrCreateUser(phone, session.clientName);

        // 2. Obtener config de seña
        const { fee, requireDeposit } = await getBookingSettings();

        // 3. TRANSACCIÓN ATÓMICA — Anti-duplicación
        const startTime = new Date(`${session.date}T${session.slotTime}:00-03:00`);
        const endTime = new Date(`${session.date}T${session.slotEnd}:00-03:00`);
        if (endTime <= startTime) endTime.setDate(endTime.getDate() + 1);

        let booking;
        try {
            booking = await prisma.$transaction(async (tx) => {
                const existing = await tx.booking.findFirst({
                    where: {
                        courtId: session.courtId!,
                        status: { in: ['PENDING', 'CONFIRMED', 'FIXED', 'BLOCKED'] },
                        startTime: { lt: endTime },
                        endTime: { gt: startTime },
                    },
                });

                if (existing) {
                    throw new Error('SLOT_TAKEN');
                }

                return tx.booking.create({
                    data: {
                        courtId: session.courtId!,
                        userId,
                        startTime,
                        endTime,
                        totalAmount: requireDeposit ? fee : 0,
                        status: requireDeposit ? 'PENDING' : 'CONFIRMED',
                        slotKey: `${session.courtId}:${startTime.toISOString()}`,
                    },
                    include: { court: true },
                });
            });
        } catch (txError: any) {
            if (txError?.message === 'SLOT_TAKEN' || txError?.code === 'P2002') {
                await sendWhatsAppMessage(
                    phone,
                    '😔 ¡Ups! Alguien reservó este turno justo antes que vos. Intentá con otro horario.'
                );
                clearSession(phone);
                await sendMainMenu(phone);
                return;
            }
            throw txError; // Re-throw for the outer catch
        }

        const clientLabel = session.clientName || phone;

        console.log(`🎾 Reserva creada vía WhatsApp: ${booking.id} | ${clientLabel} | ${session.courtName} | ${session.date} ${session.slotTime}`);

        // 5. Flujo según si la seña está activada o no
        if (requireDeposit && fee > 0) {
            const paymentLink = await generatePaymentLink(booking.id);

            if (paymentLink) {
                await sendWhatsAppMessage(
                    phone,
                    `🎾 *¡Reserva registrada, ${session.clientName || 'crack'}!*\n\n` +
                    `📍 *Cancha:* ${booking.court.name}\n` +
                    `📅 *Fecha:* ${formatDate(session.date)}\n` +
                    `🕐 *Horario:* ${session.slotTime} - ${session.slotEnd}\n` +
                    `👤 *A nombre de:* ${clientLabel}\n` +
                    `💰 *Seña:* $${fee.toLocaleString('es-AR')}\n\n` +
                    `📌 *Estado:* ⏳ Pendiente de pago\n\n` +
                    `👇 *Pagá la seña para confirmar tu turno:*\n${paymentLink}\n\n` +
                    `⏱️ _Tenés 15 minutos para pagar; después el turno se libera automáticamente._`
                );
            } else {
                await sendWhatsAppMessage(
                    phone,
                    `🎾 *Reserva registrada, ${session.clientName || 'crack'}!*\n\n` +
                    `📍 *Cancha:* ${booking.court.name}\n` +
                    `📅 *Fecha:* ${formatDate(session.date)}\n` +
                    `🕐 *Horario:* ${session.slotTime} - ${session.slotEnd}\n` +
                    `👤 *A nombre de:* ${clientLabel}\n\n` +
                    `⚠️ Hubo un problema generando el link de pago. Contactanos para coordinar.`
                );
            }
        } else {
            // Sin seña → ya se creó como CONFIRMED
            await sendWhatsAppMessage(
                phone,
                `✅ *¡Turno confirmado, ${session.clientName || 'crack'}!*\n\n` +
                `📍 *Cancha:* ${booking.court.name}\n` +
                `📅 *Fecha:* ${formatDate(session.date)}\n` +
                `🕐 *Horario:* ${session.slotTime} - ${session.slotEnd}\n` +
                `👤 *A nombre de:* ${clientLabel}\n` +
                `📌 *Estado:* ✅ Confirmado\n\n` +
                `¡Te esperamos! 🎾💪`
            );

            // ---> NUEVO: Avisar al admin que entró una reserva confirmada por WhatsApp <---
            await sendAdminNotification(booking.id).catch(err =>
                console.error('Error enviando notificación al admin (WA):', err)
            );
        }

        clearSession(phone);
    } catch (error) {
        console.error('❌ Error creando reserva:', error);
        await sendWhatsAppMessage(
            phone,
            'Uy, hubo un problema al procesar tu reserva. Intentá de nuevo. 🛠️'
        );
        clearSession(phone);
    }
}

// ============================================================================
// MIS RESERVAS
// ============================================================================
async function handleMisReservas(phone: string) {
    try {
        const user = await prisma.user.findFirst({
            where: { phone },
        });

        if (!user) {
            await sendWhatsAppMessage(
                phone,
                'No encontramos reservas asociadas a tu número. 🤔\nReservá tu primer turno escribiendo *"hola"*.'
            );
            return;
        }

        const now = new Date();
        const bookings = await prisma.booking.findMany({
            where: {
                userId: user.id,
                startTime: { gte: now },
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            include: { court: true },
            orderBy: { startTime: 'asc' },
            take: 5,
        });

        if (bookings.length === 0) {
            await sendWhatsAppMessage(
                phone,
                'No tenés reservas pendientes. 📭\nEscribí *"hola"* para reservar un turno.'
            );
            return;
        }

        let msg = `📋 *Tus próximas reservas, ${user.name || 'crack'}:*\n\n`;

        bookings.forEach((b, i) => {
            const fecha = b.startTime.toLocaleDateString('es-AR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
            });
            const horaInicio = b.startTime.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            const horaFin = b.endTime.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            const statusEmoji = b.status === 'CONFIRMED' ? '✅' : '⏳';
            const statusText = b.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente de pago';

            msg += `${i + 1}. ${statusEmoji} *${b.court.name}*\n`;
            msg += `   📅 ${fecha} | 🕐 ${horaInicio} - ${horaFin}\n`;
            msg += `   📌 ${statusText}\n\n`;
        });

        await sendWhatsAppMessage(phone, msg);
        await sendInteractiveButtons(phone, '¿Qué más querés hacer?', [
            { id: 'btn_reservar', title: '🎾 Reservar Turno' },
            { id: 'btn_volver', title: '🏠 Menú' },
        ]);
    } catch (error) {
        console.error('❌ Error buscando reservas del usuario:', error);
        await sendWhatsAppMessage(
            phone,
            'Hubo un problema buscando tus reservas. Intentá de nuevo. 🛠️'
        );
    }
}
