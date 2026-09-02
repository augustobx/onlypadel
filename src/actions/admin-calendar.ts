'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { addMinutes, format, parse, startOfDay, endOfDay, addWeeks } from 'date-fns';
import { requireAdmin } from '@/lib/admin-auth';
import { PENDING_BOOKING_TTL_MS } from '@/lib/bookings/constants';

export async function getAdminCalendarData(courtId: string, dateStr: string) {
    try {
        await requireAdmin();
        // AUTO-CANCELAR RESERVAS PENDIENTES EXPIRADAS (>5 min)
        try {
            const cutoff = new Date(Date.now() - PENDING_BOOKING_TTL_MS);
            await prisma.booking.updateMany({
                where: { status: 'PENDING', createdAt: { lt: cutoff } },
                data: { status: 'CANCELLED', slotKey: null }
            });
        } catch(e) { console.error("Error auto-canceling pending bookings:", e); }

        const [year, month, day] = dateStr.split('-').map(Number);
        const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

        // 1. Determinar qué canchas buscar
        const courtsQuery = courtId === 'ALL' ? { isActive: true } : { id: courtId };
        const courts = await prisma.court.findMany({
            where: courtsQuery,
            orderBy: { name: 'asc' }
        });

        const results = [];

        // 2. Por cada cancha, generamos su línea de tiempo de slots
        for (const court of courts) {
            const businessHour = await prisma.businessHour.findFirst({ where: { courtId: court.id, dayOfWeek } });

            const startOfD = new Date(`${dateStr}T00:00:00-03:00`);
            const endOfD = new Date(`${dateStr}T23:59:59.999-03:00`);
            endOfD.setDate(endOfD.getDate() + 1); // Allow slots crossing midnight up to the next day

            const bookings = await prisma.booking.findMany({
                where: {
                    courtId: court.id,
                    startTime: { gte: startOfD, lte: endOfD },
                    status: { not: 'CANCELLED' }
                },
                include: { user: true }
            });

            const fixedBookings = await prisma.fixedBooking.findMany({
                where: {
                    courtId: court.id,
                    dayOfWeek,
                    isActive: true,
                    startDate: { lte: endOfD },
                    endDate: { gte: startOfD },
                },
                include: { user: true }
            });

            const courtBlocks = await prisma.courtBlock.findMany({
                where: {
                    courtId: court.id,
                    startTime: { lte: endOfD },
                    endTime: { gte: startOfD },
                },
            });

            const slots = [];
            if (businessHour) {
                const [openHour, openMin] = businessHour.openTime.split(':').map(Number);
                const [closeHour, closeMin] = businessHour.closeTime.split(':').map(Number);
                let currentMinutes = openHour * 60 + openMin;
                let endMinutes = closeHour * 60 + closeMin;
                if (endMinutes <= currentMinutes) {
                    endMinutes += 24 * 60;
                }
                const duration = businessHour.slotDuration;

                while (currentMinutes + duration <= endMinutes) {
                    const formatTimeAndDate = (minsTotal: number, baseDateStr: string) => {
                        const daysToAdd = Math.floor(minsTotal / (24 * 60));
                        const minsInDay = minsTotal % (24 * 60);
                        const h = Math.floor(minsInDay / 60).toString().padStart(2, '0');
                        const m = (minsInDay % 60).toString().padStart(2, '0');
                        
                        let finalDateStr = baseDateStr;
                        if (daysToAdd > 0) {
                           const d = new Date(`${baseDateStr}T00:00:00-03:00`);
                           d.setDate(d.getDate() + daysToAdd);
                           finalDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        }
                        return { timeStr: `${h}:${m}`, dateStr: finalDateStr };
                    };

                    const startInfo = formatTimeAndDate(currentMinutes, dateStr);
                    const endInfo = formatTimeAndDate(currentMinutes + duration, dateStr);

                    const timeStr = startInfo.timeStr;
                    const endTimeStr = endInfo.timeStr;

                    const slotStartTime = new Date(`${startInfo.dateStr}T${startInfo.timeStr}:00-03:00`).getTime();
                    const slotEndTime = new Date(`${endInfo.dateStr}T${endInfo.timeStr}:00-03:00`).getTime();

                    // Buscar reservas normales que se solapen
                    const booking = bookings.find(b => {
                        const bStart = new Date(b.startTime).getTime();
                        const bEnd = new Date(b.endTime).getTime();
                        return slotStartTime < bEnd && slotEndTime > bStart;
                    });

                    // Buscar abonos fijos que se solapen
                    const slotEndMins = currentMinutes + duration;
                    const fixed = fixedBookings.find(fb => {
                        const [fbStartH, fbStartM] = fb.startTime.split(':').map(Number);
                        const [fbEndH, fbEndM] = fb.endTime.split(':').map(Number);
                        const fbStartMin = fbStartH * 60 + fbStartM;
                        let fbEndMin = fbEndH * 60 + fbEndM;
                        if (fbEndMin <= fbStartMin) fbEndMin += 24 * 60; // Handle fixed booking midnight cross too
                        return currentMinutes < fbEndMin && slotEndMins > fbStartMin;
                    });

                    // Buscar bloqueos que se solapen
                    const block = courtBlocks.find(cb => {
                        const cbStart = new Date(cb.startTime).getTime();
                        const cbEnd = new Date(cb.endTime).getTime();
                        return slotStartTime < cbEnd && slotEndTime > cbStart;
                    });

                    let finalStatus = 'FREE';
                    let finalBooking = null;

                    if (booking) {
                        finalStatus = booking.status;
                        finalBooking = booking;
                    } else if (fixed) {
                        finalStatus = 'FIXED';
                        finalBooking = { id: fixed.id, user: fixed.user };
                    } else if (block) {
                        finalStatus = 'BLOCKED';
                        finalBooking = { id: block.id, user: { name: block.reason || 'Bloqueo' } };
                    }

                    slots.push({
                        time: timeStr,
                        endTime: endTimeStr,
                        status: finalStatus,
                        booking: finalBooking,
                    });

                    currentMinutes += duration;
                }
            }

            results.push({ court, businessHour, slots });
        }

        return { success: true, data: results };
    } catch (error) {
        console.error("Error fetching admin calendar data:", error);
        return { success: false, error: 'Error al cargar el calendario.' };
    }
}

// Obtener datos de la semana completa (7 días) para vista semanal interactiva
export async function getAdminCalendarWeekData(courtId: string, weekStartStr: string) {
    try {
        await requireAdmin();
        const [year, month, day] = weekStartStr.split('-').map(Number);
        const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

        const daysResult = [];
        for (let i = 0; i < 7; i++) {
            const currentD = new Date(baseDate);
            currentD.setUTCDate(baseDate.getUTCDate() + i);
            const dateStr = currentD.toISOString().split('T')[0];
            const dayData = await getAdminCalendarData(courtId, dateStr);
            daysResult.push({
                dateStr,
                dayIndex: i,
                dayData: dayData.success && dayData.data ? dayData.data : []
            });
        }

        return { success: true, data: daysResult };
    } catch (error) {
        console.error("Error fetching week calendar data:", error);
        return { success: false, error: 'Error al cargar la semana.' };
    }
}

// Crear reserva administrativa (Simple, Bloqueo o Fijo)
export async function createAdminBooking(data: {
    courtId: string;
    dateStr: string;
    startTimeStr: string;
    endTimeStr: string;
    type: 'RESERVA' | 'BLOQUEO' | 'FIJO';
    clientName?: string;
    clientPhone?: string;
    paymentMethod?: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'PENDING';
    amountPaid?: number;
    notes?: string;
}) {
    try {
        await requireAdmin();
        const baseStartTime = new Date(`${data.dateStr}T${data.startTimeStr}:00-03:00`);
        const baseEndTime = new Date(`${data.dateStr}T${data.endTimeStr}:00-03:00`);
        if (baseEndTime <= baseStartTime) {
            baseEndTime.setDate(baseEndTime.getDate() + 1);
        }
        const status = data.type === 'BLOQUEO' ? 'BLOCKED' : data.type === 'FIJO' ? 'FIXED' : 'CONFIRMED';

        // Obtenemos la cancha para asegurar el tenantId
        const court = await prisma.court.findUnique({ where: { id: data.courtId } });
        if (!court) {
            return { success: false, error: 'Cancha no encontrada.' };
        }
        const tenantId = court.tenantId;

        // Creamos o buscamos el usuario local para asociar la reserva
        let user = await prisma.user.findFirst({ where: { tenantId, phone: data.clientPhone || 'ADMIN_LOCAL' } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    tenantId,
                    name: data.clientName || (data.type === 'BLOQUEO' ? 'Cancha Bloqueada' : 'Turno Local'),
                    phone: data.clientPhone || 'ADMIN_LOCAL',
                    email: `${Date.now()}@local.onlypadel`,
                    role: 'PLAYER'
                }
            });
        } else if (data.clientName) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { name: data.clientName }
            });
        }

        // Si es FIJO, generamos por 6 meses (24 semanas). Si es normal, solo 1 semana.
        const weeksToGenerate = data.type === 'FIJO' ? 24 : 1;
        const formattedDesc = data.paymentMethod 
            ? `[${data.paymentMethod}] ${data.notes || 'Mostrador'}`.trim() 
            : (data.notes || null);

        let newFixedBookingId: string | null = null;
        if (data.type === 'FIJO') {
            const [year, month, day] = data.dateStr.split('-').map(Number);
            const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

            const fb = await prisma.fixedBooking.create({
                data: {
                    tenantId,
                    courtId: data.courtId,
                    userId: user!.id,
                    dayOfWeek,
                    startTime: data.startTimeStr,
                    endTime: data.endTimeStr,
                    startDate: baseStartTime,
                    endDate: addWeeks(baseStartTime, weeksToGenerate - 1),
                    isActive: true
                }
            });
            newFixedBookingId = fb.id;
        }

        try {
            for (let i = 0; i < weeksToGenerate; i++) {
                const startTime = addWeeks(baseStartTime, i);
                const endTime = addWeeks(baseEndTime, i);

                const existing = await prisma.booking.findFirst({
                    where: {
                        courtId: data.courtId,
                        status: { in: ['PENDING', 'CONFIRMED', 'FIXED', 'BLOCKED'] },
                        startTime: { lt: endTime },
                        endTime: { gt: startTime },
                    }
                });

                // Si está libre, lo creamos
                if (!existing) {
                    await prisma.booking.create({
                        data: {
                            tenantId,
                            courtId: data.courtId,
                            userId: user!.id,
                            startTime,
                            endTime,
                            status: status as any,
                            totalAmount: data.amountPaid || 0,
                            description: formattedDesc,
                            fixedBookingId: newFixedBookingId,
                            slotKey: `${data.courtId}:${startTime.toISOString()}`,
                        }
                    });

                } else if (data.type !== 'FIJO') {
                    // Si es una reserva simple/bloqueo y está ocupado, tira error
                    throw new Error('SLOT_TAKEN');
                }
                // (Si es FIJO y está ocupado, simplemente ignora esa semana puntual y sigue con las demás)
            }
        } catch (bookingError) {
            // Si falló y habíamos creado un fixedBooking, revertimos
            if (newFixedBookingId) {
                await prisma.fixedBooking.delete({ where: { id: newFixedBookingId } }).catch(() => {});
            }
            throw bookingError;
        }

        revalidatePath('/admin/calendar');
        revalidatePath('/admin/abonos');
        return { success: true };
    } catch (error: any) {
        console.error("Error in createAdminBooking:", error);
        return { success: false, error: error.message === 'SLOT_TAKEN' ? 'Horario superpuesto.' : (error.message || 'Error al guardar.') };
    }
}

export async function cancelAdminBooking(bookingId: string) {
    try {
        await requireAdmin();
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED', slotKey: null }
        });
        revalidatePath('/admin/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Error al cancelar.' };
    }
}
