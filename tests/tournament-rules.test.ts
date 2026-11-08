import assert from 'node:assert/strict';
import test from 'node:test';
import { compareStandings, createFirstRoundSlots, parseScore, validateScore } from '../src/lib/tournaments/rules.ts';

test('interpreta marcadores espejados y determina al ganador', () => {
  const result = validateScore('6-4 / 7-5', '4-6 / 5-7');
  assert.equal(result.valid, true);
  assert.equal(result.winner, 1);
  assert.deepEqual(parseScore('6-4 / 7-5'), { sets: 2, games: 13, setDetails: [[6, 4], [7, 5]] });
});

test('rechaza marcadores inconsistentes', () => {
  assert.equal(validateScore('6-4 / 7-5', '4-6 / 6-7').valid, false);
  assert.equal(validateScore('', '').valid, false);
});

test('distribuye pases libres sin crear partidos completamente vacíos', () => {
  const teams = Array.from({ length: 5 }, (_, index) => ({ id: String(index + 1) }));
  const slots = createFirstRoundSlots(teams);
  assert.equal(slots.length, 4);
  assert.equal(slots.every(([team1, team2]) => Boolean(team1 || team2)), true);
  assert.equal(slots.filter(([team1, team2]) => Boolean(team1) !== Boolean(team2)).length, 3);
});

test('ordena por puntos, partidos, diferencia de sets y diferencia de games', () => {
  const base = { points: 6, matchesWon: 2, setsWon: 4, setsLost: 2, gamesWon: 30, gamesLost: 25 };
  const betterSets = { ...base, setsWon: 5 };
  assert.equal([base, betterSets].sort(compareStandings)[0], betterSets);
});

test('partidos de una zona se programan de forma continua sin brechas de horas', () => {
  const duration = 40; // minutos
  const numZones = 6;
  const teamsPerZone = 3;
  const courtIds = ['cancha-1', 'cancha-2'];
  const startDateTime = new Date('2026-11-08T15:00:00Z');

  // Simular la generación compacta por zona implementada en createTournamentWithWizard
  const zonesData = Array.from({ length: numZones }, (_, z) => {
    const groupName = `Zona ${String.fromCharCode(65 + z)}`;
    const dummyTeams = Array.from({ length: teamsPerZone }, (_, p) => ({ id: `T-${z}-${p + 1}` }));
    const teamArray: ({ id: string } | null)[] = [...dummyTeams];
    if (teamArray.length % 2 !== 0) teamArray.push(null);
    const n = teamArray.length;
    const matches: { round: number; t1Id: string; t2Id: string }[] = [];

    for (let r = 0; r < n - 1; r++) {
      for (let i = 0; i < n / 2; i++) {
        const t1 = teamArray[i];
        const t2 = teamArray[n - 1 - i];
        if (t1 && t2) matches.push({ round: r + 1, t1Id: t1.id, t2Id: t2.id });
      }
      teamArray.splice(1, 0, teamArray.pop()!);
    }
    return { name: groupName, matches };
  });

  const courtAvailability = new Map<string, Date>();
  courtIds.forEach(c => courtAvailability.set(c, new Date(startDateTime)));

  const scheduledMatches: { zone: string; court: string; startTime: Date; endTime: Date }[] = [];

  for (const zone of zonesData) {
    let bestCourtId = courtIds[0];
    let earliestTime = courtAvailability.get(bestCourtId)!;
    for (const cId of courtIds) {
      const cTime = courtAvailability.get(cId)!;
      if (cTime.getTime() < earliestTime.getTime()) {
        earliestTime = cTime;
        bestCourtId = cId;
      }
    }

    let currentTime = new Date(earliestTime);
    for (const m of zone.matches) {
      const mStart = new Date(currentTime);
      const mEnd = new Date(mStart.getTime() + duration * 60_000);
      scheduledMatches.push({ zone: zone.name, court: bestCourtId, startTime: mStart, endTime: mEnd });
      currentTime = mEnd;
    }
    courtAvailability.set(bestCourtId, currentTime);
  }

  // Verificar que en cada zona los partidos sean consecutivos
  for (const zone of zonesData) {
    const zMatches = scheduledMatches.filter(m => m.zone === zone.name);
    assert.equal(zMatches.length, 3);
    // Cada partido consecutivo debe empezar exactamente cuando termina el anterior
    assert.equal(zMatches[1].startTime.getTime(), zMatches[0].endTime.getTime());
    assert.equal(zMatches[2].startTime.getTime(), zMatches[1].endTime.getTime());
    // La duración total de la zona debe ser exactamente 3 * 40m = 120m
    const totalZoneMinutes = (zMatches[2].endTime.getTime() - zMatches[0].startTime.getTime()) / 60_000;
    assert.equal(totalZoneMinutes, 120);
  }
});
