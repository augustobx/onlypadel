'use server';

import { prisma } from '@/lib/prisma';
import { normalizePhoneForWhatsApp } from '@/lib/whatsapp/notifications';
import { getAdminSession } from '@/lib/admin-auth';
import { getUserSession } from '@/actions/user-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const registrationSchema = z.object({
  teamId: z.string().optional().nullable().or(z.literal('')),
  teamName: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  player1Name: z.string().trim().min(2).max(100),
  player1LastName: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  player1Dni: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  player1Phone: z.string().trim().min(6).max(30),
  player2Name: z.string().trim().min(2).max(100),
  player2LastName: z.string().trim().max(100).optional().nullable().or(z.literal('')),
  player2Dni: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  player2Phone: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  player2UserId: z.string().optional().nullable().or(z.literal('')),
}).refine((data) => Boolean((data.player2UserId && data.player2UserId.length > 0) || (data.player2Phone && data.player2Phone.trim().length >= 6)), {
  message: 'Ingresá el teléfono del segundo jugador',
}).refine((data) => !data.player2Phone || data.player2Phone.trim().length === 0 || normalizePhoneForWhatsApp(data.player1Phone) !== normalizePhoneForWhatsApp(data.player2Phone), {
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
            teams: { include: { player1: true, player2: true } },
            matches: {
              include: { team1: true, team2: true, winner: true },
              orderBy: [{ round: 'desc' }, { matchOrder: 'asc' }]
            },
            groups: {
              include: {
                teams: { include: { team: { include: { player1: true, player2: true } } }, orderBy: [{ points: 'desc' }, { matchesWon: 'desc' }, { setsWon: 'desc' }, { setsLost: 'asc' }, { gamesWon: 'desc' }, { gamesLost: 'asc' }] },
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
      data.player1Name = playerSession.name || data.player1Name;
      data.player1LastName = playerSession.lastName || data.player1LastName;
      data.player1Dni = playerSession.dni || data.player1Dni;
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
    const selectedPlayer2 = data.player2UserId && data.player2UserId.length > 0 ? await prisma.user.findFirst({
      where: { id: data.player2UserId, role: 'PLAYER', isActive: true },
    }) : null;
    
    if (data.player2UserId && data.player2UserId.length > 0 && !selectedPlayer2) {
      return { success: false, error: 'El segundo jugador seleccionado ya no está disponible' };
    }

    const phone2 = selectedPlayer2?.phone 
      ? normalizePhoneForWhatsApp(selectedPlayer2.phone) 
      : data.player2Phone 
        ? normalizePhoneForWhatsApp(data.player2Phone) 
        : '';

    if (phone1 === phone2 && phone1) return { success: false, error: 'Los dos jugadores deben ser personas diferentes con teléfonos distintos' };

    const teamId = await prisma.$transaction(async (tx) => {
      // Validar duplicados si hay teléfono definido
      if (phone1 || phone2) {
        const checkPhones = [phone1, phone2].filter(Boolean);
        const duplicate = await tx.tournamentTeam.findFirst({
          where: { 
            categoryId, 
            OR: [
              { phone1: { in: checkPhones } }, 
              { phone2: { in: checkPhones } }
            ] 
          },
        });
        if (duplicate && duplicate.id !== data.teamId) throw new Error('PLAYER_ALREADY_REGISTERED');
      }

      let placeholder = null;
      if (data.teamId && data.teamId.length > 0) {
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

      // --- JUGADOR 1 ---
      const p1Dni = data.player1Dni?.trim() || null;
      let p1 = null;
      if (p1Dni) {
        p1 = await tx.user.findFirst({ where: { dni: p1Dni } });
      }
      if (!p1 && phone1) {
        p1 = await tx.user.findFirst({
          where: {
            OR: [
              { phone: phone1 },
              { phone: data.player1Phone },
              { phone: data.player1Phone.replace(/\D/g, '') }
            ]
          }
        });
      }
      if (!p1) {
        p1 = await tx.user.create({
          data: {
            name: data.player1Name,
            lastName: data.player1LastName || null,
            dni: p1Dni,
            phone: phone1,
            role: 'PLAYER',
            password: null,
          }
        });
      } else {
        const updates: any = {};
        if (p1Dni && !p1.dni) updates.dni = p1Dni;
        if (data.player1LastName && !p1.lastName) updates.lastName = data.player1LastName;
        if (Object.keys(updates).length > 0) {
          p1 = await tx.user.update({ where: { id: p1.id }, data: updates });
        }
      }

      // --- JUGADOR 2 ---
      const p2Dni = data.player2Dni?.trim() || null;
      let p2 = null;
      if (selectedPlayer2) {
        p2 = await tx.user.findUnique({ where: { id: selectedPlayer2.id } });
      }
      if (!p2 && p2Dni) {
        p2 = await tx.user.findFirst({ where: { dni: p2Dni } });
      }
      if (!p2 && phone2) {
        p2 = await tx.user.findFirst({
          where: {
            OR: [
              { phone: phone2 },
              { phone: data.player2Phone || '' },
              { phone: (data.player2Phone || '').replace(/\D/g, '') }
            ]
          }
        });
      }
      if (!p2) {
        // Crear usuario automático con clave en blanco para que quede en el sistema
        p2 = await tx.user.create({
          data: {
            name: data.player2Name,
            lastName: data.player2LastName || null,
            dni: p2Dni,
            phone: phone2 || null,
            role: 'PLAYER',
            password: null,
          }
        });
      } else {
        const updates: any = {};
        if (p2Dni && !p2.dni) updates.dni = p2Dni;
        if (data.player2LastName && !p2.lastName) updates.lastName = data.player2LastName;
        if (phone2 && !p2.phone) updates.phone = phone2;
        if (Object.keys(updates).length > 0) {
          p2 = await tx.user.update({ where: { id: p2.id }, data: updates });
        }
      }

      const p1FullName = `${p1.name || data.player1Name} ${p1.lastName || data.player1LastName || ''}`.trim();
      const p2FullName = `${p2.name || data.player2Name} ${p2.lastName || data.player2LastName || ''}`.trim();

      const teamData = {
        name: data.teamName?.trim() || `${p1FullName} / ${p2FullName}`,
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
    if (!query || query.trim().length < 2) return { success: true, data: [] };

    const cleanQuery = query.trim();

    const users = await prisma.user.findMany({
      where: {
        role: 'PLAYER',
        OR: [
          { name: { contains: cleanQuery } },
          { lastName: { contains: cleanQuery } },
          { dni: { contains: cleanQuery } },
          { phone: { contains: cleanQuery } },
          { email: { contains: cleanQuery } }
        ]
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        dni: true,
        phone: true,
      },
      take: 8
    });

    return { success: true, data: users };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al buscar usuarios' };
  }
}
