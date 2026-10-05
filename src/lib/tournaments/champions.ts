import type { TournamentView, TournamentMatchView, TournamentTeamView } from './types';

export type TournamentChampionInfo = {
  categoryId: string;
  categoryName: string;
  champion: TournamentTeamView;
  runnerUp?: TournamentTeamView | null;
  finalMatch: TournamentMatchView;
  scoreChampion: string | null;
  scoreRunnerUp: string | null;
  isTournamentFinished: boolean;
};

/**
 * Obtiene los campeones y subcampeones de las categorías que ya hayan concluido su final.
 */
export function getTournamentChampions(tournament: TournamentView | null | undefined): TournamentChampionInfo[] {
  if (!tournament || !tournament.categories) return [];

  const champions: TournamentChampionInfo[] = [];

  for (const cat of tournament.categories) {
    if (!cat.matches || !cat.matches.length) continue;

    // Partidos de llave eliminatoria (sin grupo)
    const bracketMatches = cat.matches.filter((m) => !m.groupId);

    if (bracketMatches.length > 0) {
      // La final es el partido con mayor número de ronda
      const maxRound = Math.max(...bracketMatches.map((m) => m.round));
      const finalMatch = bracketMatches.find(
        (m) => m.round === maxRound && (m.roundName === 'Final' || maxRound > 0)
      );

      if (finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerId) {
        const isTeam1Winner = finalMatch.winnerId === finalMatch.team1Id;
        const champion = isTeam1Winner ? finalMatch.team1 : finalMatch.team2;
        const runnerUp = isTeam1Winner ? finalMatch.team2 : finalMatch.team1;

        if (champion) {
          champions.push({
            categoryId: cat.id,
            categoryName: cat.name,
            champion,
            runnerUp,
            finalMatch,
            scoreChampion: isTeam1Winner ? finalMatch.scoreTeam1 : finalMatch.scoreTeam2,
            scoreRunnerUp: isTeam1Winner ? finalMatch.scoreTeam2 : finalMatch.scoreTeam1,
            isTournamentFinished: tournament.status === 'COMPLETED' || bracketMatches.every(m => m.status === 'COMPLETED'),
          });
        }
      }
    } else if (cat.format === 'ROUND_ROBIN' && cat.groups?.length > 0) {
      // Torneo de zonas puro sin llaves
      const allGroupMatches = cat.matches.filter((m) => m.groupId);
      const allCompleted = allGroupMatches.length > 0 && allGroupMatches.every((m) => m.status === 'COMPLETED');

      if (allCompleted) {
        const firstGroup = cat.groups[0];
        const sorted = [...(firstGroup.teams || [])].sort((a, b) => b.points - a.points);
        const topPlacement = sorted[0];
        const runnerPlacement = sorted[1];

        if (topPlacement?.team) {
          champions.push({
            categoryId: cat.id,
            categoryName: cat.name,
            champion: topPlacement.team,
            runnerUp: runnerPlacement?.team || null,
            finalMatch: allGroupMatches[allGroupMatches.length - 1],
            scoreChampion: `${topPlacement.points} pts`,
            scoreRunnerUp: `${runnerPlacement?.points || 0} pts`,
            isTournamentFinished: true,
          });
        }
      }
    }
  }

  return champions;
}
