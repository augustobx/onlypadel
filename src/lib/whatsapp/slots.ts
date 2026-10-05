// src/lib/whatsapp/slots.ts
// Motor de cálculo de disponibilidad para WhatsApp.
// Cruza BusinessHour + Booking + FixedBooking + CourtBlock para generar slots libres.

import { prisma } from '@/lib/prisma';

export interface AvailableSlot {
    time: string;   // "HH:mm" inicio
    endTime: string; // "HH:mm" fin
    label: string;   // "14:30 - 16:00" para mostrar al usuario
}

// ============================================================================
// Obtener slots disponibles para una cancha en una fecha
// ============================================================================
export async function getAvailableSlotsForDate(
    courtId: string,
    dateStr: string // "YYYY-MM-DD"
): Promise<AvailableSlot[]> {
    const targetDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = targetDate.getDay();

    // 1. Buscar horario de negocio para ese día
    const businessHour = await prisma.businessHour.findFirst({
        where: { courtId, dayOfWeek },
    });

    if (!businessHour) return []; // La cancha no abre este día

    // 2. Buscar reservas existentes (PENDING, CONFIRMED, FIXED)
    const startOfDay = new Date(`${dateStr}T00:00:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999`);

    const existingBookings = await prisma.booking.findMany({
        where: {
            courtId,
            startTime: { gte: startOfDay, lte: endOfDay },
            status: { in: ['PENDING', 'CONFIRMED', 'FIXED', 'CANCELLED'] },
        },
    });

    // 3. Buscar abonos fijos activos para este día de la semana
    const fixedBookings = await prisma.fixedBooking.findMany({
        where: {
            courtId,
            dayOfWeek,
            isActive: true,
            startDate: { lte: endOfDay },
            endDate: { gte: startOfDay },
        },
    });

    // 4. Buscar bloqueos de cancha vigentes
    const courtBlocks = await prisma.courtBlock.findMany({
        where: {
            courtId,
            startTime: { lte: endOfDay },
            endTime: { gte: startOfDay },
        },
    });

    // 5. Generar la grilla de slots
    const [openHour, openMin] = businessHour.openTime.split(':').map(Number);
    const [closeHour, closeMin] = businessHour.closeTime.split(':').map(Number);
    const duration = businessHour.slotDuration; // minutos

    let currentMinutes = openHour * 60 + openMin;
    const endMinutes = closeHour * 60 + closeMin;
    const now = new Date();

    const availableSlots: AvailableSlot[] = [];

    while (currentMinutes + duration <= endMinutes) {
        const slotStartHour = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        const slotStartMin = (currentMinutes % 60).toString().padStart(2, '0');
        const slotStartStr = `${slotStartHour}:${slotStartMin}`;

        const slotEndMinutes = currentMinutes + duration;
        const slotEndHour = Math.floor(slotEndMinutes / 60).toString().padStart(2, '0');
        const slotEndMin = (slotEndMinutes % 60).toString().padStart(2, '0');
        const slotEndStr = `${slotEndHour}:${slotEndMin}`;

        const slotStartTime = new Date(`${dateStr}T${slotStartStr}:00`);
        const slotEndTime = new Date(`${dateStr}T${slotEndStr}:00`);

        // ¿El slot ya pasó?
        if (slotStartTime <= now) {
            currentMinutes += duration;
            continue;
        }

        // ¿Tiene una reserva activa que se solapa?
        const isBookingOccupied = existingBookings.some(b => {
            if (b.status === 'CANCELLED') return false;
            const bStart = new Date(b.startTime).getTime();
            const bEnd = new Date(b.endTime).getTime();
            return slotStartTime.getTime() < bEnd && slotEndTime.getTime() > bStart;
        });

        if (isBookingOccupied) {
            currentMinutes += duration;
            continue;
        }

        // ¿Este slot corresponde a un abono fijo liberado para esta fecha?
        const isFixedReleasedToday = existingBookings.some(b => {
            if (b.status !== 'CANCELLED' || !b.fixedBookingId) return false;
            const bStart = new Date(b.startTime).getTime();
            const bEnd = new Date(b.endTime).getTime();
            return slotStartTime.getTime() < bEnd && slotEndTime.getTime() > bStart;
        });

        // ¿Tiene un abono fijo que se solapa (y no está liberado)?
        if (!isFixedReleasedToday) {
            const isFixedOccupied = fixedBookings.some(fb => {
                const [fbStartH, fbStartM] = fb.startTime.split(':').map(Number);
                const [fbEndH, fbEndM] = fb.endTime.split(':').map(Number);
                const fbStartMin = fbStartH * 60 + fbStartM;
                const fbEndMin = fbEndH * 60 + fbEndM;
                return currentMinutes < fbEndMin && slotEndMinutes > fbStartMin;
            });

            if (isFixedOccupied) {
                currentMinutes += duration;
                continue;
            }
        }

        // ¿Tiene un bloqueo de cancha que se solapa?
        const isBlocked = courtBlocks.some(block => {
            const blockStart = new Date(block.startTime).getTime();
            const blockEnd = new Date(block.endTime).getTime();
            return slotStartTime.getTime() < blockEnd && slotEndTime.getTime() > blockStart;
        });

        if (isBlocked) {
            currentMinutes += duration;
            continue;
        }

        // ✅ Slot disponible
        availableSlots.push({
            time: slotStartStr,
            endTime: slotEndStr,
            label: `${slotStartStr} - ${slotEndStr}`,
        });

        currentMinutes += duration;
    }

    return availableSlots;
}
