import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const court1Id = '417bb319-b4ff-4bea-bae7-95f6449293a9';
    const court2Id = 'b31f84ff-9aed-42cc-a2c1-5a2ce126baf8';
    const courts = [court1Id, court2Id];

    // 1. Horarios
    for (const courtId of courts) {
      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
        await prisma.businessHour.upsert({
          where: { courtId_dayOfWeek: { courtId, dayOfWeek } },
          update: { openTime: '08:00', closeTime: '23:00', slotDuration: 90 },
          create: { courtId, dayOfWeek, openTime: '08:00', closeTime: '23:00', slotDuration: 90 }
        });
      }
    }

    // Fechas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const d1 = new Date(today);
    d1.setHours(17, 0, 0, 0);
    const d1_end = new Date(d1);
    d1_end.setHours(18, 30, 0, 0);

    const d2 = new Date(today);
    d2.setHours(20, 0, 0, 0);
    const d2_end = new Date(d2);
    d2_end.setHours(21, 30, 0, 0);

    const d3 = new Date(today);
    d3.setDate(d3.getDate() + 1);
    d3.setHours(18, 30, 0, 0);
    const d3_end = new Date(d3);
    d3_end.setHours(20, 0, 0, 0);

    // Usuario
    let demoUser = await prisma.user.findFirst({ where: { email: 'juan@tpadel.com' } });
    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          email: 'juan@tpadel.com',
          name: 'Juan',
          lastName: 'Pérez',
          phone: '1122334455',
          role: 'PLAYER'
        }
      });
    }

    // 2. Turnos comunes
    await prisma.booking.create({
      data: { startTime: d1, endTime: d1_end, courtId: court1Id, userId: demoUser.id, status: 'CONFIRMED', totalAmount: 15000 }
    });
    await prisma.booking.create({
      data: { startTime: d2, endTime: d2_end, courtId: court2Id, userId: demoUser.id, status: 'PENDING', totalAmount: 15000 }
    });
    await prisma.booking.create({
      data: { startTime: d3, endTime: d3_end, courtId: court1Id, userId: demoUser.id, status: 'CONFIRMED', totalAmount: 15000 }
    });

    // 3. Bloqueos
    const b1 = new Date(today);
    b1.setHours(8, 0, 0, 0);
    const b1_end = new Date(b1);
    b1_end.setHours(9, 30, 0, 0);

    const b2 = new Date(today);
    b2.setDate(b2.getDate() + 2);
    b2.setHours(9, 30, 0, 0);
    const b2_end = new Date(b2);
    b2_end.setHours(11, 0, 0, 0);

    await prisma.courtBlock.create({
      data: { startTime: b1, endTime: b1_end, courtId: court1Id, reason: 'Mantenimiento' }
    });
    await prisma.courtBlock.create({
      data: { startTime: b2, endTime: b2_end, courtId: court2Id, reason: 'Clase particular' }
    });

    // 4. Fijos
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 6); // 6 meses

    await prisma.fixedBooking.create({
      data: { dayOfWeek: 2, startTime: '18:30', endTime: '20:00', startDate, endDate, courtId: court2Id, userId: demoUser.id, isActive: true }
    });
    await prisma.fixedBooking.create({
      data: { dayOfWeek: 4, startTime: '21:30', endTime: '23:00', startDate, endDate, courtId: court1Id, userId: demoUser.id, isActive: true }
    });

    return NextResponse.json({ success: true, message: 'Seeded correctly' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
