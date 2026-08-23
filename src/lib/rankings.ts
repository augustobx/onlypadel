export type RankableEntry = {
  id: string;
  manualPosition: number;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  createdAt: Date | string;
};

export function sortRankingEntries<T extends RankableEntry>(entries: T[], sortMode: 'POINTS' | 'MANUAL') {
  return [...entries].sort((a, b) => {
    if (sortMode === 'MANUAL') {
      const positionA = a.manualPosition > 0 ? a.manualPosition : Number.MAX_SAFE_INTEGER;
      const positionB = b.manualPosition > 0 ? b.manualPosition : Number.MAX_SAFE_INTEGER;
      if (positionA !== positionB) return positionA - positionB;
    } else {
      if (a.points !== b.points) return b.points - a.points;
      if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;
      const differenceA = a.matchesWon - a.matchesLost;
      const differenceB = b.matchesWon - b.matchesLost;
      if (differenceA !== differenceB) return differenceB - differenceA;
      if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function rankingDisplayName(entry: {
  externalName: string | null;
  user: { name: string | null; lastName: string | null } | null;
}) {
  if (entry.user) return `${entry.user.name || ''} ${entry.user.lastName || ''}`.trim() || 'Jugador sin nombre';
  return entry.externalName || 'Participante externo';
}
