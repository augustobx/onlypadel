export type ParsedScore = { sets: number; games: number; setDetails: [number, number][] };

export function parseScore(score: string): ParsedScore {
  if (!score || score === '-' || score === 'BYE') return { sets: 0, games: 0, setDetails: [] };
  const setDetails: [number, number][] = [];
  let sets = 0;
  let games = 0;
  for (const part of score.split(/\s*\/\s*|\s+/).filter(Boolean)) {
    const match = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (!match) continue;
    const ownGames = Number(match[1]);
    const rivalGames = Number(match[2]);
    setDetails.push([ownGames, rivalGames]);
    games += ownGames;
    if (ownGames > rivalGames) sets++;
  }
  return { sets, games, setDetails };
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
