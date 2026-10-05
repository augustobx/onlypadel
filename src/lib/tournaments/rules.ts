export type ParsedScore = { sets: number; games: number; setDetails: [number, number][] };

export function parseScore(score: string): ParsedScore {
  if (!score || score === '-' || score === 'BYE') return { sets: 0, games: 0, setDetails: [] };
  const setDetails: [number, number][] = [];
  let sets = 0;
  let games = 0;
  // Limpiar notas de tiebreak entre paréntesis (ej: "(7-5)", "(5)") para que no se cuenten como sets/games adicionales
  const cleanScore = score.replace(/\([^)]*\)/g, '');
  const regex = /(\d+)\s*(?:[-–\/]|a|A)\s*(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleanScore)) !== null) {
    const ownGames = Number(match[1]);
    const rivalGames = Number(match[2]);
    setDetails.push([ownGames, rivalGames]);
    games += ownGames;
    if (ownGames > rivalGames) sets++;
  }
  return { sets, games, setDetails };
}

export function mirrorScore(score: string): string {
  if (!score || score === '-' || score === 'BYE') return '';
  const parts = score.split(/\s*[\/,;]\s*/).filter(Boolean);
  const mirroredParts: string[] = [];

  for (const part of parts) {
    const match = part.match(/(\d+)\s*(?:[-–\/]|a|A)\s*(\d+)(?:\s*\(\s*(?:(\d+)\s*[-–]\s*(\d+)|(\d+))\s*\))?/);
    if (!match) continue;
    const a = match[1];
    const b = match[2];
    const tb1 = match[3];
    const tb2 = match[4];
    const tbSingle = match[5];

    if (tb1 !== undefined && tb2 !== undefined) {
      mirroredParts.push(`${b}-${a} (${tb2}-${tb1})`);
    } else if (tbSingle !== undefined) {
      mirroredParts.push(`${b}-${a} (${tbSingle})`);
    } else {
      mirroredParts.push(`${b}-${a}`);
    }
  }

  if (mirroredParts.length === 0) {
    const parsed = parseScore(score);
    if (parsed.setDetails.length === 0) return '';
    return parsed.setDetails.map(([a, b]) => `${b}-${a}`).join(' / ');
  }

  return mirroredParts.join(' / ');
}

export type TiedSetInfo = {
  setIndex: number;
  ownGames: number;
  rivalGames: number;
  totalSets: number;
};

export function findTiedSet(score: string): TiedSetInfo | null {
  const parsed = parseScore(score);
  for (let i = 0; i < parsed.setDetails.length; i++) {
    const [a, b] = parsed.setDetails[i];
    if (a === b && a > 0) {
      return {
        setIndex: i,
        ownGames: a,
        rivalGames: b,
        totalSets: parsed.setDetails.length,
      };
    }
  }
  return null;
}

export function resolveTiedSetScore(
  score: string,
  setIndex: number,
  tbPoints1: number,
  tbPoints2: number,
  gamesFormat: '7-6' | '8-7' = '7-6'
): { scoreTeam1: string; scoreTeam2: string; winnerNum: 1 | 2 } {
  const parts = score.split(/\s*[\/,;]\s*/).filter(Boolean);
  const winnerNum = tbPoints1 > tbPoints2 ? 1 : 2;

  const winGames = gamesFormat === '8-7' ? 8 : 7;
  const loseGames = gamesFormat === '8-7' ? 7 : 6;

  const resolvedParts1: string[] = [];
  const resolvedParts2: string[] = [];

  parts.forEach((part, idx) => {
    if (idx === setIndex) {
      if (winnerNum === 1) {
        resolvedParts1.push(`${winGames}-${loseGames} (${tbPoints1}-${tbPoints2})`);
        resolvedParts2.push(`${loseGames}-${winGames} (${tbPoints2}-${tbPoints1})`);
      } else {
        resolvedParts1.push(`${loseGames}-${winGames} (${tbPoints1}-${tbPoints2})`);
        resolvedParts2.push(`${winGames}-${loseGames} (${tbPoints2}-${tbPoints1})`);
      }
    } else {
      const match = part.match(/(\d+)\s*(?:[-–\/]|a|A)\s*(\d+)/);
      if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);
        resolvedParts1.push(`${a}-${b}`);
        resolvedParts2.push(`${b}-${a}`);
      } else {
        resolvedParts1.push(part);
        resolvedParts2.push(part);
      }
    }
  });

  return {
    scoreTeam1: resolvedParts1.join(' / '),
    scoreTeam2: resolvedParts2.join(' / '),
    winnerNum,
  };
}

export function validateScore(scoreTeam1: string, scoreTeam2: string) {
  const team1 = parseScore(scoreTeam1);
  const team2 = parseScore(scoreTeam2);
  const mirrored = team1.setDetails.length > 0 &&
    team1.setDetails.length === team2.setDetails.length &&
    team1.setDetails.every(([a, b], index) => team2.setDetails[index]?.[0] === b && team2.setDetails[index]?.[1] === a && a !== b);
  return { valid: mirrored, team1, team2, winner: team1.sets === team2.sets ? 0 : team1.sets > team2.sets ? 1 : 2 } as const;
}

export function createFirstRoundSlots<T extends { id: string }>(teams: T[]) {
  if (teams.length < 2) return [] as ([T | null, T | null])[];
  const bracketSize = 2 ** Math.ceil(Math.log2(teams.length));
  const slots: ([T | null, T | null])[] = Array.from({ length: bracketSize / 2 }, () => [null, null]);
  teams.forEach((team, index) => {
    const matchIndex = index % slots.length;
    const side = index < slots.length ? 0 : 1;
    slots[matchIndex][side] = team;
  });
  return slots;
}

export type RankingStats = {
  points: number;
  matchesWon: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
};

export function compareStandings(a: RankingStats, b: RankingStats) {
  return b.points - a.points ||
    b.matchesWon - a.matchesWon ||
    (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost) ||
    (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost) ||
    b.gamesWon - a.gamesWon;
}
