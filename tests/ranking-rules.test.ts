import test from 'node:test';
import assert from 'node:assert/strict';
import { sortRankingEntries } from '../src/lib/rankings.ts';

const createdAt = '2026-01-01T00:00:00.000Z';

test('ordena automáticamente por puntos y luego por partidos ganados', () => {
  const result = sortRankingEntries([
    { id: 'a', manualPosition: 0, points: 100, matchesPlayed: 8, matchesWon: 5, matchesLost: 3, createdAt },
    { id: 'b', manualPosition: 0, points: 120, matchesPlayed: 9, matchesWon: 6, matchesLost: 3, createdAt },
    { id: 'c', manualPosition: 0, points: 100, matchesPlayed: 8, matchesWon: 6, matchesLost: 2, createdAt },
  ], 'POINTS');
  assert.deepEqual(result.map((entry) => entry.id), ['b', 'c', 'a']);
});

test('respeta posiciones manuales y deja las no asignadas al final', () => {
  const result = sortRankingEntries([
    { id: 'sin-posicion', manualPosition: 0, points: 999, matchesPlayed: 1, matchesWon: 1, matchesLost: 0, createdAt },
    { id: 'segunda', manualPosition: 2, points: 20, matchesPlayed: 1, matchesWon: 0, matchesLost: 1, createdAt },
    { id: 'primera', manualPosition: 1, points: 10, matchesPlayed: 1, matchesWon: 0, matchesLost: 1, createdAt },
  ], 'MANUAL');
  assert.deepEqual(result.map((entry) => entry.id), ['primera', 'segunda', 'sin-posicion']);
});
