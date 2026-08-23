'use server';

import { prisma } from '@/lib/prisma';
import { normalizePhoneForWhatsApp } from '@/lib/whatsapp/notifications';
import { getAdminSession } from '@/lib/admin-auth';
import { getUserSession } from '@/actions/user-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const registrationSchema = z.object({
  teamId: z.string().uuid().optional(),
  teamName: z.string().trim().max(100).optional(),
  player1Name: z.string().trim().min(2).max(100),
  player1Phone: z.string().trim().min(6).max(30),
  player2Name: z.string().trim().min(2).max(100),
  player2Phone: z.string().trim().max(30).optional(),
  player2UserId: z.string().uuid().optional(),
}).refine((data) => Boolean(data.player2UserId || (data.player2Phone && data.player2Phone.length >= 6)), {
  message: 'Ingresá el teléfono del segundo jugador',
}).refine((data) => !data.player2Phone || normalizePhoneForWhatsApp(data.player1Phone) !== normalizePhoneForWhatsApp(data.player2Phone), {
  message: 'Los dos jugadores deben tener teléfonos diferentes',
});

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
                teams: { include: { team: { include: { player1: true } } }, orderBy: [{ points: 'desc' }, { matchesWon: 'desc' }, { setsWon: 'desc' }, { setsLost: 'asc' }, { gamesWon: 'desc' }, { gamesLost: 'asc' }] },
                matches: { include: { team1: true, team2: true } }
              }
            }
          }
        }
      }
    });
    if (tournament) {
      for (const category of tournament.categories) {
        for (const team of category.teams) {
          if (team.player1.phone !== 'DUMMY_PLAZA') team.player1.phone = null;
        }
        for (const group of category.groups) {
          for (const placement of group.teams) {
            if (placement.team.player1.phone !== 'DUMMY_PLAZA') placement.team.player1.phone = null;
          }
        }
      }
    }
    return { success: true, data: tournament };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al cargar el torneo' };
  }
}

export async function registerTeam(tournamentId: string, categoryId: string, input: unknown) {
  try {
    const parsed = registrationSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' };
    const adminSession = await getAdminSession();
    const playerSession = adminSession ? null : await getUserSession();
    if (!adminSession && !playerSession) return { success: false, error: 'Debés iniciar sesión para inscribirte' };
    const data = { ...parsed.data };
    if (playerSession) {
      if (!playerSession.phone) return { success: false, error: 'Tu perfil no tiene un teléfono válido' };
      data.player1Name = `${playerSession.name || ''} ${playerSession.lastName || ''}`.trim();
      data.player1Phone = playerSession.phone;
    }
    const isAdmin = Boolean(adminSession);

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || (!tournament.isPublished && !isAdmin)) return { success: false, error: 'Torneo no encontrado' };
    if (!isAdmin && tournament.status !== 'REGISTRATION') {
      return { success: false, error: 'Las inscripciones para este torneo están cerradas' };
    }

    const category = await prisma.tournamentCategory.findFirst({ where: { id: categoryId, tournamentId } });
    if (!category) return { success: false, error: 'La categoría no pertenece al torneo' };

    const phone1 = normalizePhoneForWhatsApp(data.player1Phone);
    const selectedPlayer2 = data.player2UserId ? await prisma.user.findFirst({
      where: { id: data.player2UserId, role: 'PLAYER', isActive: true },
    }) : null;
    if (data.player2UserId && (!selectedPlayer2 || !selectedPlayer2.phone)) {
      return { success: false, error: 'El segundo jugador seleccionado ya no está disponible' };
    }
    const phone2 = selectedPlayer2?.phone || normalizePhoneForWhatsApp(data.player2Phone || '');
    if (phone1 === phone2) return { success: false, error: 'Los jugadores deben ser personas diferentes' };

    const teamId = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.tournamentTeam.findFirst({
        where: { categoryId, OR: [{ phone1: { in: [phone1, phone2] } }, { phone2: { in: [phone1, phone2] } }] },
      });
      if (duplicate && duplicate.id !== data.teamId) throw new Error('PLAYER_ALREADY_REGISTERED');

      let placeholder = null;
      if (data.teamId) {
        placeholder = await tx.tournamentTeam.findFirst({
          where: { id: data.teamId, categoryId, player1: { phone: 'DUMMY_PLAZA' } },
        });
        if (!placeholder) throw new Error('INVALID_SLOT');
      }

      if (tournament.maxTeams && !placeholder) {
        const occupied = await tx.tournamentTeam.count({
          where: { category: { tournamentId }, NOT: { player1: { phone: 'DUMMY_PLAZA' } } },
        });
        if (occupied >= tournament.maxTeams) throw new Error('TOURNAMENT_FULL');
      }

      let p1 = await tx.user.findFirst({ where: { phone: phone1 } });
      if (!p1) p1 = await tx.user.create({ data: { phone: phone1, name: data.player1Name, role: 'PLAYER' } });
      let p2 = selectedPlayer2 ? await tx.user.findUnique({ where: { id: selectedPlayer2.id } }) : await tx.user.findFirst({ where: { phone: phone2 } });
      if (!p2) p2 = await tx.user.create({ data: { phone: phone2, name: data.player2Name, role: 'PLAYER' } });

      const teamData = {
        name: data.teamName || `${data.player1Name} / ${data.player2Name}`,
        player1Id: p1.id,
        player2Id: p2.id,
        phone1,
        phone2,
      };
      if (placeholder) {
        return (await tx.tournamentTeam.update({ where: { id: placeholder.id }, data: teamData })).id;
      }
      return (await tx.tournamentTeam.create({ data: { categoryId, ...teamData } })).id;
    }, { isolationLevel: 'Serializable' });

    revalidatePath(`/torneos/${tournamentId}`);
    revalidatePath(`/admin/torneos/${tournamentId}`);

    return { success: true, teamId };
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      if (error.message === 'PLAYER_ALREADY_REGISTERED') return { success: false, error: 'Uno de los jugadores ya está inscripto en esta categoría' };
      if (error.message === 'INVALID_SLOT') return { success: false, error: 'La plaza seleccionada ya no está disponible' };
      if (error.message === 'TOURNAMENT_FULL') return { success: false, error: 'Se alcanzó el cupo máximo de parejas' };
    }
    return { success: false, error: 'Error al inscribir la pareja' };
  }
}

export async function searchRegisteredUsers(query: string) {
  try {
    const [admin, player] = await Promise.all([getAdminSession(), getUserSession()]);
    if (!admin && !player) return { success: false, error: 'Debés iniciar sesión', data: [] };
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
      },
      take: 5
    });

    return { success: true, data: users };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al buscar usuarios' };
  }
}
