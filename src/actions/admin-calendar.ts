'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { addMinutes, format, parse, startOfDay, endOfDay, addWeeks } from 'date-fns';
import { requireAdmin } from '@/lib/admin-auth';
import { PENDING_BOOKING_TTL_MS } from '@/lib/bookings/constants';
import { publishReleasedShift } from '@/actions/released-shifts';

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

            const allBookings = await prisma.booking.findMany({
                where: {
                    courtId: court.id,
                    startTime: { gte: startOfD, lte: endOfD },
                },
                include: { user: true }
            });

            const activeBookings = allBookings.filter(b => b.status !== 'CANCELLED');
            const releasedFixedBookings = allBookings.filter(b => b.status === 'CANCELLED' && b.fixedBookingId);

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

                    // Buscar reservas normales activas que se solapen
                    const booking = activeBookings.find(b => {
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

                    // ¿Este abono fijo fue liberado específicamente para esta fecha?
                    const isFixedReleasedToday = fixed ? releasedFixedBookings.some(rb => {
                        if (rb.fixedBookingId !== fixed.id) return false;
                        const rStart = new Date(rb.startTime).getTime();
                        const rEnd = new Date(rb.endTime).getTime();
                        return slotStartTime < rEnd && slotEndTime > rStart;
                    }) : false;

                    // Buscar bloqueos que se solapen
                    const block = courtBlocks.find(cb => {
                        const cbStart = new Date(cb.startTime).getTime();
                        const cbEnd = new Date(cb.endTime).getTime();
                        return slotStartTime < cbEnd && slotEndTime > cbStart;
                    });

                    let finalStatus = 'FREE';
                    let finalBooking: any = null;
                    let isReleasedShift = false;

                    if (booking) {
                        finalStatus = booking.status;
                        finalBooking = booking;
                    } else if (fixed && !isFixedReleasedToday) {
                        finalStatus = 'FIXED';
                        finalBooking = { 
                            id: fixed.id, 
                            user: fixed.user,
                            isFixed: true,
                            fixedBookingId: fixed.id,
                            courtId: court.id,
                            courtName: court.name,
                            startTime: timeStr,
                            endTime: endTimeStr,
                            dateStr: startInfo.dateStr,
                            dayOfWeek: fixed.dayOfWeek,
                        };
                    } else if (block) {
                        finalStatus = 'BLOCKED';
                        finalBooking = { id: block.id, user: { name: block.reason || 'Bloqueo' } };
                    } else if (isFixedReleasedToday) {
                        finalStatus = 'FREE';
                        isReleasedShift = true;
                    }

                    slots.push({
                        time: timeStr,
                        endTime: endTimeStr,
                        status: finalStatus,
                        booking: finalBooking,
                        isReleased: isReleasedShift,
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

export async function cancelAdminBooking(bookingId: string, notifyReleased: boolean = true) {
    try {
        await requireAdmin();
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { court: true }
        });

        if (!booking) {
            return { success: false, error: 'Reserva no encontrada.' };
        }

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED', slotKey: null }
        });

        // Si se pide notificar y el turno es futuro, publicar aviso de turno liberado en la PWA
        if (notifyReleased && booking.court && booking.startTime > new Date()) {
            const start = new Date(booking.startTime);
            const hrs = String(start.getHours()).padStart(2, '0');
            const mins = String(start.getMinutes()).padStart(2, '0');
            const y = start.getFullYear();
            const m = String(start.getMonth() + 1).padStart(2, '0');
            const d = String(start.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            await publishReleasedShift({
                courtId: booking.courtId,
                courtName: booking.court.name,
                dateStr,
                time: `${hrs}:${mins}`,
                reason: booking.fixedBookingId ? 'Abono fijo liberado' : 'Turno liberado',
            }).catch(() => {});
        }

        revalidatePath('/admin/calendar');
        revalidatePath('/admin/history');
        revalidatePath('/admin/abonos');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Error al cancelar.' };
    }
}

export async function rescheduleAdminBooking(data: {
    bookingId: string;
    newCourtId: string;
    newDateStr: string;      // "YYYY-MM-DD"
    newStartTimeStr: string; // "HH:mm"
    newEndTimeStr?: string;  // "HH:mm"
}) {
    try {
        await requireAdmin();
        const booking = await prisma.booking.findUnique({
            where: { id: data.bookingId },
            include: { court: true, user: true }
        });

        if (!booking) {
            return { success: false, error: 'Reserva no encontrada.' };
        }

        const newCourt = await prisma.court.findUnique({ where: { id: data.newCourtId } });
        if (!newCourt) {
            return { success: false, error: 'Cancha de destino no encontrada.' };
        }

        // Horarios en zona horaria local (-03:00)
        const newStartTime = new Date(`${data.newDateStr}T${data.newStartTimeStr}:00-03:00`);
        let newEndTime: Date;

        if (data.newEndTimeStr) {
            newEndTime = new Date(`${data.newDateStr}T${data.newEndTimeStr}:00-03:00`);
            if (newEndTime <= newStartTime) {
                newEndTime.setDate(newEndTime.getDate() + 1);
            }
        } else {
            const origDuration = booking.endTime.getTime() - booking.startTime.getTime();
            newEndTime = new Date(newStartTime.getTime() + (origDuration > 0 ? origDuration : 90 * 60000));
        }

        // 1. Validar colisión con otras reservas activas en esa cancha
        const collision = await prisma.booking.findFirst({
            where: {
                id: { not: booking.id },
                courtId: data.newCourtId,
                status: { in: ['PENDING', 'CONFIRMED', 'FIXED', 'BLOCKED'] },
                startTime: { lt: newEndTime },
                endTime: { gt: newStartTime },
            }
        });

        if (collision) {
            return { success: false, error: 'El horario seleccionado ya se encuentra ocupado en esa cancha.' };
        }

        // 2. Validar colisión con bloqueos
        const block = await prisma.courtBlock.findFirst({
            where: {
                courtId: data.newCourtId,
                startTime: { lt: newEndTime },
                endTime: { gt: newStartTime },
            }
        });

        if (block) {
            return { success: false, error: 'La cancha está bloqueada en ese horario.' };
        }

        const newSlotKey = `${data.newCourtId}:${newStartTime.toISOString()}`;

        const oldStart = new Date(booking.startTime);
        const oldDateFormatted = `${String(oldStart.getDate()).padStart(2, '0')}/${String(oldStart.getMonth() + 1).padStart(2, '0')}`;
        const oldTimeFormatted = `${String(oldStart.getHours()).padStart(2, '0')}:${String(oldStart.getMinutes()).padStart(2, '0')}`;

        const [ny, nm, nd] = data.newDateStr.split('-');
        const newDateFormatted = `${nd}/${nm}`;
        const newTimeFormatted = data.newStartTimeStr;

        const audit = `[Reprogramado del ${oldDateFormatted} ${oldTimeFormatted}hs al ${newDateFormatted} ${newTimeFormatted}hs por Admin]`;
        const updatedDesc = booking.description ? `${booking.description} ${audit}` : audit;

        await prisma.booking.update({
            where: { id: booking.id },
            data: {
                courtId: data.newCourtId,
                startTime: newStartTime,
                endTime: newEndTime,
                slotKey: newSlotKey,
                description: updatedDesc,
            }
        });

        revalidatePath('/admin/calendar');
        revalidatePath('/admin/history');
        revalidatePath('/mis-turnos');
        revalidatePath('/');

        return {
            success: true,
            message: `Turno reprogramado con éxito a ${newCourt.name} para el ${newDateFormatted} a las ${newTimeFormatted} hs.`
        };
    } catch (error: any) {
        console.error('Error in rescheduleAdminBooking:', error);
        return { success: false, error: error.message || 'Error al reprogramar el turno.' };
    }
}

/**
 * Libera una o múltiples fechas de un abono fijo para que queden disponibles
 * en la app (PWA) y se anuncie como turno liberado a los socios.
 */
export async function releaseFixedBookingOccurrence(data: {
    fixedBookingId: string;
    courtId: string;
    dates: string[]; // ["YYYY-MM-DD", ...]
    startTimeStr: string; // "HH:mm"
    endTimeStr?: string;  // "HH:mm"
    notifyApp?: boolean;
    reason?: string;
}) {
    try {
        await requireAdmin();

        const fixedBooking = await prisma.fixedBooking.findUnique({
            where: { id: data.fixedBookingId },
            include: { user: true, court: true }
        });

        if (!fixedBooking) {
            return { success: false, error: 'Abono fijo no encontrado.' };
        }

        const notify = data.notifyApp !== false;
        let count = 0;

        for (const dateStr of data.dates) {
            const startTime = new Date(`${dateStr}T${data.startTimeStr}:00-03:00`);
            let endTime = data.endTimeStr 
                ? new Date(`${dateStr}T${data.endTimeStr}:00-03:00`)
                : new Date(startTime.getTime() + 90 * 60 * 1000);
            if (endTime <= startTime) {
                endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
            }

            // Buscar si ya existe una reserva materializada para ese abono y horario
            const existing = await prisma.booking.findFirst({
                where: {
                    fixedBookingId: data.fixedBookingId,
                    startTime,
                }
            });

            if (existing) {
                await prisma.booking.update({
                    where: { id: existing.id },
                    data: {
                        status: 'CANCELLED',
                        slotKey: null,
                        description: data.reason || 'Abono fijo liberado',
                    }
                });
            } else {
                await prisma.booking.create({
                    data: {
                        tenantId: fixedBooking.tenantId,
                        courtId: data.courtId,
                        userId: fixedBooking.userId,
                        startTime,
                        endTime,
                        status: 'CANCELLED',
                        slotKey: null,
                        totalAmount: 0,
                        fixedBookingId: fixedBooking.id,
                        description: data.reason || 'Abono fijo liberado',
                    }
                });
            }

            // Publicar en la PWA y enviar Push si es futuro
            if (notify && startTime > new Date()) {
                await publishReleasedShift({
                    courtId: fixedBooking.courtId,
                    courtName: fixedBooking.court.name,
                    dateStr,
                    time: data.startTimeStr,
                    endTime: data.endTimeStr,
                    reason: 'Abono fijo liberado',
                }).catch(() => {});
            }

            count++;
        }

        revalidatePath('/admin/calendar');
        revalidatePath('/admin/abonos');
        revalidatePath('/admin/history');
        revalidatePath('/');
        revalidatePath('/reservas');

        return { 
            success: true, 
            message: count === 1 
                ? 'Turno fijo liberado con éxito y publicado en la app.' 
                : `${count} turnos de la serie liberados con éxito y publicados en la app.`,
            count 
        };
    } catch (error: any) {
        console.error('Error in releaseFixedBookingOccurrence:', error);
        return { success: false, error: error.message || 'Error al liberar el turno fijo.' };
    }
}

/**
 * Revierte la liberación de un turno fijo devolviéndolo a su estado habitual.
 */
export async function unreleaseFixedBookingOccurrence(data: {
    fixedBookingId: string;
    courtId: string;
    dateStr: string;
    startTimeStr: string;
}) {
    try {
        await requireAdmin();
        const startTime = new Date(`${data.dateStr}T${data.startTimeStr}:00-03:00`);

        // Borrar el registro cancelado que marcaba la excepción
        await prisma.booking.deleteMany({
            where: {
                fixedBookingId: data.fixedBookingId,
                courtId: data.courtId,
                startTime,
                status: 'CANCELLED'
            }
        });

        revalidatePath('/admin/calendar');
        revalidatePath('/admin/abonos');
        revalidatePath('/');
        revalidatePath('/reservas');

        return { success: true, message: 'Turno restablecido al abono habitual.' };
    } catch (error: any) {
        return { success: false, error: 'Error al restablecer el turno.' };
    }
}
