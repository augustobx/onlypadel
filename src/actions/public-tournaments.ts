'use server';

import { prisma } from '@/lib/prisma';
import { normalizePhoneForWhatsApp } from '@/lib/whatsapp/notifications';

export async function getPublicTournaments() {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { isPublished: true },
      orderBy: { startDate: 'asc' },
      include: {
        categories: true,
      }
    });
    return { success: true, data: tournaments };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al cargar torneos' };
  }
}

export async function getTournamentDetails(id: string) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id, isPublished: true },
      include: {
        categories: {
          include: {
            teams: { include: { player1: true } },
            matches: {
              include: { team1: true, team2: true, winner: true },
              orderBy: [{ round: 'desc' }, { matchOrder: 'asc' }]
            },
            groups: {
              include: {
                teams: { include: { team: { include: { player1: true } } }, orderBy: { points: 'desc' } },
                matches: { include: { team1: true, team2: true } }
              }
            }
          }
        }
      }
    });
    return { success: true, data: tournament };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al cargar el torneo' };
  }
}

export async function registerTeam(tournamentId: string, categoryId: string, data: any) {
  try {
    // FIX #7: Validar que el torneo esté en estado de inscripción
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        categories: {
          include: { _count: { select: { teams: true } } }
        }
      }
    });
    
    if (!tournament) return { success: false, error: 'Torneo no encontrado' };
    if (tournament.status !== 'REGISTRATION') {
      return { success: false, error: 'Las inscripciones para este torneo están cerradas' };
    }

    // Validar cupo máximo (global)
    if (tournament.maxTeams) {
      const totalTeams = tournament.categories.reduce((acc, cat) => acc + cat._count.teams, 0);
      if (totalTeams >= tournament.maxTeams && !data.teamId) {
        return { success: false, error: 'Se alcanzó el cupo máximo de parejas' };
      }
    }

    const phone1 = normalizePhoneForWhatsApp(data.player1Phone);
    const phone2 = data.player2Phone ? normalizePhoneForWhatsApp(data.player2Phone) : null;

    let p1 = await prisma.user.findFirst({ where: { phone: phone1 } });
    if (!p1) p1 = await prisma.user.create({ data: { phone: phone1, name: data.player1Name, role: 'PLAYER', email: `${phone1}@tpadel.com` } });

    let p2Id = null;
    if (phone2) {
      let p2 = await prisma.user.findFirst({ where: { phone: phone2 } });
      if (!p2) p2 = await prisma.user.create({ data: { phone: phone2, name: data.player2Name, role: 'PLAYER', email: `${phone2}@tpadel.com` } });
      p2Id = p2.id;
    }

    let teamId;

    if (data.teamId) {
      // Actualizar la plaza existente
      const updatedTeam = await prisma.tournamentTeam.update({
        where: { id: data.teamId },
        data: {
          name: data.teamName || `${data.player1Name} / ${data.player2Name}`,
          player1Id: p1.id,
          player2Id: p2Id,
          phone1,
          phone2,
        }
      });
      teamId = updatedTeam.id;
    } else {
      // Crear un equipo nuevo
      const team = await prisma.tournamentTeam.create({
        data: {
          categoryId,
          name: data.teamName || `${data.player1Name} / ${data.player2Name}`,
          player1Id: p1.id,
          player2Id: p2Id,
          phone1,
          phone2,
        }
      });
      teamId = team.id;
    }

    return { success: true, teamId };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al inscribir la pareja' };
  }
}

export async function searchRegisteredUsers(query: string) {
  try {
    if (!query || query.length < 2) return { success: true, data: [] };

    const users = await prisma.user.findMany({
      where: {
        role: 'PLAYER',
        password: { not: null }, // Solo usuarios registrados
        OR: [
          { name: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } }
        ]
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        phone: true,
      },
      take: 5
    });

    return { success: true, data: users };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al buscar usuarios' };
  }
}
