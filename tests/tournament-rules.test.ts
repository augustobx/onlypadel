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
