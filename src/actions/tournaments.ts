'use server';

import { prisma } from '@/lib/prisma';
import { tournamentSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';

export async function getTournaments() {
  try {
    await requireAdmin();
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { categories: true }
        }
      }
    });
    return { success: true, data: tournaments };
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return { success: false, error: 'Error al cargar torneos' };
  }
}

export async function getTournamentFull(id: string) {
  try {
    await requireAdmin();
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            teams: {
              include: { player1: true, player2: true }
            },
            matches: {
              include: { team1: true, team2: true, winner: true, group: true },
              orderBy: [{ round: 'asc' }, { matchOrder: 'asc' }]
            },
            groups: {
              include: {
                teams: { include: { team: true }, orderBy: [{ points: 'desc' }, { matchesWon: 'desc' }, { setsWon: 'desc' }, { setsLost: 'asc' }, { gamesWon: 'desc' }, { gamesLost: 'asc' }] },
                matches: { include: { team1: true, team2: true } }
              }
            }
          }
        }
      }
    });
    return { success: true, data: tournament };
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return { success: false, error: 'Error al cargar torneo' };
  }
}

export async function createTournament(data: unknown) {
  await requireAdmin();
  const result = tournamentSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error.flatten() };
  }

  const { name, startDate, endDate, entryFee, isPublished, requireDeposit, depositAmount, format, maxTeams } = result.data;

  try {
    const tournament = await prisma.tournament.create({
      data: {
        name,
        startDate,
        endDate,
        entryFee,
        status: 'DRAFT',
        isPublished,
        requireDeposit,
        depositAmount,
        format,
        maxTeams,
      }
    });

    revalidatePath('/admin/torneos');
    revalidatePath('/torneos');
    
    return { success: true, tournament };
  } catch (error) {
    console.error('Error creando torneo:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}

export async function updateTournament(id: string, data: unknown) {
  await requireAdmin();
  const result = tournamentSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error.flatten() };
  }

  const { name, startDate, endDate, entryFee, isPublished, requireDeposit, depositAmount, format, maxTeams } = result.data;

  try {
    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        name,
        startDate,
        endDate,
        entryFee,
        isPublished,
        requireDeposit,
        depositAmount,
        format,
        maxTeams,
      }
    });

    revalidatePath('/admin/torneos');
    revalidatePath(`/admin/torneos/${id}`);
    revalidatePath('/torneos');
    revalidatePath(`/torneos/${id}`);
    
    return { success: true, tournament };
  } catch (error) {
    console.error('Error actualizando torneo:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}

// Acción dedicada para cambiar el status (sin pasar por el schema completo)
const VALID_STATUSES = ['DRAFT', 'REGISTRATION', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

export async function updateTournamentStatus(id: string, status: string) {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status as ValidStatus)) {
    return { success: false, error: `Estado inválido: ${status}` };
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: { include: { teams: { include: { player1: true } }, matches: true } },
      },
    });
    if (!tournament) return { success: false, error: 'Torneo no encontrado' };
    const allowed: Record<ValidStatus, ValidStatus[]> = {
      DRAFT: ['REGISTRATION', 'REGISTRATION_CLOSED'],
      REGISTRATION: ['DRAFT', 'REGISTRATION_CLOSED', 'ONGOING'],
      REGISTRATION_CLOSED: ['REGISTRATION', 'ONGOING', 'DRAFT'],
      ONGOING: ['REGISTRATION_CLOSED', 'COMPLETED', 'REGISTRATION'],
      COMPLETED: ['ONGOING'],
    };
    if (status !== tournament.status && !allowed[tournament.status as ValidStatus]?.includes(status as ValidStatus)) {
      return { success: false, error: `No se puede pasar de ${tournament.status} a ${status}` };
    }
    if (status === 'ONGOING') {
      if (!tournament.categories.length) return { success: false, error: 'Creá al menos una categoría antes de iniciar' };
      const incompleteCategory = tournament.categories.find((category) =>
        category.teams.filter((team) => team.player1.phone !== 'DUMMY_PLAZA').length < 2
      );
      if (incompleteCategory) return { success: false, error: `La categoría ${incompleteCategory.name} necesita al menos dos parejas` };
    }
    if (status === 'COMPLETED') {
      const matches = tournament.categories.flatMap((category) => category.matches);
      if (!matches.length || matches.some((match) => match.status !== 'COMPLETED')) {
        return { success: false, error: 'No se puede finalizar mientras haya partidos pendientes' };
      }
    }
    await prisma.tournament.update({
      where: { id },
      data: { status: status as ValidStatus }
    });
    revalidatePath('/admin/torneos');
    revalidatePath(`/admin/torneos/${id}`);
    revalidatePath('/torneos');
    revalidatePath(`/torneos/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error actualizando estado:', error);
    return { success: false, error: 'Error al cambiar estado' };
  }
}

export async function deleteTournament(id: string) {
  try {
    await requireAdmin();
    // Eliminar en cascada: primero los datos hijos que no tienen onDelete: Cascade
    await prisma.$transaction(async (tx) => {
      const categories = await tx.tournamentCategory.findMany({ where: { tournamentId: id }, select: { id: true } });
      for (const category of categories) {
        await tx.tournamentMatch.deleteMany({ where: { categoryId: category.id } });
        await tx.tournamentGroupTeam.deleteMany({ where: { group: { categoryId: category.id } } });
        await tx.tournamentGroup.deleteMany({ where: { categoryId: category.id } });
        await tx.tournamentTeam.deleteMany({ where: { categoryId: category.id } });
      }
      await tx.tournamentCategory.deleteMany({ where: { tournamentId: id } });
      await tx.tournament.delete({ where: { id } });
    });
    
    revalidatePath('/admin/torneos');
    revalidatePath('/torneos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return { success: false, error: 'Error al eliminar torneo' };
  }
}

// ============================================================
// WIZARD INTELIGENTE: CREAR TORNEO Y CATEGORÍA CON FIXTURE Y PLAZAS
// ============================================================
export interface TournamentWizardPayload {
  tournamentId?: string;
  name: string;
  startDate: string;
  endDate: string;
  entryFee: number;
  categoryType: 'CATEGORIA_UNICA' | 'SUMA';
  baseCategory?: string;
  targetSum?: number;
  courtIds: string[];
  numZones: number;
  teamsPerZone: number;
  startTime: string; // "YYYY-MM-DDTHH:mm"
  matchDurationMinutes: number;
}

export async function createTournamentWithWizard(payload: TournamentWizardPayload) {
  try {
    await requireAdmin();

    const {
      tournamentId,
      name,
      startDate,
      endDate,
      entryFee,
      categoryType,
      baseCategory,
      targetSum,
      courtIds,
      numZones,
      teamsPerZone,
      startTime,
      matchDurationMinutes
    } = payload;

    if (!tournamentId && !name?.trim()) {
      return { success: false, error: 'El nombre del torneo es obligatorio' };
    }
    if (!courtIds || courtIds.length === 0) {
      return { success: false, error: 'Debes seleccionar al menos una cancha para el torneo' };
    }
    if (numZones < 1 || numZones > 16) {
      return { success: false, error: 'Cantidad de zonas inválida (entre 1 y 16)' };
    }
    if (teamsPerZone < 2 || teamsPerZone > 8) {
      return { success: false, error: 'Equipos por zona inválidos (entre 2 y 8)' };
    }
    const duration = matchDurationMinutes && matchDurationMinutes >= 15 ? matchDurationMinutes : 45;

    // Calcular nombre de categoría
    let categoryName = '';
    if (categoryType === 'CATEGORIA_UNICA') {
      const base = baseCategory || '7ma';
      categoryName = `${base} Categoría`;
    } else {
      const sum = targetSum || 15;
      categoryName = `Suma ${sum}`;
    }

    const startDateTime = new Date(startTime);
    if (Number.isNaN(startDateTime.getTime())) {
      return { success: false, error: 'Fecha y hora de inicio de partidos inválida' };
    }

    // 1. Obtener o crear Dummy User para Plazas de Torneo
    let dummyUser = await prisma.user.findFirst({ where: { phone: 'DUMMY_PLAZA' } });
    if (!dummyUser) {
      dummyUser = await prisma.user.create({
        data: {
          name: 'Plaza Libre',
          phone: 'DUMMY_PLAZA',
          role: 'PLAYER',
        }
      });
    }
    const dId = dummyUser.id;

    const result = await prisma.$transaction(async (tx) => {
      let finalTournamentId = tournamentId;

      if (!finalTournamentId) {
        const newTournament = await tx.tournament.create({
          data: {
            name: name.trim(),
            startDate: new Date(`${startDate}T00:00:00`),
            endDate: new Date(`${endDate}T23:59:59`),
            entryFee: Number(entryFee) || 0,
            status: 'REGISTRATION',
            isPublished: true,
            format: 'MIXED',
            maxTeams: numZones * teamsPerZone,
          }
        });
        finalTournamentId = newTournament.id;
      } else {
        // Actualizar maxTeams sumando si corresponde
        await tx.tournament.update({
          where: { id: finalTournamentId },
          data: {
            maxTeams: { increment: numZones * teamsPerZone }
          }
        });
      }

      // 2. Crear Categoría
      const category = await tx.tournamentCategory.create({
        data: {
          tournamentId: finalTournamentId,
          name: categoryName,
          format: 'MIXED',
          isZonesPublished: false, // En borrador hasta que el admin decida publicarlas
          categoryType: categoryType || 'CATEGORIA_UNICA',
          baseCategory: categoryType === 'CATEGORIA_UNICA' ? (baseCategory || '7ma') : null,
          targetSum: categoryType === 'SUMA' ? (Number(targetSum) || 15) : null,
        }
      });

      // 3. Crear Zonas, Plazas y estructurar Partidos
      type ZoneMatchMeta = {
        groupId: string;
        round: number;
        t1Id: string;
        t2Id: string;
      };

      const matchesByRound: Map<number, ZoneMatchMeta[]> = new Map();
      let maxRound = 0;

      for (let z = 0; z < numZones; z++) {
        const groupLetter = String.fromCharCode(65 + z);
        const groupName = `Zona ${groupLetter}`;

        const group = await tx.tournamentGroup.create({
          data: {
            categoryId: category.id,
            name: groupName,
          }
        });

        // Crear parejas/plazas libres para esta zona
        const dummyTeams: { id: string }[] = [];
        for (let p = 1; p <= teamsPerZone; p++) {
          const team = await tx.tournamentTeam.create({
            data: {
              categoryId: category.id,
              name: `Plaza libre ${groupLetter}-${p}`,
              player1Id: dId,
              preferredGroupId: group.id,
            }
          });
          dummyTeams.push(team);

          await tx.tournamentGroupTeam.create({
            data: {
              groupId: group.id,
              teamId: team.id,
            }
          });
        }

        // Algoritmo Round-Robin para generar los cruces
        const teamArray: ({ id: string } | null)[] = [...dummyTeams];
        if (teamArray.length % 2 !== 0) teamArray.push(null);
        const n = teamArray.length;

        for (let r = 0; r < n - 1; r++) {
          const roundNum = r + 1;
          if (roundNum > maxRound) maxRound = roundNum;
          if (!matchesByRound.has(roundNum)) matchesByRound.set(roundNum, []);

          for (let i = 0; i < n / 2; i++) {
            const t1 = teamArray[i];
            const t2 = teamArray[n - 1 - i];
            if (t1 && t2) {
              matchesByRound.get(roundNum)!.push({
                groupId: group.id,
                round: roundNum,
                t1Id: t1.id,
                t2Id: t2.id,
              });
            }
          }
          teamArray.splice(1, 0, teamArray.pop()!);
        }
      }

      // 4. Programación inteligente de horarios y canchas
      const courtAvailability = new Map<string, Date>();
      for (const courtId of courtIds) {
        courtAvailability.set(courtId, new Date(startDateTime));
      }

      let matchOrder = 1;
      const createdMatchesInfo: { courtId: string; startTime: Date }[] = [];

      for (let r = 1; r <= maxRound; r++) {
        const roundMatches = matchesByRound.get(r) || [];

        for (const m of roundMatches) {
          // Seleccionar la cancha libre más temprana
          let bestCourtId = courtIds[0];
          let earliestTime = courtAvailability.get(bestCourtId)!;

          for (const cId of courtIds) {
            const cTime = courtAvailability.get(cId)!;
            if (cTime.getTime() < earliestTime.getTime()) {
              earliestTime = cTime;
              bestCourtId = cId;
            }
          }

          const matchStart = new Date(earliestTime);
          const matchEnd = new Date(matchStart.getTime() + duration * 60_000);

          await tx.tournamentMatch.create({
            data: {
              categoryId: category.id,
              groupId: m.groupId,
              round: m.round,
              matchOrder: matchOrder++,
              team1Id: m.t1Id,
              team2Id: m.t2Id,
              roundName: `Zona - Fecha ${m.round}`,
              startTime: matchStart,
              courtId: bestCourtId,
              status: 'SCHEDULED'
            }
          });

          createdMatchesInfo.push({ courtId: bestCourtId, startTime: matchStart });
          courtAvailability.set(bestCourtId, matchEnd);
        }
      }

      // 5. Cancelar turnos normales en conflicto
      for (const mInfo of createdMatchesInfo) {
        const mEnd = new Date(mInfo.startTime.getTime() + duration * 60_000);
        await tx.booking.updateMany({
          where: {
            courtId: mInfo.courtId,
            status: { not: 'CANCELLED' },
            startTime: { lt: mEnd },
            endTime: { gt: mInfo.startTime },
          },
          data: { status: 'CANCELLED', slotKey: null }
        });
      }

      return { tournamentId: finalTournamentId, categoryId: category.id };
    }, { timeout: 35000 });

    revalidatePath('/admin/torneos');
    revalidatePath(`/admin/torneos/${result.tournamentId}`);
    revalidatePath('/torneos');
    revalidatePath(`/torneos/${result.tournamentId}`);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error createTournamentWithWizard:', error);
    return { success: false, error: (error as Error)?.message || 'Error al generar el torneo con el asistente inteligente' };
  }
}
