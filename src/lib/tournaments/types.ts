export type TournamentTeamView = {
  id: string;
  name: string | null;
  isPaid: boolean;
  phone1?: string | null;
  phone2?: string | null;
  player1?: { id?: string; name: string | null; phone?: string | null } | null;
  player2?: { id?: string; name: string | null; phone?: string | null } | null;
};

export type TournamentMatchView = {
  id: string;
  categoryId: string;
  groupId: string | null;
  round: number;
  matchOrder: number;
  roundName: string | null;
  nextMatchId?: string | null;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  scoreTeam1: string | null;
  scoreTeam2: string | null;
  courtId: string | null;
  startTime: string | Date | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  team1?: TournamentTeamView | null;
  team2?: TournamentTeamView | null;
  winner?: TournamentTeamView | null;
  group?: { id: string; name: string } | null;
  categoryName?: string;
};

export type TournamentPlacementView = {
  id: string;
  teamId: string;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  team: TournamentTeamView;
};

export type TournamentGroupView = {
  id: string;
  name: string;
  teams: TournamentPlacementView[];
  matches?: TournamentMatchView[];
};

export type TournamentCategoryView = {
  id: string;
  name: string;
  format: TournamentFormatView | null;
  teams: TournamentTeamView[];
  matches: TournamentMatchView[];
  groups: TournamentGroupView[];
};

export type TournamentView = {
  id: string;
  name: string;
  status: string;
  format: TournamentFormatView;
  startDate: string | Date;
  endDate: string | Date;
  maxTeams: number | null;
  entryFee: string | number | { toString(): string };
  requireDeposit: boolean;
  depositAmount: string | number | { toString(): string };
  categories: TournamentCategoryView[];
};

export type CourtView = { id: string; name: string };
export type TournamentFormatView = 'KNOCKOUT' | 'ROUND_ROBIN' | 'MIXED';
