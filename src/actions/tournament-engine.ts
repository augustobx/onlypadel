'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ============================================================
// HELPERS
// ============================================================

/** Parsea un score en formato "6-4 / 7-5 / 6-2" y devuelve sets y games */
function parseScore(score: string): { sets: number; games: number; setDetails: [number, number][] } {
  if (!score || score === '-' || score === 'BYE') return { sets: 0, games: 0, setDetails: [] };
  
  const setDetails: [number, number][] = [];
  let totalSets = 0;
  let totalGames = 0;
  
  // Soporta "6-4 / 7-5" o "6-4 7-5" o "6/4 7/5"
  const parts = score.split(/\s*\/\s*|\s+/).filter(Boolean);
  
  for (const part of parts) {
    const match = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (match) {
      const g1 = parseInt(match[1]);
      const g2 = parseInt(match[2]);
      setDetails.push([g1, g2]);
      totalGames += g1;
      if (g1 > g2) totalSets++;
    }
  }
  
  return { sets: totalSets, games: totalGames, setDetails };
}

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

// ============================================================
// CREAR CATEGORÍA
// ============================================================
export async function createCategory(tournamentId: string, name: string, level: number | null, format: any) {
  try {
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
    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
      include: { category: true }
    });
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
    const category = await prisma.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: { teams: true, matches: true }
    });

    if (!category) return { success: false, error: 'Categoría no encontrada.' };
    if (category.teams.length < 2) return { success: false, error: 'Se necesitan al menos 2 parejas inscriptas.' };

    // Limpiar partidos previos si se re-genera
    if (category.matches.length > 0) {
      await prisma.tournamentMatch.deleteMany({ where: { categoryId } });
    }

    const teams = [...category.teams].sort(() => Math.random() - 0.5); // Shuffle
    const numTeams = teams.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(numTeams)));
    const totalRounds = Math.ceil(Math.log2(bracketSize));
    const byes = bracketSize - numTeams;
    const roundNames = getRoundNames(totalRounds);

    // Ronda 1 — primera ronda con posibles byes
    const round1Matches: string[] = [];
    let teamIdx = 0;

    const matchesPerRound1 = bracketSize / 2;
    for (let i = 0; i < matchesPerRound1; i++) {
      const t1 = teams[teamIdx] || null;
      teamIdx++;
      const t2 = teamIdx < numTeams ? teams[teamIdx] : null; // null = BYE
      teamIdx++;

      const match = await prisma.tournamentMatch.create({
        data: {
          categoryId,
          round: 1,
          matchOrder: i + 1,
          team1Id: t1?.id || null,
          team2Id: t2?.id || null,
          roundName: roundNames[1] || 'Ronda 1',
          // Si hay bye, el que tiene rival avanza automáticamente
          ...(t1 && !t2 ? { winnerId: t1.id, status: 'COMPLETED', scoreTeam1: 'BYE', scoreTeam2: '-' } : {}),
          ...(!t1 && t2 ? { winnerId: t2.id, status: 'COMPLETED', scoreTeam1: '-', scoreTeam2: 'BYE' } : {}),
        }
      });
      round1Matches.push(match.id);
    }

    // Crear rondas siguientes (2, 3, etc.)
    let prevRoundMatchIds = round1Matches;
    for (let round = 2; round <= totalRounds; round++) {
      const matchesThisRound = prevRoundMatchIds.length / 2;
      const newRoundMatchIds: string[] = [];

      for (let i = 0; i < matchesThisRound; i++) {
        const match = await prisma.tournamentMatch.create({
          data: {
            categoryId,
            round,
            matchOrder: i + 1,
            roundName: roundNames[round] || `Ronda ${round}`,
          }
        });
        newRoundMatchIds.push(match.id);

        // Vincular las 2 partidas previas que alimentan este match
        const feeder1Id = prevRoundMatchIds[i * 2];
        const feeder2Id = prevRoundMatchIds[i * 2 + 1];

        await prisma.tournamentMatch.update({
          where: { id: feeder1Id },
          data: { nextMatchId: match.id }
        });
        await prisma.tournamentMatch.update({
          where: { id: feeder2Id },
          data: { nextMatchId: match.id }
        });

        // Si los feeders ya tienen ganador (por BYE), propagar
        const f1 = await prisma.tournamentMatch.findUnique({ where: { id: feeder1Id } });
        const f2 = await prisma.tournamentMatch.findUnique({ where: { id: feeder2Id } });

        if (f1?.winnerId && f2?.winnerId) {
          await prisma.tournamentMatch.update({
            where: { id: match.id },
            data: { team1Id: f1.winnerId, team2Id: f2.winnerId }
          });
        } else if (f1?.winnerId) {
          await prisma.tournamentMatch.update({
            where: { id: match.id },
            data: { team1Id: f1.winnerId }
          });
        } else if (f2?.winnerId) {
          await prisma.tournamentMatch.update({
            where: { id: match.id },
            data: { team2Id: f2.winnerId }
          });
        }
      }
      prevRoundMatchIds = newRoundMatchIds;
    }

    revalidateTournamentPaths();
    return { success: true, message: `Cuadro de ${bracketSize} generado con ${numTeams} equipos (${byes} BYEs).` };
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
    const match = await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        scoreTeam1,
        scoreTeam2,
        winnerId,
        status: 'COMPLETED'
      }
    });

    // ===== FIX #1: Actualizar estadísticas de zona =====
    if (match.groupId && match.team1Id && match.team2Id) {
      const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;
      
      // Parsear scores para obtener sets y games
      const s1 = parseScore(scoreTeam1);
      const s2 = parseScore(scoreTeam2);
      
      // Actualizar stats del GANADOR
      await prisma.tournamentGroupTeam.updateMany({
        where: { groupId: match.groupId, teamId: winnerId },
        data: {
          points: { increment: 3 },
          matchesPlayed: { increment: 1 },
          matchesWon: { increment: 1 },
          setsWon: { increment: winnerId === match.team1Id ? s1.sets : s2.sets },
          setsLost: { increment: winnerId === match.team1Id ? s2.sets : s1.sets },
          gamesWon: { increment: winnerId === match.team1Id ? s1.games : s2.games },
          gamesLost: { increment: winnerId === match.team1Id ? s2.games : s1.games },
        }
      });
      
      // Actualizar stats del PERDEDOR
      await prisma.tournamentGroupTeam.updateMany({
        where: { groupId: match.groupId, teamId: loserId },
        data: {
          points: { increment: 0 },
          matchesPlayed: { increment: 1 },
          matchesLost: { increment: 1 },
          setsWon: { increment: loserId === match.team1Id ? s1.sets : s2.sets },
          setsLost: { increment: loserId === match.team1Id ? s2.sets : s1.sets },
          gamesWon: { increment: loserId === match.team1Id ? s1.games : s2.games },
          gamesLost: { increment: loserId === match.team1Id ? s2.games : s1.games },
        }
      });
    }

    // Si hay nextMatchId, avanzar al ganador
    if (match.nextMatchId && winnerId) {
      const nextMatch = await prisma.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
      if (nextMatch) {
        if (!nextMatch.team1Id) {
          await prisma.tournamentMatch.update({ where: { id: nextMatch.id }, data: { team1Id: winnerId } });
        } else if (!nextMatch.team2Id) {
          await prisma.tournamentMatch.update({ where: { id: nextMatch.id }, data: { team2Id: winnerId } });
        }
      }
    }

    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al actualizar resultado' };
  }
}

// ============================================================
// RESETEAR RESULTADO DE PARTIDO (#12)
// ============================================================
export async function resetMatchResult(matchId: string) {
  try {
    const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
    if (!match) return { success: false, error: 'Partido no encontrado' };
    if (match.status !== 'COMPLETED') return { success: false, error: 'El partido no está completado' };
    
    const oldWinnerId = match.winnerId;
    const oldScoreTeam1 = match.scoreTeam1;
    const oldScoreTeam2 = match.scoreTeam2;

    // 1. Revertir estadísticas de zona si aplica
    if (match.groupId && match.team1Id && match.team2Id && oldWinnerId) {
      const loserId = oldWinnerId === match.team1Id ? match.team2Id : match.team1Id;
      const s1 = parseScore(oldScoreTeam1 || '');
      const s2 = parseScore(oldScoreTeam2 || '');
      
      // Revertir stats del ganador
      await prisma.tournamentGroupTeam.updateMany({
        where: { groupId: match.groupId, teamId: oldWinnerId },
        data: {
          points: { decrement: 3 },
          matchesPlayed: { decrement: 1 },
          matchesWon: { decrement: 1 },
          setsWon: { decrement: oldWinnerId === match.team1Id ? s1.sets : s2.sets },
          setsLost: { decrement: oldWinnerId === match.team1Id ? s2.sets : s1.sets },
          gamesWon: { decrement: oldWinnerId === match.team1Id ? s1.games : s2.games },
          gamesLost: { decrement: oldWinnerId === match.team1Id ? s2.games : s1.games },
        }
      });
      
      // Revertir stats del perdedor
      await prisma.tournamentGroupTeam.updateMany({
        where: { groupId: match.groupId, teamId: loserId },
        data: {
          matchesPlayed: { decrement: 1 },
          matchesLost: { decrement: 1 },
          setsWon: { decrement: loserId === match.team1Id ? s1.sets : s2.sets },
          setsLost: { decrement: loserId === match.team1Id ? s2.sets : s1.sets },
          gamesWon: { decrement: loserId === match.team1Id ? s1.games : s2.games },
          gamesLost: { decrement: loserId === match.team1Id ? s2.games : s1.games },
        }
      });
    }
    
    // 2. Limpiar propagación en el cuadro
    if (match.nextMatchId && oldWinnerId) {
      const nextMatch = await prisma.tournamentMatch.findUnique({ where: { id: match.nextMatchId } });
      if (nextMatch) {
        // Solo limpiar si el equipo propagado es el ganador que estamos reseteando
        if (nextMatch.team1Id === oldWinnerId) {
          await prisma.tournamentMatch.update({ where: { id: nextMatch.id }, data: { team1Id: null } });
        } else if (nextMatch.team2Id === oldWinnerId) {
          await prisma.tournamentMatch.update({ where: { id: nextMatch.id }, data: { team2Id: null } });
        }
      }
    }

    // 3. Resetear el partido
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        scoreTeam1: null,
        scoreTeam2: null,
        winnerId: null,
        status: 'SCHEDULED'
      }
    });

    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al resetear resultado' };
  }
}

// ============================================================
// MARCAR PARTIDO COMO EN PROGRESO
// ============================================================
export async function setMatchInProgress(matchId: string) {
  try {
    await prisma.tournamentMatch.update({
      where: { id: matchId },
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
    const updateData: any = {};
    if (data.courtId !== undefined) updateData.courtId = data.courtId || null;
    if (data.startTime !== undefined) updateData.startTime = data.startTime ? new Date(data.startTime) : null;
    
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: updateData
    });
    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al asignar cancha/horario' };
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
    const category = await prisma.tournamentCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new Error('Categoría no encontrada');

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

    await prisma.$transaction(async (tx) => {
      // Borrar todos los grupos de esta categoría
      await tx.tournamentGroup.deleteMany({ where: { categoryId } });
      
      // Borrar partidos previos (elimina Knockout y Groups)
      await tx.tournamentMatch.deleteMany({ where: { categoryId } });

      // Borrar todos los equipos placeholder previos
      await tx.tournamentTeam.deleteMany({
        where: { categoryId, player1Id: dId }
      });

      // 2. Crear Zonas y Plazas
      for (let z = 0; z < config.numZones; z++) {
        const zoneConf = config.zonesConfig[z];
        
        // Crear Grupo
        const group = await tx.tournamentGroup.create({
          data: {
            categoryId,
            name: zoneConf.name
          }
        });

        const createdTeams = [];
        // Crear Plazas (Teams)
        for (let p = 1; p <= config.teamsPerZone; p++) {
          const team = await tx.tournamentTeam.create({
            data: {
              categoryId,
              name: `Plaza ${p}`,
              player1Id: dId,
            }
          });
          
          // Vincular equipo al grupo
          await tx.tournamentGroupTeam.create({
            data: {
              groupId: group.id,
              teamId: team.id
            }
          });

          createdTeams.push(team);
        }

        // 3. Algoritmo Round Robin
        const t = [...createdTeams];
        if (t.length % 2 !== 0) {
          t.push(null as any); // BYE
        }

        const matches: { t1: any, t2: any }[] = [];
        const n = t.length;
        for (let round = 0; round < n - 1; round++) {
          for (let i = 0; i < n / 2; i++) {
            const t1 = t[i];
            const t2 = t[n - 1 - i];
            if (t1 && t2) {
              matches.push({ t1, t2 });
            }
          }
          // Rotar array
          t.splice(1, 0, t.pop()!);
        }

        // Generar registros TournamentMatch
        let matchIndex = 0;
        for (const m of matches) {
          const matchStart = new Date(zoneConf.startTime);
          matchStart.setMinutes(matchStart.getMinutes() + matchIndex * zoneConf.intervalMinutes);

          await tx.tournamentMatch.create({
            data: {
              categoryId,
              groupId: group.id,
              round: 1,
              matchOrder: matchIndex + 1,
              team1Id: m.t1.id,
              team2Id: m.t2.id,
              roundName: 'Fase de Grupos',
              startTime: matchStart,
              courtId: zoneConf.courtId || null,
            }
          });
          matchIndex++;
        }
      }
    });

    revalidateTournamentPaths();
    return { success: true };
  } catch (error: any) {
    console.error('Error in generateZonesAndSchedule:', error);
    return { success: false, error: 'Error al generar zonas y fixture' };
  }
}

// ============================================================
// GENERADOR DE CUADRO INTELIGENTE DESDE ZONAS (FIX #5 — BYEs)
// ============================================================
export async function generateKnockoutFromZones(categoryId: string) {
  try {
    const category = await prisma.tournamentCategory.findUnique({
      where: { id: categoryId },
      include: {
        matches: { where: { groupId: null } },
        groups: {
          include: {
            teams: { include: { team: true }, orderBy: { points: 'desc' } }
          }
        }
      }
    });

    if (!category) return { success: false, error: 'Categoría no encontrada.' };
    const groups = category.groups;

    if (category.matches.length > 0) {
      await prisma.tournamentMatch.deleteMany({ where: { categoryId, groupId: null } });
    }

    const qualifiedTeams: any[] = [];
    const firsts = groups.map(g => g.teams[0]?.team).filter(Boolean);
    const seconds = groups.map(g => g.teams[1]?.team).filter(Boolean);

    if (groups.length === 2) {
      qualifiedTeams.push(firsts[0], seconds[1]); 
      qualifiedTeams.push(firsts[1], seconds[0]); 
    } else if (groups.length === 4) {
      qualifiedTeams.push(firsts[0], seconds[1]); 
      qualifiedTeams.push(firsts[2], seconds[3]); 
      qualifiedTeams.push(firsts[1], seconds[0]); 
      qualifiedTeams.push(firsts[3], seconds[2]); 
    } else {
      let i = 0;
      while(i < firsts.length || i < seconds.length) {
        if (firsts[i]) qualifiedTeams.push(firsts[i]);
        if (seconds[firsts.length - 1 - i]) qualifiedTeams.push(seconds[firsts.length - 1 - i]);
        i++;
      }
    }

    const numTeams = qualifiedTeams.length;
    let bracketSize = 2;
    while (bracketSize < numTeams) bracketSize *= 2;
    if (bracketSize < 4) bracketSize = 4; // Mínimo Semifinales
    
    while(qualifiedTeams.length < bracketSize) {
      qualifiedTeams.push(null);
    }

    const totalRounds = Math.ceil(Math.log2(bracketSize));
    const round1Matches: string[] = [];
    let teamIdx = 0;
    const roundNames = getRoundNames(totalRounds);

    const matchesPerRound1 = bracketSize / 2;
    for (let i = 0; i < matchesPerRound1; i++) {
      const t1 = qualifiedTeams[teamIdx] || null;
      teamIdx++;
      const t2 = qualifiedTeams[teamIdx] || null;
      teamIdx++;

      // FIX #5: Manejar BYEs igual que en generateKnockoutBracket
      const match = await prisma.tournamentMatch.create({
        data: {
          categoryId,
          round: 1,
          matchOrder: i + 1,
          team1Id: t1?.id || null,
          team2Id: t2?.id || null,
          roundName: roundNames[1] || 'Ronda 1',
          ...(t1 && !t2 ? { winnerId: t1.id, status: 'COMPLETED', scoreTeam1: 'BYE', scoreTeam2: '-' } : {}),
          ...(!t1 && t2 ? { winnerId: t2.id, status: 'COMPLETED', scoreTeam1: '-', scoreTeam2: 'BYE' } : {}),
        }
      });
      round1Matches.push(match.id);
    }

    let prevRoundMatchIds = round1Matches;
    for (let round = 2; round <= totalRounds; round++) {
      const matchesThisRound = prevRoundMatchIds.length / 2;
      const newRoundMatchIds: string[] = [];

      for (let i = 0; i < matchesThisRound; i++) {
        const match = await prisma.tournamentMatch.create({
          data: {
            categoryId,
            round,
            matchOrder: i + 1,
            roundName: roundNames[round] || `Ronda ${round}`,
          }
        });
        newRoundMatchIds.push(match.id);

        const feeder1Id = prevRoundMatchIds[i * 2];
        const feeder2Id = prevRoundMatchIds[i * 2 + 1];

        await prisma.tournamentMatch.update({
          where: { id: feeder1Id },
          data: { nextMatchId: match.id }
        });
        await prisma.tournamentMatch.update({
          where: { id: feeder2Id },
          data: { nextMatchId: match.id }
        });

        // FIX #5: Propagar ganadores de BYEs a la siguiente ronda
        const f1 = await prisma.tournamentMatch.findUnique({ where: { id: feeder1Id } });
        const f2 = await prisma.tournamentMatch.findUnique({ where: { id: feeder2Id } });

        if (f1?.winnerId && f2?.winnerId) {
          await prisma.tournamentMatch.update({
            where: { id: match.id },
            data: { team1Id: f1.winnerId, team2Id: f2.winnerId }
          });
        } else if (f1?.winnerId) {
          await prisma.tournamentMatch.update({
            where: { id: match.id },
            data: { team1Id: f1.winnerId }
          });
        } else if (f2?.winnerId) {
          await prisma.tournamentMatch.update({
            where: { id: match.id },
            data: { team2Id: f2.winnerId }
          });
        }
      }
      prevRoundMatchIds = newRoundMatchIds;
    }

    revalidateTournamentPaths();
    return { success: true, message: `Cuadro generado inteligentemente desde zonas.` };
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
    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: { [slot]: teamId }
    });
    revalidateTournamentPaths();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Error al cambiar equipo' };
  }
}
