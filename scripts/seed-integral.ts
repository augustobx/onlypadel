import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = (process.env.DATABASE_URL || '').replace('mysql://', 'mariadb://');
if (!connectionString) throw new Error('DATABASE_URL no está configurada.');

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

const PREFIX = 'seed-qa-';
const PASSWORD = 'Prueba123!';
const courtIds = ['seed-qa-court-1', 'seed-qa-court-2', 'seed-qa-court-3'];
const tournamentIds = [
  'seed-qa-tournament-draft',
  'seed-qa-tournament-registration',
  'seed-qa-tournament-knockout',
  'seed-qa-tournament-groups',
  'seed-qa-tournament-completed',
];

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric', month: '2-digit', day: '2-digit',
});
const today = formatter.format(new Date());

function localDay(offset: number) {
  const date = new Date(`${today}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return formatter.format(date);
}

function at(offset: number, time: string) {
  return new Date(`${localDay(offset)}T${time}:00-03:00`);
}

function dayOfWeek(offset: number) {
  return new Date(`${localDay(offset)}T12:00:00-03:00`).getUTCDay();
}

async function clearPreviousSeed() {
  await prisma.rankingCategory.deleteMany({ where: { id: { startsWith: PREFIX } } });
  const categories = await prisma.tournamentCategory.findMany({
    where: { tournamentId: { in: tournamentIds } },
    select: { id: true },
  });
  const categoryIds = categories.map((category) => category.id);

  if (categoryIds.length) {
    await prisma.tournamentMatch.deleteMany({ where: { categoryId: { in: categoryIds } } });
    await prisma.tournamentGroupTeam.deleteMany({
      where: { group: { categoryId: { in: categoryIds } } },
    });
    await prisma.tournamentGroup.deleteMany({ where: { categoryId: { in: categoryIds } } });
    await prisma.tournamentTeam.deleteMany({ where: { categoryId: { in: categoryIds } } });
    await prisma.tournamentCategory.deleteMany({ where: { id: { in: categoryIds } } });
  }

  await prisma.booking.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.fixedBooking.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.courtBlock.deleteMany({ where: { id: { startsWith: PREFIX } } });
}

async function seedCourts() {
  const courts = [
    { id: courtIds[0], name: 'Cancha Central', surface: 'Cristal panorámico' },
    { id: courtIds[1], name: 'Cancha Norte', surface: 'Césped sintético' },
    { id: courtIds[2], name: 'Cancha Sur', surface: 'Cristal cubierto' },
  ];

  for (const court of courts) {
    await prisma.court.upsert({
      where: { id: court.id },
      update: { name: court.name, surface: court.surface, sport: 'Padel', isActive: true },
      create: { ...court, sport: 'Padel', isActive: true },
    });
    for (let day = 0; day <= 6; day += 1) {
      await prisma.businessHour.upsert({
        where: { courtId_dayOfWeek: { courtId: court.id, dayOfWeek: day } },
        update: { openTime: '08:00', closeTime: '23:00', slotDuration: 90 },
        create: {
          id: `${PREFIX}hours-${court.id.at(-1)}-${day}`,
          courtId: court.id,
          dayOfWeek: day,
          openTime: '08:00',
          closeTime: '23:00',
          slotDuration: 90,
        },
      });
    }
  }
}

async function seedUsers() {
  const password = await bcrypt.hash(PASSWORD, 10);
  const firstNames = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hernán', 'Inés', 'Julián', 'Karina', 'Lautaro', 'Marina', 'Nicolás', 'Olivia', 'Pablo', 'Rocío', 'Santiago', 'Tamara', 'Ulises'];
  const lastNames = ['Acosta', 'Benítez', 'Castro', 'Domínguez', 'Escobar', 'Fernández', 'Giménez', 'Herrera', 'Ibarra', 'Juárez', 'Klein', 'López', 'Molina', 'Navarro', 'Ortiz', 'Pérez', 'Quiroga', 'Romero', 'Suárez', 'Torres'];
  const categories = ['4ta', '5ta', '6ta', '7ma'];

  const users = [];
  for (let index = 0; index < 20; index += 1) {
    const number = index + 1;
    const id = `${PREFIX}user-${String(number).padStart(2, '0')}`;
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email: `jugador${number}@tpadel.test`,
        dni: `4500${String(number).padStart(4, '0')}`,
        password,
        name: firstNames[index],
        lastName: lastNames[index],
        phone: `549110000${String(number).padStart(4, '0')}`,
        category: categories[index % categories.length],
        role: 'PLAYER',
        isActive: number !== 20,
      },
      create: {
        id,
        email: `jugador${number}@tpadel.test`,
        dni: `4500${String(number).padStart(4, '0')}`,
        password,
        name: firstNames[index],
        lastName: lastNames[index],
        phone: `549110000${String(number).padStart(4, '0')}`,
        category: categories[index % categories.length],
        role: 'PLAYER',
        isActive: number !== 20,
      },
    });
    users.push(user);
  }
  return users;
}

async function seedBookings(users: Awaited<ReturnType<typeof seedUsers>>) {
  const normalBookings = [
    { id: `${PREFIX}booking-confirmed-1`, courtId: courtIds[0], userId: users[0].id, offset: 1, start: '08:00', end: '09:30', status: 'CONFIRMED' as const, amount: 18000, description: 'Turno normal confirmado' },
    { id: `${PREFIX}booking-pending-1`, courtId: courtIds[0], userId: users[1].id, offset: 1, start: '11:00', end: '12:30', status: 'PENDING' as const, amount: 18000, description: 'Turno pendiente de seña' },
    { id: `${PREFIX}booking-confirmed-2`, courtId: courtIds[1], userId: users[2].id, offset: 1, start: '14:00', end: '15:30', status: 'CONFIRMED' as const, amount: 18000, description: 'Turno normal confirmado' },
    { id: `${PREFIX}booking-cancelled-1`, courtId: courtIds[2], userId: users[3].id, offset: 1, start: '17:00', end: '18:30', status: 'CANCELLED' as const, amount: 18000, description: 'Turno cancelado para historial' },
    { id: `${PREFIX}booking-confirmed-3`, courtId: courtIds[2], userId: users[4].id, offset: 2, start: '15:30', end: '17:00', status: 'CONFIRMED' as const, amount: 18000, description: 'Turno normal confirmado' },
    { id: `${PREFIX}booking-past-1`, courtId: courtIds[0], userId: users[5].id, offset: -2, start: '18:30', end: '20:00', status: 'CONFIRMED' as const, amount: 18000, description: 'Turno pasado para historial' },
  ];

  for (const booking of normalBookings) {
    await prisma.booking.create({
      data: {
        id: booking.id,
        courtId: booking.courtId,
        userId: booking.userId,
        startTime: at(booking.offset, booking.start),
        endTime: at(booking.offset, booking.end),
        status: booking.status,
        totalAmount: booking.amount,
        description: booking.description,
        slotKey: booking.status === 'CANCELLED' ? null : `${booking.courtId}:${at(booking.offset, booking.start).toISOString()}`,
      },
    });
  }

  const fixedData = [
    { id: `${PREFIX}fixed-1`, courtId: courtIds[1], userId: users[6].id, offset: 1, start: '18:30', end: '20:00' },
    { id: `${PREFIX}fixed-2`, courtId: courtIds[0], userId: users[7].id, offset: 3, start: '20:00', end: '21:30' },
    { id: `${PREFIX}fixed-inactive`, courtId: courtIds[2], userId: users[8].id, offset: 2, start: '08:00', end: '09:30', inactive: true },
  ];

  for (const fixed of fixedData) {
    await prisma.fixedBooking.create({
      data: {
        id: fixed.id,
        courtId: fixed.courtId,
        userId: fixed.userId,
        dayOfWeek: dayOfWeek(fixed.offset),
        startTime: fixed.start,
        endTime: fixed.end,
        startDate: at(-30, '00:00'),
        endDate: at(180, '23:59'),
        isActive: !fixed.inactive,
      },
    });
  }

  await prisma.booking.create({
    data: {
      id: `${PREFIX}booking-fixed-occurrence`,
      courtId: courtIds[1],
      userId: users[6].id,
      fixedBookingId: `${PREFIX}fixed-1`,
      startTime: at(1, '18:30'),
      endTime: at(1, '20:00'),
      status: 'FIXED',
      totalAmount: 18000,
      description: 'Ocurrencia materializada de turno fijo',
      slotKey: `${courtIds[1]}:${at(1, '18:30').toISOString()}`,
    },
  });

  const blocks = [
    { id: `${PREFIX}block-maintenance`, courtId: courtIds[1], offset: 1, start: '09:30', end: '11:00', reason: 'Mantenimiento programado' },
    { id: `${PREFIX}block-class`, courtId: courtIds[2], offset: 2, start: '20:00', end: '21:30', reason: 'Clase de la escuela' },
    { id: `${PREFIX}block-event`, courtId: courtIds[0], offset: 4, start: '12:30', end: '15:30', reason: 'Evento privado' },
  ];
  for (const block of blocks) {
    await prisma.courtBlock.create({
      data: {
        id: block.id,
        courtId: block.courtId,
        startTime: at(block.offset, block.start),
        endTime: at(block.offset, block.end),
        reason: block.reason,
      },
    });
  }
}

type SeedUser = Awaited<ReturnType<typeof seedUsers>>[number];

async function createCategory(tournamentId: string, suffix: string, name: string, format: 'KNOCKOUT' | 'ROUND_ROBIN' | 'MIXED') {
  return prisma.tournamentCategory.create({
    data: { id: `${tournamentId}-cat-${suffix}`, tournamentId, name, format },
  });
}

async function createTeams(categoryId: string, users: SeedUser[], count: number, startIndex = 0) {
  const teams = [];
  for (let index = 0; index < count; index += 1) {
    const player1 = users[(startIndex + index * 2) % users.length];
    const player2 = users[(startIndex + index * 2 + 1) % users.length];
    const team = await prisma.tournamentTeam.create({
      data: {
        id: `${categoryId}-team-${index + 1}`,
        categoryId,
        name: `${player1.lastName} / ${player2.lastName}`,
        player1Id: player1.id,
        player2Id: player2.id,
        phone1: player1.phone,
        phone2: player2.phone,
        isPaid: index % 3 !== 2,
      },
    });
    teams.push(team);
  }
  return teams;
}

async function seedTournaments(users: SeedUser[]) {
  await prisma.tournament.upsert({
    where: { id: tournamentIds[0] },
    update: { name: 'Copa Primavera — Borrador', startDate: at(35, '09:00'), endDate: at(37, '23:00'), status: 'DRAFT', entryFee: 22000, isPublished: false, requireDeposit: false, depositAmount: 0, format: 'KNOCKOUT', maxTeams: 16 },
    create: { id: tournamentIds[0], name: 'Copa Primavera — Borrador', startDate: at(35, '09:00'), endDate: at(37, '23:00'), status: 'DRAFT', entryFee: 22000, isPublished: false, requireDeposit: false, depositAmount: 0, format: 'KNOCKOUT', maxTeams: 16 },
  });
  await createCategory(tournamentIds[0], '7ma', '7ma Libre', 'KNOCKOUT');

  await prisma.tournament.upsert({
    where: { id: tournamentIds[1] },
    update: { name: 'Open Aniversario — Inscripciones', startDate: at(14, '09:00'), endDate: at(16, '23:00'), status: 'REGISTRATION', entryFee: 25000, isPublished: true, requireDeposit: true, depositAmount: 8000, format: 'MIXED', maxTeams: 24 },
    create: { id: tournamentIds[1], name: 'Open Aniversario — Inscripciones', startDate: at(14, '09:00'), endDate: at(16, '23:00'), status: 'REGISTRATION', entryFee: 25000, isPublished: true, requireDeposit: true, depositAmount: 8000, format: 'MIXED', maxTeams: 24 },
  });
  const reg5 = await createCategory(tournamentIds[1], '5m', '5ta Masculina', 'MIXED');
  const reg6 = await createCategory(tournamentIds[1], '6f', '6ta Femenina', 'MIXED');
  await createTeams(reg5.id, users, 4, 0);
  await createTeams(reg6.id, users, 3, 8);

  await prisma.tournament.upsert({
    where: { id: tournamentIds[2] },
    update: { name: 'Master Nocturno — Llaves en curso', startDate: at(-1, '18:00'), endDate: at(1, '23:00'), status: 'ONGOING', entryFee: 24000, isPublished: true, requireDeposit: false, depositAmount: 0, format: 'KNOCKOUT', maxTeams: 8 },
    create: { id: tournamentIds[2], name: 'Master Nocturno — Llaves en curso', startDate: at(-1, '18:00'), endDate: at(1, '23:00'), status: 'ONGOING', entryFee: 24000, isPublished: true, requireDeposit: false, depositAmount: 0, format: 'KNOCKOUT', maxTeams: 8 },
  });
  const knockoutCat = await createCategory(tournamentIds[2], '4l', '4ta Libre', 'KNOCKOUT');
  const knockoutTeams = await createTeams(knockoutCat.id, users, 8, 0);
  const semi1Id = `${knockoutCat.id}-match-sf1`;
  const semi2Id = `${knockoutCat.id}-match-sf2`;
  const finalId = `${knockoutCat.id}-match-final`;
  const qfPairs = [[0, 1], [2, 3], [4, 5], [6, 7]];
  for (let index = 0; index < qfPairs.length; index += 1) {
    const [a, b] = qfPairs[index];
    const winner = index < 2 ? knockoutTeams[index === 0 ? a : b] : null;
    await prisma.tournamentMatch.create({
      data: {
        id: `${knockoutCat.id}-match-qf${index + 1}`,
        categoryId: knockoutCat.id,
        round: 1,
        matchOrder: index + 1,
        roundName: 'Cuartos de final',
        team1Id: knockoutTeams[a].id,
        team2Id: knockoutTeams[b].id,
        scoreTeam1: index === 0 ? '6-3 / 6-4' : index === 1 ? '4-6 / 5-7' : null,
        scoreTeam2: index === 0 ? '3-6 / 4-6' : index === 1 ? '6-4 / 7-5' : null,
        winnerId: winner?.id,
        status: index < 2 ? 'COMPLETED' : index === 2 ? 'IN_PROGRESS' : 'SCHEDULED',
        courtId: courtIds[index % courtIds.length],
        startTime: at(0, ['16:00', '17:30', '19:00', '20:30'][index]),
        nextMatchId: index < 2 ? semi1Id : semi2Id,
      },
    });
  }
  await prisma.tournamentMatch.createMany({
    data: [
      { id: semi1Id, categoryId: knockoutCat.id, round: 2, matchOrder: 1, roundName: 'Semifinal', team1Id: knockoutTeams[0].id, team2Id: knockoutTeams[3].id, status: 'SCHEDULED', courtId: courtIds[0], startTime: at(1, '18:30'), nextMatchId: finalId },
      { id: semi2Id, categoryId: knockoutCat.id, round: 2, matchOrder: 2, roundName: 'Semifinal', status: 'SCHEDULED', courtId: courtIds[1], startTime: at(1, '20:00'), nextMatchId: finalId },
      { id: finalId, categoryId: knockoutCat.id, round: 3, matchOrder: 1, roundName: 'Final', status: 'SCHEDULED', courtId: courtIds[0], startTime: at(2, '20:00') },
    ],
  });

  await prisma.tournament.upsert({
    where: { id: tournamentIds[3] },
    update: { name: 'Copa T-Padel — Zonas en juego', startDate: at(0, '08:00'), endDate: at(2, '23:00'), status: 'ONGOING', entryFee: 20000, isPublished: true, requireDeposit: false, depositAmount: 0, format: 'MIXED', maxTeams: 16 },
    create: { id: tournamentIds[3], name: 'Copa T-Padel — Zonas en juego', startDate: at(0, '08:00'), endDate: at(2, '23:00'), status: 'ONGOING', entryFee: 20000, isPublished: true, requireDeposit: false, depositAmount: 0, format: 'MIXED', maxTeams: 16 },
  });
  const groupCat = await createCategory(tournamentIds[3], '6m', '6ta Mixta', 'ROUND_ROBIN');
  const groupTeams = await createTeams(groupCat.id, users, 8, 2);
  for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
    const group = await prisma.tournamentGroup.create({
      data: { id: `${groupCat.id}-group-${groupIndex + 1}`, categoryId: groupCat.id, name: `Zona ${groupIndex === 0 ? 'A' : 'B'}` },
    });
    const teams = groupTeams.slice(groupIndex * 4, groupIndex * 4 + 4);
    for (let index = 0; index < teams.length; index += 1) {
      await prisma.tournamentGroupTeam.create({
        data: {
          id: `${group.id}-placement-${index + 1}`,
          groupId: group.id,
          teamId: teams[index].id,
          points: index === 0 ? 6 : index === 1 ? 3 : 0,
          matchesPlayed: index < 2 ? 2 : 1,
          matchesWon: index === 0 ? 2 : index === 1 ? 1 : 0,
          matchesLost: index === 0 ? 0 : index === 1 ? 1 : 1,
          setsWon: index === 0 ? 4 : index === 1 ? 2 : 0,
          setsLost: index === 0 ? 0 : index === 1 ? 2 : 2,
          gamesWon: index === 0 ? 24 : index === 1 ? 18 : 8,
          gamesLost: index === 0 ? 12 : index === 1 ? 18 : 12,
        },
      });
    }
    const pairings = [[0, 1], [2, 3], [0, 2]];
    for (let index = 0; index < pairings.length; index += 1) {
      const [a, b] = pairings[index];
      await prisma.tournamentMatch.create({
        data: {
          id: `${group.id}-match-${index + 1}`,
          categoryId: groupCat.id,
          groupId: group.id,
          round: 1,
          matchOrder: groupIndex * 10 + index + 1,
          roundName: 'Fase de zonas',
          team1Id: teams[a].id,
          team2Id: teams[b].id,
          scoreTeam1: index === 0 ? '6-3 / 6-4' : index === 1 ? '6-4 / 2-1' : null,
          scoreTeam2: index === 0 ? '3-6 / 4-6' : index === 1 ? '4-6 / 1-2' : null,
          winnerId: index === 0 ? teams[a].id : null,
          status: index === 0 ? 'COMPLETED' : index === 1 ? 'IN_PROGRESS' : 'SCHEDULED',
          courtId: courtIds[(groupIndex + index) % courtIds.length],
          startTime: at(index === 2 ? 1 : 0, ['10:00', '11:30', '13:00'][index]),
        },
      });
    }
  }

  await prisma.tournament.upsert({
    where: { id: tournamentIds[4] },
    update: { name: 'Copa Invierno — Finalizada', startDate: at(-30, '09:00'), endDate: at(-28, '23:00'), status: 'COMPLETED', entryFee: 19000, isPublished: true, requireDeposit: false, depositAmount: 0, format: 'KNOCKOUT', maxTeams: 4 },
    create: { id: tournamentIds[4], name: 'Copa Invierno — Finalizada', startDate: at(-30, '09:00'), endDate: at(-28, '23:00'), status: 'COMPLETED', entryFee: 19000, isPublished: true, requireDeposit: false, depositAmount: 0, format: 'KNOCKOUT', maxTeams: 4 },
  });
  const completedCat = await createCategory(tournamentIds[4], '5l', '5ta Libre', 'KNOCKOUT');
  const completedTeams = await createTeams(completedCat.id, users, 4, 10);
  await prisma.tournamentMatch.createMany({
    data: [
      { id: `${completedCat.id}-semi-1`, categoryId: completedCat.id, round: 1, matchOrder: 1, roundName: 'Semifinal', team1Id: completedTeams[0].id, team2Id: completedTeams[1].id, scoreTeam1: '6-2 / 6-3', scoreTeam2: '2-6 / 3-6', winnerId: completedTeams[0].id, status: 'COMPLETED', courtId: courtIds[0], startTime: at(-29, '18:30'), nextMatchId: `${completedCat.id}-final` },
      { id: `${completedCat.id}-semi-2`, categoryId: completedCat.id, round: 1, matchOrder: 2, roundName: 'Semifinal', team1Id: completedTeams[2].id, team2Id: completedTeams[3].id, scoreTeam1: '4-6 / 6-3 / 7-5', scoreTeam2: '6-4 / 3-6 / 5-7', winnerId: completedTeams[2].id, status: 'COMPLETED', courtId: courtIds[1], startTime: at(-29, '20:00'), nextMatchId: `${completedCat.id}-final` },
      { id: `${completedCat.id}-final`, categoryId: completedCat.id, round: 2, matchOrder: 1, roundName: 'Final', team1Id: completedTeams[0].id, team2Id: completedTeams[2].id, scoreTeam1: '7-5 / 6-4', scoreTeam2: '5-7 / 4-6', winnerId: completedTeams[0].id, status: 'COMPLETED', courtId: courtIds[0], startTime: at(-28, '20:00') },
    ],
  });
}

async function seedRankings(users: SeedUser[]) {
  const pointsCategory = await prisma.rankingCategory.create({
    data: {
      id: `${PREFIX}ranking-6ta`,
      name: '6ta Libre',
      description: 'Ranking anual 2026 · orden automático por puntos.',
      isPublished: true,
      displayOrder: 0,
      sortMode: 'POINTS',
      showPoints: true,
      showPlayed: true,
      showWon: true,
      showLost: true,
    },
  });
  const manualCategory = await prisma.rankingCategory.create({
    data: {
      id: `${PREFIX}ranking-5ta`,
      name: '5ta Masculina',
      description: 'Escalafón oficial actualizado por la administración.',
      isPublished: true,
      displayOrder: 1,
      sortMode: 'MANUAL',
      showPoints: true,
      showPlayed: true,
      showWon: true,
      showLost: false,
    },
  });
  await prisma.rankingCategory.create({
    data: {
      id: `${PREFIX}ranking-hidden`,
      name: '7ma Experimental',
      description: 'Categoría oculta para probar la publicación.',
      isPublished: false,
      displayOrder: 2,
      sortMode: 'POINTS',
    },
  });

  const pointRows = [
    { userId: users[0].id, points: 1320, played: 18, won: 14, lost: 4 },
    { userId: users[4].id, points: 1210, played: 17, won: 12, lost: 5 },
    { userId: users[8].id, points: 980, played: 15, won: 9, lost: 6 },
    { userId: users[12].id, points: 810, played: 13, won: 7, lost: 6 },
  ];
  for (let index = 0; index < pointRows.length; index += 1) {
    const row = pointRows[index];
    await prisma.rankingEntry.create({ data: { id: `${pointsCategory.id}-entry-${index + 1}`, categoryId: pointsCategory.id, userId: row.userId, points: row.points, matchesPlayed: row.played, matchesWon: row.won, matchesLost: row.lost } });
  }
  await prisma.rankingEntry.createMany({
    data: [
      { id: `${pointsCategory.id}-external-1`, categoryId: pointsCategory.id, externalName: 'Matías Roldán', externalPhone: '5491122221101', points: 1120, matchesPlayed: 16, matchesWon: 11, matchesLost: 5 },
      { id: `${pointsCategory.id}-external-2`, categoryId: pointsCategory.id, externalName: 'Valentina Costa', points: 720, matchesPlayed: 12, matchesWon: 6, matchesLost: 6 },
      { id: `${manualCategory.id}-entry-1`, categoryId: manualCategory.id, userId: users[1].id, manualPosition: 1, points: 1500, matchesPlayed: 20, matchesWon: 16, matchesLost: 4 },
      { id: `${manualCategory.id}-external-1`, categoryId: manualCategory.id, externalName: 'Federico Luna', externalPhone: '5491133332201', manualPosition: 2, points: 1410, matchesPlayed: 19, matchesWon: 14, matchesLost: 5 },
      { id: `${manualCategory.id}-entry-2`, categoryId: manualCategory.id, userId: users[5].id, manualPosition: 3, points: 1360, matchesPlayed: 18, matchesWon: 13, matchesLost: 5 },
      { id: `${manualCategory.id}-external-2`, categoryId: manualCategory.id, externalName: 'Sofía Méndez', manualPosition: 4, points: 1190, matchesPlayed: 16, matchesWon: 10, matchesLost: 6 },
    ],
  });
}

async function printSummary() {
  const [courts, users, bookings, fixed, blocks, tournaments, categories, teams, groups, matches, rankingCategories, rankingEntries] = await Promise.all([
    prisma.court.count({ where: { id: { startsWith: PREFIX } } }),
    prisma.user.count({ where: { id: { startsWith: PREFIX } } }),
    prisma.booking.count({ where: { id: { startsWith: PREFIX } } }),
    prisma.fixedBooking.count({ where: { id: { startsWith: PREFIX } } }),
    prisma.courtBlock.count({ where: { id: { startsWith: PREFIX } } }),
    prisma.tournament.count({ where: { id: { in: tournamentIds } } }),
    prisma.tournamentCategory.count({ where: { tournamentId: { in: tournamentIds } } }),
    prisma.tournamentTeam.count({ where: { category: { tournamentId: { in: tournamentIds } } } }),
    prisma.tournamentGroup.count({ where: { category: { tournamentId: { in: tournamentIds } } } }),
    prisma.tournamentMatch.count({ where: { category: { tournamentId: { in: tournamentIds } } } }),
    prisma.rankingCategory.count({ where: { id: { startsWith: PREFIX } } }),
    prisma.rankingEntry.count({ where: { category: { id: { startsWith: PREFIX } } } }),
  ]);
  console.table({ courts, users, bookings, fixed, blocks, tournaments, categories, teams, groups, matches, rankingCategories, rankingEntries });
}

async function main() {
  console.log(`Preparando semilla integral para ${today} (America/Argentina/Buenos_Aires)...`);
  await clearPreviousSeed();
  await seedCourts();
  const users = await seedUsers();
  await seedBookings(users);
  await seedTournaments(users);
  await seedRankings(users);
  await prisma.systemSetting.update({
    where: { id: 1 },
    data: { usersModuleEnabled: true, clientCancellations: true, tournamentsEnabled: true, rankingsEnabled: true },
  });
  await printSummary();
  console.log('Semilla integral lista.');
  console.log(`Acceso jugador activo: DNI 45000001 / ${PASSWORD}`);
  console.log(`Acceso jugador suspendido: DNI 45000020 / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('No se pudo generar la semilla integral:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
