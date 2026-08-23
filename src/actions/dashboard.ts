'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { PENDING_BOOKING_TTL_MS } from '@/lib/bookings/constants';

export async function getDashboardStats() {
    await requireAdmin();
    const nowART = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
    const d = new Date(nowART);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date(`${dateStr}T00:00:00-03:00`);
    const tomorrow = new Date(`${dateStr}T23:59:59.999-03:00`);

    try {
        // AUTO-CANCELAR RESERVAS PENDIENTES EXPIRADAS (>5 min)
        try {
            const cutoff = new Date(Date.now() - PENDING_BOOKING_TTL_MS);
            await prisma.booking.updateMany({
                where: { status: 'PENDING', createdAt: { lt: cutoff } },
                data: { status: 'CANCELLED', slotKey: null }
            });
        } catch(e) { console.error("Error auto-canceling pending bookings:", e); }

        const [
            todayBookingsCount,
            activeCourtsCount,
            pendingBookings,
            activeTournamentsCount
        ] = await Promise.all([
            prisma.booking.count({
                where: {
                    startTime: { gte: today, lt: tomorrow },
                    status: { notIn: ['CANCELLED', 'BLOCKED', 'FIXED'] },
                    fixedBookingId: null
                }
            }),
            prisma.court.count({
                where: { isActive: true }
            }),
            prisma.booking.aggregate({
                where: { 
                    status: 'PENDING',
                    fixedBookingId: null
                },
                _sum: { totalAmount: true }
            }),
            prisma.tournament.count({
                where: { status: 'ONGOING' }
            })
        ]);

        return {
            success: true,
            data: {
                todayBookings: todayBookingsCount,
                activeCourts: activeCourtsCount,
                pendingRevenue: pendingBookings._sum.totalAmount || 0,
                activeTournaments: activeTournamentsCount,
            }
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return { success: false, error: 'Error cargando estadísticas' };
    }
}

export async function getTodaySnapshot() {
    await requireAdmin();
    const nowART = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
    const d = new Date(nowART);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date(`${dateStr}T00:00:00-03:00`);
    const tomorrow = new Date(`${dateStr}T23:59:59.999-03:00`);

    try {
        const bookings = await prisma.booking.findMany({
            where: {
                startTime: { gte: today, lt: tomorrow },
                status: { notIn: ['CANCELLED', 'BLOCKED', 'FIXED'] },
                fixedBookingId: null
            },
            include: {
                court: true,
                user: true,
            },
            orderBy: { startTime: 'asc' }
        });

        return { success: true, data: bookings };
    } catch (error) {
        console.error('Error fetching today snapshot:', error);
        return { success: false, error: 'Error cargando la agenda del día' };
    }
}
