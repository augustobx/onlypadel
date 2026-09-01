// src/lib/whatsapp/notifications.ts
// Módulo centralizado de notificaciones por WhatsApp.
// Se usa tanto para reservas hechas por WhatsApp como por la PWA.

import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, sendTemplateMessage } from './api';

/** Formatea una fecha a "DD/MM/YYYY" */
function formatDateStr(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/** Formatea hora "HH:mm" */
function formatTime(date: Date): string {
    return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Normaliza un número de teléfono argentino al formato que acepta WhatsApp.
 * Ejemplos de entrada → salida:
 *   "3329 123456"      → "543329123456"
 *   "03329-123456"     → "543329123456"
 *   "+54 3329 123456"  → "543329123456"
 *   "54 9 3329 123456" → "5493329123456"
 *   "5493329123456"    → "5493329123456" (ya correcto)
 *   "15 3329 1234"     → "543329123456" (intenta)
 */
export function normalizePhoneForWhatsApp(phone: string): string {
    // Quitar todo lo que no sea dígito
    let digits = phone.replace(/\D/g, '');

    // Si ya empieza con 549 y tiene ~13 dígitos, es formato WhatsApp
    if (digits.startsWith('549') && digits.length >= 12) {
        return digits;
    }

    // Si empieza con 54 pero sin 9 (ej: 543329123456)
    if (digits.startsWith('54') && !digits.startsWith('549') && digits.length >= 11) {
        return '549' + digits.substring(2);
    }

    // Si empieza con 0 (ej: 03329123456), quitar el 0
    if (digits.startsWith('0')) {
        digits = digits.substring(1);
    }

    // Si empieza con 15 (prefijo celular viejo), quitarlo
    if (digits.startsWith('15') && digits.length > 8) {
        digits = digits.substring(2);
    }

    // A esta altura debería ser un número local tipo "3329123456"
    // Agregar código de país Argentina (54)
    if (!digits.startsWith('54')) {
        digits = '549' + digits;
    }

    return digits;
}

/** Reemplaza variables en el texto del template ({variable}) */
function fillTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
    });
}

// ============================================================================
// CONFIRMACIÓN DE BOOKING — Se dispara post-pago (MP webhook) o directo (sin seña)
// Funciona para CUALQUIER booking (WhatsApp o PWA)
// ============================================================================
export async function sendBookingConfirmation(bookingId: string): Promise<void> {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { court: true, user: true },
        });

        if (!booking || !booking.user) {
            console.warn(`⚠️ No se pudo enviar confirmación: booking ${bookingId} sin usuario`);
            return;
        }

        const rawPhone = booking.user.phone;
        if (!rawPhone) return;

        const phone = normalizePhoneForWhatsApp(rawPhone);

        const clientName = booking.user.name || 'Cliente';
        const fecha = formatDateStr(booking.startTime);
        const horaInicio = formatTime(booking.startTime);
        const horaFin = formatTime(booking.endTime);
        const courtName = booking.court.name;
        //const detalle = `Cancha: ${courtName} - Fin: ${horaFin}`;
        const detalle = courtName;
        // Intentar enviar plantilla aprobada de Meta
        const templateResult = await sendTemplateMessage(
            phone,
            'confirmacion_turno_pwa_tpadel_spa',
            [clientName, fecha, horaInicio, detalle],
            'es_AR'
        );

        if (templateResult) {
            console.log(`📩 Plantilla enviada a ${phone} para booking ${bookingId}`);
        } else {
            // FALLBACK: Si la plantilla no existe o falla, enviar texto normal
            console.log(`⚠️ Plantilla falló, enviando texto plano a ${phone}`);
            const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
            const clubName = settings?.clubName || 'Padel Club';
            const fallbackMsg = `✅ *¡Turno confirmado, ${clientName}!*\n\n📍 *Cancha:* ${courtName}\n📅 *Fecha:* ${fecha}\n🕐 *Horario:* ${horaInicio} - ${horaFin}\n📌 *Estado:* ✅ Confirmado\n\n¡Te esperamos en ${clubName}! 💪`;
            await sendWhatsAppMessage(phone, fallbackMsg);
        }
    } catch (error) {
        console.error(`❌ Error enviando confirmación para booking ${bookingId}:`, error);
    }
}

// ============================================================================
// NOTIFICACIÓN DE BOOKING PENDIENTE DE PAGO — Se envía al crear la reserva
// ============================================================================
export async function sendBookingPendingPayment(
    bookingId: string,
    paymentLink: string
): Promise<void> {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                court: true,
                user: true,
            },
        });

        if (!booking || !booking.user) return;

        const rawPhone = booking.user.phone;
        if (!rawPhone) return;

        const phone = normalizePhoneForWhatsApp(rawPhone);
        const clientName = booking.user.name || `Cliente ${phone.slice(-4)}`;
        const fecha = formatDateStr(booking.startTime);
        const horaInicio = formatTime(booking.startTime);
        const horaFin = formatTime(booking.endTime);
        const amount = Number(booking.totalAmount);

        // Obtener configuración para el template
        const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
        const clubName = settings?.clubName || 'Padel Club';
        const sportEmoji = settings?.sportEmoji || '🎾';
        const template = settings?.wspPending || `{sportEmoji} *¡Reserva registrada, {clientName}!*\n\n📍 *Cancha:* {courtName}\n📅 *Fecha:* {date}\n🕐 *Horario:* {startTime} - {endTime}\n💰 *Seña:* \${fee}\n\n📌 *Estado:* ⏳ Pendiente de pago\n\n👇 *Pagá la seña para confirmar tu turno:*\n{paymentLink}\n\n⏱️ _Tenés 15 minutos para pagar; después el turno se libera automáticamente._`;

        const message = fillTemplate(template, {
            clubName,
            clientName,
            courtName: booking.court.name,
            date: fecha,
            startTime: horaInicio,
            endTime: horaFin,
            fee: amount.toString(),
            paymentLink,
            sportEmoji,
        });

        await sendWhatsAppMessage(phone, message);
        console.log(`📩 Link de pago WhatsApp enviado a ${phone} para booking ${bookingId}`);
    } catch (error) {
        console.error(`❌ Error enviando link de pago WhatsApp para booking ${bookingId}:`, error);
    }
}

// ============================================================================
// NUEVO: NOTIFICACIÓN AUTOMÁTICA AL ADMINISTRADOR/DUEÑO
// ============================================================================
export async function sendAdminNotification(bookingId: string): Promise<void> {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                court: true,
                user: true,
            },
        });

        if (!booking) return;

        const settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });
        if (!settings?.courtPhone || !settings.notifyAdmin) return;

        const adminPhone = normalizePhoneForWhatsApp(settings.courtPhone);

        // Limites de tiempo para contar los turnos de ese día exacto
        const dateStr = booking.startTime.toISOString().split('T')[0];
        const startOfDay = new Date(`${dateStr}T00:00:00`);
        const endOfDay = new Date(`${dateStr}T23:59:59`);

        // Obtenemos todas las canchas y contamos los turnos confirmados/pendientes
        const courtsWithCounts = await prisma.court.findMany({
            include: {
                _count: {
                    select: {
                        bookings: {
                            where: {
                                startTime: { gte: startOfDay, lte: endOfDay },
                                status: { not: 'CANCELLED' }
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Construir el texto del resumen
        let countersText = "📊 *Resumen del día:*\n";
        courtsWithCounts.forEach(c => {
            countersText += `• ${c.name}: ${c._count.bookings} turnos\n`;
        });

        const clientName = booking.user?.name || 'Cliente';
        const clientPhone = booking.user?.phone || 'Sin teléfono';
        const courtName = booking.court.name;
        const fecha = formatDateStr(booking.startTime);
        const hora = formatTime(booking.startTime);

        // Armar el mensaje final
        const adminMessage = `🚨 *NUEVA RESERVA CONFIRMADA*\n\n👤 *Cliente:* ${clientName}\n📱 *Teléfono:* ${clientPhone}\n🎾 *Cancha:* ${courtName}\n📅 *Día:* ${fecha}\n⏰ *Hora:* ${hora} hs\n\n${countersText}`;

        await sendWhatsAppMessage(adminPhone, adminMessage);
        console.log(`📩 Notificación a Admin enviada a ${adminPhone} para booking ${bookingId}`);
    } catch (error) {
        console.error(`❌ Error enviando notificación al admin para booking ${bookingId}:`, error);
    }
}
