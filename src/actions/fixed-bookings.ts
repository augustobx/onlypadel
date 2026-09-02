'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { addWeeks } from 'date-fns';
import { requireAdmin } from '@/lib/admin-auth';

export async function getFixedBookings() {
    try {
        await requireAdmin();
        const fixedBookings = await prisma.fixedBooking.findMany({
            include: {
                user: true,
                court: true,
                _count: {
                    select: { bookings: { where: { status: { not: 'CANCELLED' } } } }
                }
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        return { success: true, data: fixedBookings };
    } catch (error: any) {
        return { success: false, error: 'Error al obtener los abonos fijos.' };
    }
}

export async function deleteFixedBooking(id: string) {
    try {
        await requireAdmin();
        await prisma.$transaction(async (tx) => {
            // Delete or mark inactive the fixed booking
            await tx.fixedBooking.update({
                where: { id },
                data: { isActive: false }
            });

            // Cancel all future bookings related to this fixed booking
            const now = new Date();
            await tx.booking.updateMany({
                where: {
                    fixedBookingId: id,
                    startTime: { gte: now }
                },
                data: {
                    status: 'CANCELLED',
                    slotKey: null,
                }
            });
        });

        revalidatePath('/admin/abonos');
        revalidatePath('/admin/calendar');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Error al eliminar el abono.' };
    }
}

export async function updateFixedBooking(id: string, data: {
    courtId: string;
    dayOfWeek: number;
    startTimeStr: string;
    endTimeStr: string;
    clientName: string;
    clientPhone: string;
}) {
    try {
        await requireAdmin();
        await prisma.$transaction(async (tx) => {
            const fb = await tx.fixedBooking.findUnique({ where: { id }, include: { user: true } });
            if (!fb) throw new Error("Abono no encontrado");

            // Update user details
            await tx.user.update({
                where: { id: fb.userId },
                data: {
                    name: data.clientName,
                    phone: data.clientPhone
                }
            });

            const now = new Date();
            const todayDay = now.getDay();
            let diffDays = data.dayOfWeek - todayDay;
            if (diffDays < 0) diffDays += 7;
            
            const baseStartDateObj = new Date();
            baseStartDateObj.setDate(baseStartDateObj.getDate() + diffDays);
            const dateStr = `${baseStartDateObj.getFullYear()}-${String(baseStartDateObj.getMonth() + 1).padStart(2, '0')}-${String(baseStartDateObj.getDate()).padStart(2, '0')}`;
            
            const baseStartTime = new Date(`${dateStr}T${data.startTimeStr}:00-03:00`);
            const baseEndTime = new Date(`${dateStr}T${data.endTimeStr}:00-03:00`);
            if (baseEndTime <= baseStartTime) {
                baseEndTime.setDate(baseEndTime.getDate() + 1);
            }

            // Update FixedBooking
            await tx.fixedBooking.update({
                where: { id },
                data: {
                    courtId: data.courtId,
                    dayOfWeek: data.dayOfWeek,
                    startTime: data.startTimeStr,
                    endTime: data.endTimeStr,
                }
            });

            // Cancel existing future bookings
            await tx.booking.updateMany({
                where: {
                    fixedBookingId: id,
                    startTime: { gte: now }
                },
                data: { status: 'CANCELLED', slotKey: null }
            });

            // Re-generate future bookings until original endDate
            for (let i = 0; i < 24; i++) {
                const startTime = addWeeks(baseStartTime, i);
                const endTime = addWeeks(baseEndTime, i);

                if (startTime > fb.endDate) break;

                const existing = await tx.booking.findFirst({
                    where: {
                        courtId: data.courtId,
                        status: { in: ['PENDING', 'CONFIRMED', 'FIXED', 'BLOCKED'] },
                        startTime: { lt: endTime },
                        endTime: { gt: startTime },
                    }
                });

                if (!existing) {
                    await tx.booking.create({
                        data: {
                            tenantId: fb.tenantId,
                            courtId: data.courtId,
                            userId: fb.userId,
                            startTime,
                            endTime,
                            status: 'FIXED',
                            totalAmount: 0,
                            fixedBookingId: id,
                            slotKey: `${data.courtId}:${startTime.toISOString()}`,
                        }
                    });
                }
            }
        });

        revalidatePath('/admin/abonos');
        revalidatePath('/admin/calendar');
        return { success: true };
    } catch (error: any) {
        console.error(error);
        return { success: false, error: error.message || 'Error al actualizar el abono.' };
    }
}
