'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import type { Prisma, TournamentFormat } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { compareStandings, createFirstRoundSlots, parseScore, validateScore } from '@/lib/tournaments/rules';

// ============================================================
// HELPERS
// ============================================================

function revalidateTournamentPaths() {
  revalidatePath('/admin/torneos');
  revalidatePath('/torneos');
  revalidatePath('/tv');
}

function getRoundNames(totalRounds: number): { [key: number]: string } {
  const roundNames: { [key: number]: string } = {};
  if (totalRounds === 1) { roundNames[1] = 'Final'; }
  else if (totalRounds === 2) { roundNames[1] = 'Semifinal'; roundNames[2] = 'Final'; }
  else if (totalRounds === 3) { roundNames[1] = 'Cuartos de Final'; roundNames[2] = 'Semifinal'; roundNames[3] = 'Final'; }
  else {
    for (let r = 1; r <= totalRounds; r++) {
      if (r === totalRounds) roundNames[r] = 'Final';
      else if (r === totalRounds - 1) roundNames[r] = 'Semifinal';
      else if (r === totalRounds - 2) roundNames[r] = 'Cuartos de Final';
      else roundNames[r] = `Ronda ${r}`;
    }
  }
  return roundNames;
}

function validateMatchScore(scoreTeam1: string, scoreTeam2: string, winnerId: string, team1Id: string, team2Id: string) {
  const result = validateScore(scoreTeam1, scoreTeam2);
  const { team1: s1, team2: s2 } = result;
  if (!result.valid) throw new Error('INVALID_SCORE');
  if (winnerId !== team1Id && winnerId !== team2Id) throw new Error('INVALID_WINNER');
  const expectedWinner = result.winner === 1 ? team1Id : result.winner === 2 ? team2Id : null;
  if (!expectedWinner || expectedWinner !== winnerId) throw new Error('WINNER_SCORE_MISMATCH');
  return { s1, s2 };
}

async function recomputeGroupStandings(tx: Prisma.TransactionClient, groupId: string) {
  const placements = await tx.tournamentGroupTeam.findMany({ where: { groupId } });
  const stats = new Map(placements.map((placement) => [placement.teamId, {
    points: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0,
    setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0,
  }]));
  const matches = await tx.tournamentMatch.findMany({
    where: { groupId, status: 'COMPLETED', winnerId: { not: null } },
  });

  for (const match of matches) {
    if (!match.team1Id || !match.team2Id || !match.winnerId) continue;
    const team1 = stats.get(match.team1Id);
    const team2 = stats.get(match.team2Id);
    if (!team1 || !team2) continue;
    const s1 = parseScore(match.scoreTeam1 || '');
    const s2 = parseScore(match.scoreTeam2 || '');
    team1.matchesPlayed++; team2.matchesPlayed++;
    team1.setsWon += s1.sets; team1.setsLost += s2.sets;
    team2.setsWon += s2.sets; team2.setsLost += s1.sets;
    team1.gamesWon += s1.games; team1.gamesLost += s2.games;
    team2.gamesWon += s2.games; team2.gamesLost += s1.games;
    if (match.winnerId === match.team1Id) {
      team1.matchesWon++; team1.points += 3; team2.matchesLost++;
    } else {
      team2.matchesWon++; team2.points += 3; team1.matchesLost++;
    }
  }

  await Promise.all([...stats.entries()].map(([teamId, data]) =>
    tx.tournamentGroupTeam.update({ where: { groupId_teamId: { groupId, teamId } }, data })
  ));
}

async function getFeederSlot(tx: Prisma.TransactionClient, matchId: string, nextMatchId: string) {
  const feeders = await tx.tournamentMatch.findMany({
    where: { nextMatchId },
    orderBy: [{ round: 'asc' }, { matchOrder: 'asc' }],
    select: { id: true },
  });
  return feeders.findIndex((feeder) => feeder.id === matchId) === 0 ? 'team1Id' : 'team2Id';
}

const DEFAULT_MATCH_DURATION_MINUTES = 90;

function minutesOfDay(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

async function assertCourtAvailable(
  tx: Prisma.TransactionClient,
  courtId: string,
  startTime: Date,
  excludeMatchId?: string,
) {
  if (Number.isNaN(startTime.getTime())) throw new Error('INVALID_START_TIME');
  const endTime = new Date(startTime.getTime() + DEFAULT_MATCH_DURATION_MINUTES * 60_000);
  const court = await tx.court.findFirst({ where: { id: courtId, isActive: true } });
  if (!court) throw new Error('COURT_NOT_AVAILABLE');

  // Solo verificar colisión con OTROS partidos de torneo en la misma cancha
  const tournamentMatch = await tx.tournamentMatch.findFirst({
    where: {
      courtId,
      id: excludeMatchId ? { not: excludeMatchId } : undefined,
      status: { not: 'CANCELLED' },
      startTime: {
        gt: new Date(startTime.getTime() - DEFAULT_MATCH_DURATION_MINUTES * 60_000),
        lt: endTime,
      },
    },
    select: { id: true },
  });

  if (tournamentMatch) throw new Error('COURT_CONFLICT_TOURNAMENT');

  // El torneo tiene prioridad: cancelamos y liberamos turnos regulares en conflicto
  await tx.booking.updateMany({
    where: { 
      courtId, 
      status: { not: 'CANCELLED' }, 
      startTime: { lt: endTime }, 
      endTime: { gt: startTime } 
    },
    data: { status: 'CANCELLED', slotKey: null },
  });
}

function courtError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === 'COURT_CONFLICT_TOURNAMENT' || error.message === 'COURT_CONFLICT') return 'La cancha ya tiene otro partido de torneo programado en ese horario';
  if (error.message === 'OUTSIDE_BUSINESS_HOURS') return 'El partido queda fuera del horario habilitado de la cancha';
  if (error.message === 'COURT_NOT_AVAILABLE') return 'La cancha no existe o está inactiva';
  if (error.message === 'INVALID_START_TIME') return 'La fecha u hora no es válida';
  return null;
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function buildKnockout(
  tx: Prisma.TransactionClient,
  categoryId: string,
  teams: { id: string }[],
) {
  if (teams.length < 2) throw new Error('NOT_ENOUGH_TEAMS');
  const bracketSize = 2 ** Math.ceil(Math.log2(teams.length));
  const totalRounds = Math.log2(bracketSize);
  const roundNames = getRoundNames(totalRounds);
  const firstRoundSlots = createFirstRoundSlots(teams);

  const rounds: string[][] = [];
  const firstRound: string[] = [];
  for (let index = 0; index < firstRoundSlots.length; index++) {
    const [team1, team2] = firstRoundSlots[index];
    const byeWinner = team1 && !team2 ? team1 : team2 && !team1 ? team2 : null;
    const match = await tx.tournamentMatch.create({
      data: {
        categoryId,
        round: 1,
        matchOrder: index + 1,
        roundName: roundNames[1],
        team1Id: team1?.id || null,
        team2Id: team2?.id || null,
        winnerId: byeWinner?.id || null,
        status: byeWinner ? 'COMPLETED' : 'SCHEDULED',
        scoreTeam1: byeWinner ? (team1 ? 'BYE' : '-') : null,
        scoreTeam2: byeWinner ? (team2 ? 'BYE' : '-') : null,
      },
    });
    firstRound.push(match.id);
  }
  rounds.push(firstRound);

  for (let round = 2; round <= totalRounds; round++) {
    const previous = rounds[round - 2];
    const current: string[] = [];
    for (let index = 0; index < previous.length / 2; index++) {
      const match = await tx.tournamentMatch.create({
        data: { categoryId, round, matchOrder: index + 1, roundName: roundNames[round] },
      });
      const feeder1Id = previous[index * 2];
      const feeder2Id = previous[index * 2 + 1];
      await tx.tournamentMatch.updateMany({
        where: { id: { in: [feeder1Id, feeder2Id] } },
        data: { nextMatchId: match.id },
      });
      const feeders = await tx.tournamentMatch.findMany({
        where: { id: { in: [feeder1Id, feeder2Id] } },
        orderBy: { matchOrder: 'asc' },
      });
      await tx.tournamentMatch.update({
        where: { id: match.id },
        data: { team1Id: feeders[0]?.winnerId || null, team2Id: feeders[1]?.winnerId || null },
      });
      current.push(match.id);
    }
    rounds.push(current);
  }

  return { bracketSize, byes: bracketSize - teams.length };
}

// ============================================================
// CREAR CATEGORÍA
// ============================================================
export async function createCategory(tournamentId: string, name: string, level: number | null, format: TournamentFormat) {
  try {
    await requireAdmin();
    await prisma.tournamentCategory.create({
      data: { tournamentId, name, level, format }
    });
    revalidatePath(`/admin/torneos/${tournamentId}`);
    revalidatePath('/torneos');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al crear categoría' };
  }
}

// ============================================================
// RENOMBRAR CATEGORÍA (#9)
// ============================================================
export async function renameCategory(categoryId: string, newName: string) {
  try {
    await requireAdmin();
    if (!newName.trim()) return { success: false, error: 'El nombre no puede estar vacío' };
    
    const cat = await prisma.tournamentCategory.update({
      where: { id: categoryId },
      data: { name: newName.trim() }
    });
    revalidatePath(`/admin/torneos/${cat.tournamentId}`);
    revalidatePath('/torneos');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al renombrar categoría' };
  }
}

// ============================================================
// ELIMINAR CATEGORÍA
// ============================================================
export async function deleteCategory(categoryId: string) {
  try {
    await requireAdmin();
    const cat = await prisma.tournamentCategory.findUnique({ where: { id: categoryId } });
    await prisma.tournamentCategory.delete({ where: { id: categoryId } });
    if (cat) {
      revalidatePath(`/admin/torneos/${cat.tournamentId}`);
      revalidatePath('/torneos');
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al eliminar categoría' };
  }
}

// ============================================================
// ELIMINAR EQUIPO (FIX #6 — revalidatePath)
// ============================================================
export async function deleteTeam(teamId: string) {
  try {
    await requireAdmin();
    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
      include: { category: true, matchesAsTeam1: { select: { id: true } }, matchesAsTeam2: { select: { id: true } } }
    });
    if (!team) return { success: false, error: 'Equipo no encontrado' };
    if (team.matchesAsTeam1.length || team.matchesAsTeam2.length) {
      return { success: false, error: 'La pareja ya está incluida en el fixture. Regenerá las zonas o el cuadro antes de eliminarla.' };
    }
    await prisma.tournamentTeam.delete({ where: { id: teamId } });
    if (team) {
      revalidatePath(`/admin/torneos/${team.category.tournamentId}`);
      revalidatePath('/torneos');
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al eliminar equipo' };
  }
}

// ============================================================
// TOGGLE EQUIPO PAGADO (#8)
// ============================================================
export async function toggleTeamPaid(teamId: string) {
  try {
    await requireAdmin();
    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
      include: { category: true }
    });
    if (!team) return { success: false, error: 'Equipo no encontrado' };
    
    await prisma.tournamentTeam.update({
      where: { id: teamId },
      data: { isPaid: !team.isPaid }
    });
    revalidatePath(`/admin/torneos/${team.category.tournamentId}`);
    return { success: true, isPaid: !team.isPaid };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al cambiar estado de pago' };
  }
}

// ============================================================
// GENERADOR COMPLETO DE CUADRO ELIMINACIÓN DIRECTA
// ============================================================
export async function generateKnockoutBracket(categoryId: string) {
  try {
    await requireAdmin();
    const category = await prisma.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: { teams: { include: { player1: true } }, matches: true }
    });

    if (!category) return { success: false, error: 'Categoría no encontrada.' };
    const teams = category.teams.filter((team) => team.player1.phone !== 'DUMMY_PLAZA');
    if (teams.length < 2) return { success: false, error: 'Se necesitan al menos 2 parejas confirmadas.' };
    const result = await prisma.$transaction(async (tx) => {
      await tx.tournamentMatch.deleteMany({ where: { categoryId, groupId: null } });
      return buildKnockout(tx, categoryId, shuffled(teams));
    });

    revalidateTournamentPaths();
    return { success: true, message: `Cuadro de ${result.bracketSize} generado con ${teams.length} parejas (${result.byes} pases libres).` };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error generando llaves' };
  }
}

// ============================================================
// MESA DE CONTROL: ACTUALIZAR RESULTADO (FIX #1 — stats de zona)
// ============================================================
export async function updateMatchScore(matchId: string, scoreTeam1: string, scoreTeam2: string, winnerId: string) {
  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const match = await tx.tournamentMatch.findUnique({ where: { id: matchId } });
      if (!match || !match.team1Id || !match.team2Id) throw new Error('MATCH_NOT_READY');
      if (match.status === 'COMPLETED') throw new Error('MATCH_ALREADY_COMPLETED');
      validateMatchScore(scoreTeam1, scoreTeam2, winnerId, match.team1Id, match.team2Id);

      await tx.tournamentMatch.update({
        where: { id: matchId },
        data: { scoreTeam1: scoreTeam1.trim(), scoreTeam2: scoreTeam2.trim(), winnerId, status: 'COMPLETED' },
      });

      if (match.groupId) await recomputeGroupStandings(tx, match.groupId);
      if (match.nextMatchId) {
        const nextMatch = await tx.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
        if (nextMatch?.status !== 'SCHEDULED') throw new Error('DOWNSTREAM_ALREADY_STARTED');
        const slot = await getFeederSlot(tx, match.id, match.nextMatchId);
        if (nextMatch?.[slot] && nextMatch[slot] !== winnerId) throw new Error('DOWNSTREAM_SLOT_OCCUPIED');
        await tx.tournamentMatch.update({ where: { id: match.nextMatchId }, data: { [slot]: winnerId } });
      }
    });

    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      if (error.message === 'INVALID_SCORE') return { success: false, error: 'El marcador debe tener sets espejados, por ejemplo 6-4 / 7-5 y 4-6 / 5-7' };
      if (error.message === 'INVALID_WINNER' || error.message === 'WINNER_SCORE_MISMATCH') return { success: false, error: 'El ganador no coincide con el marcador' };
      if (error.message === 'MATCH_ALREADY_COMPLETED') return { success: false, error: 'El partido ya está completado. Revertí el resultado antes de corregirlo.' };
      if (error.message === 'DOWNSTREAM_ALREADY_STARTED') return { success: false, error: 'La ronda siguiente ya comenzó y no puede modificarse automáticamente' };
      if (error.message === 'DOWNSTREAM_SLOT_OCCUPIED') return { success: false, error: 'El cruce siguiente fue modificado manualmente. Liberá esa plaza antes de guardar.' };
      if (error.message === 'MATCH_NOT_READY') return { success: false, error: 'El partido todavía no tiene las dos parejas definidas' };
    }
    return { success: false, error: 'Error al actualizar resultado' };
  }
}

// ============================================================
// RESETEAR RESULTADO DE PARTIDO (#12)
// ============================================================
export async function resetMatchResult(matchId: string) {
  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const match = await tx.tournamentMatch.findUnique({ where: { id: matchId } });
      if (!match) throw new Error('MATCH_NOT_FOUND');
      if (match.status !== 'COMPLETED') throw new Error('MATCH_NOT_COMPLETED');
      if (match.nextMatchId) {
        const nextMatch = await tx.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
        if (nextMatch && (nextMatch.status !== 'SCHEDULED' || nextMatch.winnerId)) throw new Error('DOWNSTREAM_ALREADY_STARTED');
        const slot = await getFeederSlot(tx, match.id, match.nextMatchId);
        await tx.tournamentMatch.update({ where: { id: match.nextMatchId }, data: { [slot]: null } });
      }
      await tx.tournamentMatch.update({
        where: { id: matchId },
        data: { scoreTeam1: null, scoreTeam2: null, winnerId: null, status: 'SCHEDULED' },
      });
      if (match.groupId) await recomputeGroupStandings(tx, match.groupId);
    });

    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'DOWNSTREAM_ALREADY_STARTED') {
      return { success: false, error: 'No se puede revertir porque la ronda siguiente ya comenzó' };
    }
    return { success: false, error: 'Error al resetear resultado' };
  }
}

// ============================================================
// MARCAR PARTIDO COMO EN PROGRESO
// ============================================================
export async function setMatchInProgress(matchId: string) {
  try {
    await requireAdmin();
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match?.team1Id || !match.team2Id || match.status !== 'SCHEDULED') {
      return { success: false, error: 'El partido no está listo para comenzar' };
    }
    await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: { status: 'IN_PROGRESS' }
    });
    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al actualizar estado' };
  }
}

// ============================================================
// ASIGNAR CANCHA Y HORARIO A PARTIDO (#13)
// ============================================================
export async function updateMatchAssignment(matchId: string, data: { courtId?: string | null; startTime?: string | null }) {
  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const current = await tx.tournamentMatch.findUnique({ where: { id: matchId } });
      if (!current) throw new Error('MATCH_NOT_FOUND');
      const courtId = data.courtId === undefined ? current.courtId : data.courtId || null;
      const startTime = data.startTime === undefined ? current.startTime : data.startTime ? new Date(data.startTime) : null;
      if ((courtId && !startTime) || (!courtId && startTime)) throw new Error('INCOMPLETE_ASSIGNMENT');
      if (courtId && startTime) await assertCourtAvailable(tx, courtId, startTime, matchId);
      await tx.tournamentMatch.update({ where: { id: matchId }, data: { courtId, startTime } });
    }, { isolationLevel: 'Serializable' });
    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    const message = courtError(error);
    if (message) return { success: false, error: message };
    if (error instanceof Error && error.message === 'INCOMPLETE_ASSIGNMENT') {
      return { success: false, error: 'Seleccioná cancha y horario juntos' };
    }
    return { success: false, error: 'Error al asignar cancha/horario' };
  }
}

export async function autoScheduleKnockout(categoryId: string) {
  try {
    await requireAdmin();
    const category = await prisma.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: { tournament: true, matches: { where: { groupId: null }, orderBy: [{ round: 'asc' }, { matchOrder: 'asc' }] } },
    });
    if (!category || !category.matches.length) return { success: false, error: 'Primero generá el cuadro eliminatorio' };
    if (category.matches.some((match) => match.status === 'IN_PROGRESS')) {
      return { success: false, error: 'No se puede reprogramar mientras haya partidos en juego' };
    }

    const courts = await prisma.court.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    if (!courts.length) return { success: false, error: 'No hay canchas activas' };
    const tournamentEnd = new Date(category.tournament.endDate);
    tournamentEnd.setDate(tournamentEnd.getDate() + 1);

    let scheduledCount = 0;
    await prisma.$transaction(async (tx) => {
      await tx.tournamentMatch.updateMany({
        where: { categoryId, groupId: null, status: 'SCHEDULED' },
        data: { courtId: null, startTime: null },
      });
      const rounds = [...new Set(category.matches.map((match) => match.round))].sort((a, b) => a - b);
      let roundStart = new Date(category.tournament.startDate);
      roundStart.setHours(8, 0, 0, 0);

      for (const round of rounds) {
        const matches = category.matches.filter((match) => match.round === round && match.status !== 'COMPLETED');
        let latestStart = new Date(roundStart);
        for (const match of matches) {
          let candidate = new Date(roundStart);
          let assigned = false;
          for (let attempt = 0; attempt < 960 && candidate < tournamentEnd && !assigned; attempt++) {
            for (const court of courts) {
              try {
                await assertCourtAvailable(tx, court.id, candidate, match.id);
                await tx.tournamentMatch.update({
                  where: { id: match.id },
                  data: { courtId: court.id, startTime: candidate },
                });
                latestStart = candidate > latestStart ? new Date(candidate) : latestStart;
                scheduledCount++;
                assigned = true;
                break;
              } catch (error) {
                if (!courtError(error)) throw error;
              }
            }
            if (!assigned) candidate = new Date(candidate.getTime() + 30 * 60_000);
          }
          if (!assigned) throw new Error('NO_SCHEDULE_SOLUTION');
        }
        // A new round starts after match duration plus a full match of rest.
        roundStart = new Date(latestStart.getTime() + DEFAULT_MATCH_DURATION_MINUTES * 2 * 60_000);
      }
    }, { isolationLevel: 'Serializable', timeout: 30_000 });

    revalidateTournamentPaths();
    return { success: true, message: `${scheduledCount} partidos programados sin conflictos.` };
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'NO_SCHEDULE_SOLUTION') {
      return { success: false, error: 'No existe una combinación libre dentro de las fechas del torneo. Ampliá las fechas o liberá canchas.' };
    }
    return { success: false, error: 'No se pudo generar el cronograma automático' };
  }
}

// ============================================================
// GENERAR ZONAS Y PLAZAS CON HORARIOS
// ============================================================
export async function generateZonesAndSchedule(categoryId: string, config: {
  numZones: number;
  teamsPerZone: number;
  zonesConfig: {
    name: string;
    startTime: string; // ISO string
    intervalMinutes: number;
    courtId: string | null;
  }[];
}) {
  try {
    await requireAdmin();
    if (!Number.isInteger(config.numZones) || config.numZones < 1 || config.numZones > 16) throw new Error('INVALID_ZONE_CONFIG');
    if (!Number.isInteger(config.teamsPerZone) || config.teamsPerZone < 2 || config.teamsPerZone > 12) throw new Error('INVALID_ZONE_CONFIG');
    if (config.zonesConfig.length !== config.numZones) throw new Error('INVALID_ZONE_CONFIG');
    if (new Set(config.zonesConfig.map((zone) => zone.name.trim().toLocaleLowerCase())).size !== config.numZones) {
      throw new Error('DUPLICATE_ZONE_NAMES');
    }

    const category = await prisma.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: { teams: { include: { player1: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!category) throw new Error('CATEGORY_NOT_FOUND');

    // 1. Obtener o crear Dummy User para Plazas
    let dummyUser = await prisma.user.findFirst({ where: { phone: 'DUMMY_PLAZA' } });
    if (!dummyUser) {
      dummyUser = await prisma.user.create({
        data: {
          name: 'Plaza Libre',
          phone: 'DUMMY_PLAZA',
          role: 'PLAYER'
        }
      });
    }
    const dId = dummyUser.id;

    const realTeams = category.teams.filter((team) => team.player1.phone !== 'DUMMY_PLAZA');
    if (realTeams.length > config.numZones * config.teamsPerZone) throw new Error('NOT_ENOUGH_SLOTS');

    await prisma.$transaction(async (tx) => {
      await tx.tournamentGroup.deleteMany({ where: { categoryId } });
      await tx.tournamentMatch.deleteMany({ where: { categoryId } });
      await tx.tournamentTeam.deleteMany({ where: { categoryId, player1Id: dId } });

      const zoneTeams: (typeof realTeams)[] = Array.from({ length: config.numZones }, () => []);
      realTeams.forEach((team, index) => {
        const cycle = Math.floor(index / config.numZones);
        const offset = index % config.numZones;
        const zoneIndex = cycle % 2 === 0 ? offset : config.numZones - 1 - offset;
        zoneTeams[zoneIndex].push(team);
      });

      for (let z = 0; z < config.numZones; z++) {
        const zoneConf = config.zonesConfig[z];
        if (!zoneConf.name.trim() || !zoneConf.courtId || zoneConf.intervalMinutes < DEFAULT_MATCH_DURATION_MINUTES) {
          throw new Error('INVALID_ZONE_CONFIG');
        }
        const zoneStart = new Date(zoneConf.startTime);
        if (Number.isNaN(zoneStart.getTime())) throw new Error('INVALID_START_TIME');
        const group = await tx.tournamentGroup.create({
          data: { categoryId, name: zoneConf.name.trim() }
        });

        const createdTeams: { id: string }[] = zoneTeams[z].map((team) => ({ id: team.id }));
        while (createdTeams.length < config.teamsPerZone) {
          const p = createdTeams.length + 1;
          const team = await tx.tournamentTeam.create({
            data: { categoryId, name: `Plaza libre ${zoneConf.name}-${p}`, player1Id: dId }
          });
          createdTeams.push(team);
        }
        await tx.tournamentGroupTeam.createMany({
          data: createdTeams.map((team) => ({ groupId: group.id, teamId: team.id })),
        });

        const t: ({ id: string } | null)[] = [...createdTeams];
        if (t.length % 2 !== 0) {
          t.push(null);
        }

        const matches: { t1: { id: string }; t2: { id: string }; round: number }[] = [];
        const n = t.length;
        for (let round = 0; round < n - 1; round++) {
          for (let i = 0; i < n / 2; i++) {
          const t1 = t[i];
          const t2 = t[n - 1 - i];
            if (t1 && t2) {
              matches.push({ t1, t2, round: round + 1 });
            }
          }
          t.splice(1, 0, t.pop()!);
        }

        let matchIndex = 0;
        for (const m of matches) {
          const matchStart = new Date(zoneStart);
          matchStart.setMinutes(matchStart.getMinutes() + matchIndex * zoneConf.intervalMinutes + (m.round - 1) * 30);
          await assertCourtAvailable(tx, zoneConf.courtId, matchStart);
          await tx.tournamentMatch.create({
            data: {
              categoryId,
              groupId: group.id,
              round: m.round,
              matchOrder: matchIndex + 1,
              team1Id: m.t1.id,
              team2Id: m.t2.id,
              roundName: `Zona - Fecha ${m.round}`,
              startTime: matchStart,
              courtId: zoneConf.courtId,
            }
          });
          matchIndex++;
        }
      }
    });

    revalidateTournamentPaths();
    return { success: true };
  } catch (error: unknown) {
    console.error('Error in generateZonesAndSchedule:', error);
    const message = courtError(error);
    if (message) return { success: false, error: message };
    if (error instanceof Error && error.message === 'NOT_ENOUGH_SLOTS') return { success: false, error: 'La capacidad de las zonas es menor que las parejas ya inscriptas' };
    if (error instanceof Error && error.message === 'DUPLICATE_ZONE_NAMES') return { success: false, error: 'Los nombres de las zonas no pueden repetirse' };
    if (error instanceof Error && error.message === 'INVALID_ZONE_CONFIG') return { success: false, error: 'Revisá cantidad de zonas, plazas, cancha e intervalo mínimo de 90 minutos' };
    return { success: false, error: 'Error al generar zonas y fixture' };
  }
}

// ============================================================
// GENERADOR DE CUADRO INTELIGENTE DESDE ZONAS (FIX #5 — BYEs)
// ============================================================
export async function generateKnockoutFromZones(categoryId: string) {
  try {
    await requireAdmin();
    const category = await prisma.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: {
        matches: true,
        groups: {
          include: {
            teams: { include: { team: { include: { player1: true } } } }
          }
        }
      }
    });

    if (!category) return { success: false, error: 'Categoría no encontrada.' };
    if (!category.groups.length) return { success: false, error: 'Primero tenés que generar las zonas.' };
    const groupMatches = category.matches.filter((match) => match.groupId);
    if (!groupMatches.length || groupMatches.some((match) => match.status !== 'COMPLETED')) {
      return { success: false, error: 'Todos los partidos de zona deben estar completados.' };
    }

    const rankedGroups = category.groups.map((group) => group.teams
      .filter((placement) => placement.team.player1.phone !== 'DUMMY_PLAZA')
      .sort(compareStandings));
    if (rankedGroups.some((group) => group.length < 2)) {
      return { success: false, error: 'Cada zona necesita al menos dos parejas confirmadas.' };
    }

    const firsts = rankedGroups.map((group) => group[0].team);
    const rotatedSeconds = rankedGroups.map((_, index) => rankedGroups[(index + 1) % rankedGroups.length][1].team);
    const bracketMatches = (2 ** Math.ceil(Math.log2(firsts.length + rotatedSeconds.length))) / 2;
    const sideOne = [...firsts, ...rotatedSeconds.slice(0, Math.max(0, bracketMatches - firsts.length))];
    const sideTwo = rotatedSeconds.slice(Math.max(0, bracketMatches - firsts.length));
    const qualifiedTeams = [...sideOne, ...sideTwo];
    const result = await prisma.$transaction(async (tx) => {
      await tx.tournamentMatch.deleteMany({ where: { categoryId, groupId: null } });
      return buildKnockout(tx, categoryId, qualifiedTeams);
    });

    revalidateTournamentPaths();
    return { success: true, message: `Cuadro de ${result.bracketSize} generado desde las posiciones de zona.` };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error generando llaves desde zonas' };
  }
}

// ============================================================
// ASIGNACIÓN MANUAL DE EQUIPO EN EL CUADRO
// ============================================================
export async function updateMatchTeam(matchId: string, slot: 'team1Id' | 'team2Id', teamId: string | null) {
  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const match = await tx.tournamentMatch.findUnique({ where: { id: matchId } });
      if (!match || match.status !== 'SCHEDULED' || match.winnerId) throw new Error('MATCH_LOCKED');
      if (teamId) {
        const team = await tx.tournamentTeam.findFirst({
          where: { id: teamId, categoryId: match.categoryId, player1: { phone: { not: 'DUMMY_PLAZA' } } },
        });
        if (!team) throw new Error('INVALID_TEAM');
      }
      await tx.tournamentMatch.update({ where: { id: matchId }, data: { [slot]: teamId } });
    });
    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'MATCH_LOCKED') return { success: false, error: 'El partido ya está bloqueado por su estado o resultado' };
    return { success: false, error: 'Error al cambiar equipo' };
  }
}
