import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
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

    const createTeams = (categoryId: string, count: number, startIndex = 0) => {
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
          isPaid: i % 2 === 0,
        });
      }
      return teams;
    };

    // ==========================================
    // ESCENARIO 1: Torneo en Borrador
    // ==========================================
    const t1 = await prisma.tournament.create({
      data: {
        name: 'Copa de Invierno (Draft)',
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
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

    await prisma.tournamentTeam.createMany({ data: createTeams(t2Cat1.id, 3, 0) });
    await prisma.tournamentTeam.createMany({ data: createTeams(t2Cat2.id, 2, 6) });

    // ==========================================
    // ESCENARIO 3: Torneo En Curso (Knockout)
    // ==========================================
    const t3 = await prisma.tournament.create({
      data: {
        name: 'Master Series (Llaves)',
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
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
    
    await prisma.tournamentTeam.createMany({ data: createTeams(t3Cat.id, 4, 0) });
    const t3Teams = await prisma.tournamentTeam.findMany({ where: { categoryId: t3Cat.id } });

    await prisma.tournamentMatch.create({
      data: {
        categoryId: t3Cat.id, round: 1, matchOrder: 1, roundName: 'Semifinal',
        team1Id: t3Teams[0].id, team2Id: t3Teams[1].id,
        status: 'COMPLETED', scoreTeam1: '6-4 / 7-5', winnerId: t3Teams[0].id
      }
    });
    await prisma.tournamentMatch.create({
      data: {
        categoryId: t3Cat.id, round: 1, matchOrder: 2, roundName: 'Semifinal',
        team1Id: t3Teams[2].id, team2Id: t3Teams[3].id,
        status: 'IN_PROGRESS', scoreTeam1: '6-4 / 3-5',
      }
    });
    await prisma.tournamentMatch.create({
      data: {
        categoryId: t3Cat.id, round: 2, matchOrder: 1, roundName: 'Final',
        team1Id: t3Teams[0].id, status: 'SCHEDULED'
      }
    });

    // ==========================================
    // ESCENARIO 4: Torneo En Curso (Zonas)
    // ==========================================
    const t4 = await prisma.tournament.create({
      data: {
        name: 'Open T-Padel (Zonas)',
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
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

    const groupA = await prisma.tournamentGroup.create({
      data: { categoryId: t4Cat.id, name: 'Zona A' }
    });
    await prisma.tournamentTeam.createMany({ data: createTeams(t4Cat.id, 3, 0) });
    const teamsA = await prisma.tournamentTeam.findMany({ where: { categoryId: t4Cat.id }, take: 3 });
    
    for (const t of teamsA) {
      await prisma.tournamentGroupTeam.create({ data: { groupId: groupA.id, teamId: t.id } });
    }

    await prisma.tournamentMatch.create({
      data: {
        categoryId: t4Cat.id, groupId: groupA.id,
        round: 1, matchOrder: 1, roundName: 'Fase de Grupos',
        team1Id: teamsA[0].id, team2Id: teamsA[1].id,
        status: 'COMPLETED', scoreTeam1: '6-2 / 6-4', winnerId: teamsA[0].id,
        startTime: new Date(Date.now() - 1000 * 60 * 60)
      }
    });
    await prisma.tournamentMatch.create({
      data: {
        categoryId: t4Cat.id, groupId: groupA.id,
        round: 1, matchOrder: 2, roundName: 'Fase de Grupos',
        team1Id: teamsA[0].id, team2Id: teamsA[2].id,
        status: 'IN_PROGRESS', scoreTeam1: '6-4 / 2-1',
        startTime: new Date()
      }
    });
    await prisma.tournamentMatch.create({
      data: {
        categoryId: t4Cat.id, groupId: groupA.id,
        round: 1, matchOrder: 3, roundName: 'Fase de Grupos',
        team1Id: teamsA[1].id, team2Id: teamsA[2].id,
        status: 'SCHEDULED',
        startTime: new Date(Date.now() + 1000 * 60 * 60)
      }
    });

    await prisma.tournamentGroupTeam.updateMany({
      where: { groupId: groupA.id, teamId: teamsA[0].id },
      data: { points: 3, matchesPlayed: 1, matchesWon: 1, setsWon: 2, gamesWon: 12, gamesLost: 6 }
    });
    await prisma.tournamentGroupTeam.updateMany({
      where: { groupId: groupA.id, teamId: teamsA[1].id },
      data: { points: 0, matchesPlayed: 1, matchesLost: 1, setsLost: 2, gamesWon: 6, gamesLost: 12 }
    });

    return NextResponse.json({ success: true, message: 'Torneos creados correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
