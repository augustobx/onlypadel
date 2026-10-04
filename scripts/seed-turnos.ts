import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = (process.env.DATABASE_URL || '').replace('mysql://', 'mariadb://');
if (!connectionString) {
  console.error('DATABASE_URL no está configurada.');
  process.exit(1);
}

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

const PREFIX = 'seed-turnos-';
const DEFAULT_PASSWORD = 'Padel123!';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const todayStr = formatter.format(new Date());

function getLocalDate(offsetDays: number): string {
  const d = new Date(`${todayStr}T12:00:00-03:00`);
  d.setDate(d.getDate() + offsetDays);
  return formatter.format(d);
}

function makeDateTime(offsetDays: number, timeStr: string): Date {
  const day = getLocalDate(offsetDays);
  return new Date(`${day}T${timeStr}:00-03:00`);
}

function getDayOfWeek(offsetDays: number): number {
  const day = getLocalDate(offsetDays);
  return new Date(`${day}T12:00:00-03:00`).getDay(); // 0: Domingo, 1: Lunes, etc.
}

async function runSeed() {
  console.log('🚀 Iniciando Seed Completa de Turnos y Usuarios...');
  console.log(`📅 Fecha base (hoy en Argentina): ${todayStr}`);

  const targetSlug = process.argv[2]?.trim().toLowerCase() || 'testing';
  console.log(`🎯 Objetivo: Tenant "${targetSlug}"`);

  // 1. Obtener tenant según slug o todos si es 'all'
  const whereClause = targetSlug === 'all' ? { status: 'ACTIVE' } : { slug: targetSlug };
  const tenants = await prisma.tenant.findMany({
    where: whereClause as any,
  });

  if (tenants.length === 0) {
    console.error(`❌ No se encontró ningún tenant con slug "${targetSlug}".`);
    return;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const playersData = [
    { name: 'Lucas', lastName: 'Martínez', dni: '38100101', phone: '1140010001', category: '4ta', email: 'lucas.martinez@padel.test' },
    { name: 'Valentina', lastName: 'Díaz', dni: '39200202', phone: '1140010002', category: '5ta', email: 'valen.diaz@padel.test' },
    { name: 'Martín', lastName: 'Gómez', dni: '40300303', phone: '1140010003', category: '6ta', email: 'martin.gomez@padel.test' },
    { name: 'Camila', lastName: 'Rodríguez', dni: '41400404', phone: '1140010004', category: '7ma', email: 'camila.rodriguez@padel.test' },
    { name: 'Nicolás', lastName: 'Sánchez', dni: '42500505', phone: '1140010005', category: '5ta', email: 'nico.sanchez@padel.test' },
    { name: 'Florencia', lastName: 'Romero', dni: '43600606', phone: '1140010006', category: '6ta', email: 'flor.romero@padel.test' },
    { name: 'Joaquín', lastName: 'Álvarez', dni: '44700707', phone: '1140010007', category: '4ta', email: 'joaquin.alvarez@padel.test' },
    { name: 'Sofía', lastName: 'Torres', dni: '45800808', phone: '1140010008', category: '5ta', email: 'sofia.torres@padel.test' },
  ];

  for (const tenant of tenants) {
    console.log(`\n🏢 Configurando datos para el Club / Tenant: "${tenant.name}" (${tenant.slug})...`);

    // Limpiar seeds anteriores de este tenant
    await prisma.booking.deleteMany({
      where: { tenantId: tenant.id, id: { startsWith: PREFIX } },
    });
    await prisma.fixedBooking.deleteMany({
      where: { tenantId: tenant.id, id: { startsWith: PREFIX } },
    });
    await prisma.courtBlock.deleteMany({
      where: { id: { startsWith: `${PREFIX}${tenant.slug}-` } },
    });

    // Obtener canchas del tenant
    const courts = await prisma.court.findMany({
      where: { tenantId: tenant.id, isActive: true },
    });

    if (courts.length === 0) {
      console.warn(`⚠️ El tenant "${tenant.name}" no tiene canchas activas. Saltando reservas.`);
      continue;
    }

    const court1 = courts[0];
    const court2 = courts[1] || courts[0];

    // Crear o asegurar usuarios para este tenant
    const createdUsers: any[] = [];
    for (const p of playersData) {
      const email = `${p.email.replace('@padel.test', '')}@${tenant.slug}.test`;
      const user = await prisma.user.upsert({
        where: {
          id: `${PREFIX}${tenant.slug}-${p.dni}`,
        },
        update: {
          name: p.name,
          lastName: p.lastName,
          phone: p.phone,
          dni: p.dni,
          category: p.category,
          password: hashedPassword,
          role: 'PLAYER',
          isActive: true,
          tenantId: tenant.id,
        },
        create: {
          id: `${PREFIX}${tenant.slug}-${p.dni}`,
          email,
          name: p.name,
          lastName: p.lastName,
          phone: p.phone,
          dni: p.dni,
          category: p.category,
          password: hashedPassword,
          role: 'PLAYER',
          isActive: true,
          tenantId: tenant.id,
        },
      });
      createdUsers.push(user);
    }
    console.log(`  ✅ ${createdUsers.length} Jugadores creados / verificados (clave para todos: "${DEFAULT_PASSWORD}")`);

    // 2. TURNOS COMUNES (Para Hoy, Mañana, Pasado y Ayer)
    const bookingsToCreate = [
      // HOY
      {
        id: `${PREFIX}${tenant.slug}-today-confirmed-1`,
        courtId: court1.id,
        userId: createdUsers[0].id,
        offset: 0,
        start: '09:00',
        end: '10:30',
        status: 'CONFIRMED' as const,
        amount: 20000,
        description: 'Turno Mañana Confirmado',
      },
      {
        id: `${PREFIX}${tenant.slug}-today-pending-1`,
        courtId: court1.id,
        userId: createdUsers[1].id,
        offset: 0,
        start: '14:00',
        end: '15:30',
        status: 'PENDING' as const,
        amount: 20000,
        description: 'Turno Tarde Pendiente Seña',
      },
      {
        id: `${PREFIX}${tenant.slug}-today-confirmed-2`,
        courtId: court2.id,
        userId: createdUsers[2].id,
        offset: 0,
        start: '18:00',
        end: '19:30',
        status: 'CONFIRMED' as const,
        amount: 22000,
        description: 'Turno Noche Confirmado',
      },
      {
        id: `${PREFIX}${tenant.slug}-today-cancelled-1`,
        courtId: court1.id,
        userId: createdUsers[3].id,
        offset: 0,
        start: '21:00',
        end: '22:30',
        status: 'CANCELLED' as const,
        amount: 22000,
        description: 'Turno Cancelado Jugador',
      },

      // MAÑANA
      {
        id: `${PREFIX}${tenant.slug}-tomorrow-confirmed-1`,
        courtId: court2.id,
        userId: createdUsers[4].id,
        offset: 1,
        start: '10:30',
        end: '12:00',
        status: 'CONFIRMED' as const,
        amount: 20000,
        description: 'Turno Mañana Confirmado',
      },
      {
        id: `${PREFIX}${tenant.slug}-tomorrow-pending-1`,
        courtId: court1.id,
        userId: createdUsers[5].id,
        offset: 1,
        start: '16:30',
        end: '18:00',
        status: 'PENDING' as const,
        amount: 20000,
        description: 'Turno Tarde Pendiente',
      },
      {
        id: `${PREFIX}${tenant.slug}-tomorrow-confirmed-2`,
        courtId: court1.id,
        userId: createdUsers[6].id,
        offset: 1,
        start: '19:30',
        end: '21:00',
        status: 'CONFIRMED' as const,
        amount: 24000,
        description: 'Turno Central Estelar',
      },

      // PASADO MAÑANA
      {
        id: `${PREFIX}${tenant.slug}-dayafter-confirmed-1`,
        courtId: court1.id,
        userId: createdUsers[7].id,
        offset: 2,
        start: '18:00',
        end: '19:30',
        status: 'CONFIRMED' as const,
        amount: 22000,
        description: 'Turno Tarde Confirmado',
      },
      {
        id: `${PREFIX}${tenant.slug}-dayafter-confirmed-2`,
        courtId: court2.id,
        userId: createdUsers[0].id,
        offset: 2,
        start: '20:00',
        end: '21:30',
        status: 'CONFIRMED' as const,
        amount: 22000,
        description: 'Turno Noche Confirmado',
      },

      // AYER (Historial)
      {
        id: `${PREFIX}${tenant.slug}-yesterday-confirmed`,
        courtId: court1.id,
        userId: createdUsers[1].id,
        offset: -1,
        start: '19:00',
        end: '20:30',
        status: 'CONFIRMED' as const,
        amount: 20000,
        description: 'Turno Histórico Jugado',
      },
    ];

    for (const b of bookingsToCreate) {
      const startTime = makeDateTime(b.offset, b.start);
      const endTime = makeDateTime(b.offset, b.end);
      await prisma.booking.create({
        data: {
          id: b.id,
          courtId: b.courtId,
          userId: b.userId,
          startTime,
          endTime,
          status: b.status,
          totalAmount: b.amount,
          description: b.description,
          tenantId: tenant.id,
          slotKey: b.status === 'CANCELLED' ? null : `${b.courtId}:${startTime.toISOString()}`,
        },
      });
    }
    console.log(`  ✅ ${bookingsToCreate.length} Turnos comunes creados (Confirmados, Pendientes y Cancelados)`);

    // 3. TURNOS FIJOS (Semanales)
    const fixedList = [
      {
        id: `${PREFIX}${tenant.slug}-fixed-1`,
        courtId: court1.id,
        userId: createdUsers[0].id,
        offset: 0, // Día de la semana de hoy
        start: '19:30',
        end: '21:00',
        isActive: true,
      },
      {
        id: `${PREFIX}${tenant.slug}-fixed-2`,
        courtId: court2.id,
        userId: createdUsers[2].id,
        offset: 1, // Día de la semana de mañana
        start: '21:00',
        end: '22:30',
        isActive: true,
      },
      {
        id: `${PREFIX}${tenant.slug}-fixed-3`,
        courtId: court1.id,
        userId: createdUsers[4].id,
        offset: 3,
        start: '18:00',
        end: '19:30',
        isActive: true,
      },
      {
        id: `${PREFIX}${tenant.slug}-fixed-paused`,
        courtId: court2.id,
        userId: createdUsers[5].id,
        offset: 4,
        start: '10:00',
        end: '11:30',
        isActive: false, // Pausado
      },
    ];

    for (const f of fixedList) {
      const dow = getDayOfWeek(f.offset);
      const fixedRecord = await prisma.fixedBooking.create({
        data: {
          id: f.id,
          courtId: f.courtId,
          userId: f.userId,
          dayOfWeek: dow,
          startTime: f.start,
          endTime: f.end,
          startDate: makeDateTime(-30, '00:00'),
          endDate: makeDateTime(180, '23:59'),
          isActive: f.isActive,
          tenantId: tenant.id,
        },
      });

      // Crear ocurrencia fija materializada si está activo
      if (f.isActive) {
        const occStart = makeDateTime(f.offset, f.start);
        const occEnd = makeDateTime(f.offset, f.end);
        await prisma.booking.create({
          data: {
            id: `${PREFIX}${tenant.slug}-occ-${f.id.split('-').pop()}`,
            courtId: f.courtId,
            userId: f.userId,
            fixedBookingId: fixedRecord.id,
            startTime: occStart,
            endTime: occEnd,
            status: 'FIXED',
            totalAmount: 22000,
            description: `Turno fijo semanal (${f.start} hs)`,
            tenantId: tenant.id,
            slotKey: `${f.courtId}:${occStart.toISOString()}`,
          },
        });
      }
    }
    console.log(`  ✅ ${fixedList.length} Turnos fijos creados (con ocurrencias semanales y estado activo/pausado)`);

    // 4. BLOQUEOS DE CANCHA (Mantenimiento, Clases, Eventos)
    const blocksToCreate = [
      {
        id: `${PREFIX}${tenant.slug}-block-mantenimiento`,
        courtId: court2.id,
        offset: 0,
        start: '15:30',
        end: '17:00',
        reason: '🔧 Mantenimiento / Reparación de luces LED',
      },
      {
        id: `${PREFIX}${tenant.slug}-block-escuela`,
        courtId: court1.id,
        offset: 1,
        start: '08:30',
        end: '10:00',
        reason: '🎾 Escuela de Menores (Prof. Juan)',
      },
      {
        id: `${PREFIX}${tenant.slug}-block-clinica`,
        courtId: court2.id,
        offset: 2,
        start: '14:00',
        end: '16:00',
        reason: '🏆 Clínica de Entrenamiento Avanzado',
      },
    ];

    for (const blk of blocksToCreate) {
      await prisma.courtBlock.create({
        data: {
          id: blk.id,
          courtId: blk.courtId,
          startTime: makeDateTime(blk.offset, blk.start),
          endTime: makeDateTime(blk.offset, blk.end),
          reason: blk.reason,
        },
      });
    }
    console.log(`  ✅ ${blocksToCreate.length} Bloqueos de cancha creados (Mantenimiento, Escuela y Clínica)`);

    // 5. TURNO LIBERADO ACTIVO PARA PROBAR EL AVISO EN LA PWA
    const releasedSetting = await prisma.setting.findFirst({
      where: { key: 'active_released_shifts' },
    });

    const sampleReleasedShift = {
      id: `rel_${Date.now()}_test`,
      courtId: court1.id,
      courtName: court1.name,
      dateStr: getLocalDate(1), // Mañana
      time: '18:00',
      timeStr: '18:00',
      endTime: '19:30',
      releasedAt: new Date().toISOString(),
      reason: 'Turno liberado por socio habitual',
    };

    let currentReleased = [];
    if (releasedSetting?.value) {
      try {
        currentReleased = JSON.parse(releasedSetting.value);
      } catch {}
    }
    // Filtrar si ya existía uno igual y poner el nuevo primero
    currentReleased = currentReleased.filter((s: any) => s.courtId !== court1.id || s.dateStr !== sampleReleasedShift.dateStr || s.time !== '18:00');
    currentReleased.unshift(sampleReleasedShift);

    await prisma.setting.upsert({
      where: { key: 'active_released_shifts' },
      update: { value: JSON.stringify(currentReleased.slice(0, 5)) },
      create: { key: 'active_released_shifts', value: JSON.stringify([sampleReleasedShift]) },
    });
    console.log(`  ⚡ Turno liberado publicado para mañana a las 18:00 hs en ${court1.name} (¡probá el banner en la PWA!)`);
  }

  console.log('\n============================================================');
  console.log('🎉 SEED COMPLETADA CON ÉXITO');
  console.log('============================================================');
  console.log('Credenciales de jugadores de prueba creados:');
  console.log('  • Contraseña única: Padel123!');
  console.log('  • Emails de ejemplo:');
  console.log('     - lucas.martinez@padel.test (DNI: 38100101, Tel: 1140010001)');
  console.log('     - valen.diaz@padel.test     (DNI: 39200202, Tel: 1140010002)');
  console.log('     - martin.gomez@padel.test   (DNI: 40300303, Tel: 1140010003)');
  console.log('============================================================\n');
}

runSeed()
  .catch((err) => {
    console.error('❌ Error ejecutando seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
