import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = (process.env.DATABASE_URL || '').replace('mysql://', 'mariadb://');
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed de torneos...');

  // 1. Crear usuarios dummy si no existen
  const users = [];
  for (let i = 1; i <= 16; i++) {
    const phone = `11550000${i.toString().padStart(2, '0')}`;
    let user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: `Jugador ${i}`,
          phone,
          email: `jugador${i}@test.com`,
          role: 'PLAYER'
        }
      });
    }
    users.push(user);
  }

  // Helper para crear equipos
  const createTeams = (categoryId, count, startIndex = 0) => {
    const teams = [];
    for (let i = 0; i < count; i++) {
      const p1 = users[(startIndex + i * 2) % users.length];
      const p2 = users[(startIndex + i * 2 + 1) % users.length];
      teams.push({
        categoryId,
        name: `${p1.name.split(' ')[1]} / ${p2.name.split(' ')[1]}`,
        player1Id: p1.id,
        player2Id: p2.id,
        phone1: p1.phone,
        phone2: p2.phone,
        isPaid: i % 2 === 0, // la mitad pagó
      });
    }
    return teams;
  };

  // ==========================================
  // ESCENARIO 1: Torneo en Borrador
  // ==========================================
  console.log('Creando Torneo Draft...');
  const t1 = await prisma.tournament.create({
    data: {
      name: 'Copa de Invierno (Draft)',
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // en 30 días
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 32),
      status: 'DRAFT',
      entryFee: 15000,
      isPublished: false,
      format: 'KNOCKOUT',
    }
  });
  await prisma.tournamentCategory.create({
    data: { tournamentId: t1.id, name: '7ma Libre', format: 'KNOCKOUT' }
  });

  // ==========================================
  // ESCENARIO 2: Torneo en Inscripción
  // ==========================================
  console.log('Creando Torneo Inscripciones...');
  const t2 = await prisma.tournament.create({
    data: {
      name: 'Torneo Aniversario (Inscripciones)',
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 17),
      status: 'REGISTRATION',
      entryFee: 12000,
      isPublished: true,
      requireDeposit: true,
      depositAmount: 5000,
      format: 'MIXED',
      maxTeams: 32,
    }
  });
  const t2Cat1 = await prisma.tournamentCategory.create({
    data: { tournamentId: t2.id, name: '5ta Masculina', format: 'MIXED' }
  });
  const t2Cat2 = await prisma.tournamentCategory.create({
    data: { tournamentId: t2.id, name: 'Suma 13', format: 'MIXED' }
  });

  // Agregar 3 equipos a 5ta
  await prisma.tournamentTeam.createMany({ data: createTeams(t2Cat1.id, 3, 0) });
  // Agregar 2 equipos a Suma 13
  await prisma.tournamentTeam.createMany({ data: createTeams(t2Cat2.id, 2, 6) });


  // ==========================================
  // ESCENARIO 3: Torneo En Curso (Knockout)
  // ==========================================
  console.log('Creando Torneo En Curso (Llaves)...');
  const t3 = await prisma.tournament.create({
    data: {
      name: 'Master Series (Llaves en curso)',
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // Ayer
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
      status: 'ONGOING',
      entryFee: 20000,
      isPublished: true,
      format: 'KNOCKOUT',
    }
  });
  const t3Cat = await prisma.tournamentCategory.create({
    data: { tournamentId: t3.id, name: '4ta Libre', format: 'KNOCKOUT' }
  });
  
  // 4 equipos para hacer Semis y Final
  await prisma.tournamentTeam.createMany({ data: createTeams(t3Cat.id, 4, 0) });
  const t3Teams = await prisma.tournamentTeam.findMany({ where: { categoryId: t3Cat.id } });

  // Crear Cuadro
  const semi1 = await prisma.tournamentMatch.create({
    data: {
      categoryId: t3Cat.id,
      round: 1, matchOrder: 1, roundName: 'Semifinal',
      team1Id: t3Teams[0].id, team2Id: t3Teams[1].id,
      status: 'COMPLETED', scoreTeam1: '6-4 / 7-5', winnerId: t3Teams[0].id
    }
  });
  const semi2 = await prisma.tournamentMatch.create({
    data: {
      categoryId: t3Cat.id,
      round: 1, matchOrder: 2, roundName: 'Semifinal',
      team1Id: t3Teams[2].id, team2Id: t3Teams[3].id,
      status: 'IN_PROGRESS', scoreTeam1: '6-4 / 3-5',
    }
  });
  await prisma.tournamentMatch.create({
    data: {
      categoryId: t3Cat.id,
      round: 2, matchOrder: 1, roundName: 'Final',
      team1Id: t3Teams[0].id, // ganador semi1
      status: 'SCHEDULED'
    }
  });
  // link nextMatch (simulado simple para el ejemplo)
  

  // ==========================================
  // ESCENARIO 4: Torneo En Curso (Zonas)
  // ==========================================
  console.log('Creando Torneo En Curso (Zonas)...');
  const t4 = await prisma.tournament.create({
    data: {
      name: 'Open T-Padel (Zonas en juego)',
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 2), // Hace 2 horas
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      status: 'ONGOING',
      entryFee: 18000,
      isPublished: true,
      format: 'MIXED',
    }
  });
  const t4Cat = await prisma.tournamentCategory.create({
    data: { tournamentId: t4.id, name: '6ta Femenina', format: 'ROUND_ROBIN' }
  });

  // Grupo A
  const groupA = await prisma.tournamentGroup.create({
    data: { categoryId: t4Cat.id, name: 'Zona A' }
  });
  await prisma.tournamentTeam.createMany({ data: createTeams(t4Cat.id, 3, 0) });
  const teamsA = await prisma.tournamentTeam.findMany({ where: { categoryId: t4Cat.id }, take: 3 });
  
  for (const t of teamsA) {
    await prisma.tournamentGroupTeam.create({ data: { groupId: groupA.id, teamId: t.id } });
  }

  // Match 1 Zona A (Completado)
  await prisma.tournamentMatch.create({
    data: {
      categoryId: t4Cat.id, groupId: groupA.id,
      round: 1, matchOrder: 1, roundName: 'Fase de Grupos',
      team1Id: teamsA[0].id, team2Id: teamsA[1].id,
      status: 'COMPLETED', scoreTeam1: '6-2 / 6-4', winnerId: teamsA[0].id,
      startTime: new Date(Date.now() - 1000 * 60 * 60)
    }
  });
  // Match 2 Zona A (En progreso)
  await prisma.tournamentMatch.create({
    data: {
      categoryId: t4Cat.id, groupId: groupA.id,
      round: 1, matchOrder: 2, roundName: 'Fase de Grupos',
      team1Id: teamsA[0].id, team2Id: teamsA[2].id,
      status: 'IN_PROGRESS', scoreTeam1: '6-4 / 2-1',
      startTime: new Date()
    }
  });
  // Match 3 Zona A (Programado)
  await prisma.tournamentMatch.create({
    data: {
      categoryId: t4Cat.id, groupId: groupA.id,
      round: 1, matchOrder: 3, roundName: 'Fase de Grupos',
      team1Id: teamsA[1].id, team2Id: teamsA[2].id,
      status: 'SCHEDULED',
      startTime: new Date(Date.now() + 1000 * 60 * 60)
    }
  });

  // Simular stats en tabla de posiciones para el match 1
  await prisma.tournamentGroupTeam.updateMany({
    where: { groupId: groupA.id, teamId: teamsA[0].id },
    data: { points: 3, matchesPlayed: 1, matchesWon: 1, setsWon: 2, gamesWon: 12, gamesLost: 6 }
  });
  await prisma.tournamentGroupTeam.updateMany({
    where: { groupId: groupA.id, teamId: teamsA[1].id },
    data: { points: 0, matchesPlayed: 1, matchesLost: 1, setsLost: 2, gamesWon: 6, gamesLost: 12 }
  });

  console.log('✅ Seed de torneos completado con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
