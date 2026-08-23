'use client';

import React from 'react';
import type { TournamentMatchView } from '@/lib/tournaments/types';

export default function TournamentBracket({ matches, format }: { matches: TournamentMatchView[]; format?: string }) {
  if (format === 'ROUND_ROBIN') {
    return <div className="text-center p-4 text-slate-500">Los resultados se muestran en las tablas de grupos.</div>;
  }

  // Filtrar solo partidos de bracket (no de grupos)
  const bracketMatches = matches.filter((m) => !m.groupId);
  if (bracketMatches.length === 0) return null;

  // Agrupar por ronda
  const roundsSet = new Set(bracketMatches.map((m) => m.round));
  const rounds = Array.from(roundsSet).sort((a, b) => a - b);

  return (
    <div className="flex gap-6 min-w-max">
      {rounds.map((round) => {
        const roundMatches = bracketMatches
          .filter((m) => m.round === round)
          .sort((a, b) => a.matchOrder - b.matchOrder);
        const roundName = roundMatches[0]?.roundName || `Ronda ${round}`;

        return (
          <div key={round} className="flex flex-col min-w-[240px]" style={{ justifyContent: 'space-around' }}>
            <h3 className="text-center font-bold text-sm text-slate-400 mb-4 uppercase tracking-wider">{roundName}</h3>
            <div className="flex flex-col justify-around flex-1 gap-4">
              {roundMatches.map((match) => {
                const isBye = match.scoreTeam1 === 'BYE' || match.scoreTeam2 === 'BYE';
                if (isBye) return null; // No mostrar BYEs

                return (
                  <div key={match.id} className="relative">
                    {match.status === 'IN_PROGRESS' && (
                      <div className="absolute -left-1 top-0 bottom-0 w-1 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                    <div className={`bg-slate-800/60 border rounded-xl overflow-hidden ${match.status === 'IN_PROGRESS' ? 'border-red-500/50' : 'border-slate-700/50'}`}>
                      <div className={`flex justify-between items-center px-3 py-2.5 border-b border-slate-700/30 ${match.winnerId === match.team1Id && match.winnerId ? 'bg-emerald-500/10' : ''}`}>
                        <span className={`text-sm truncate pr-2 ${match.winnerId === match.team1Id && match.winnerId ? 'font-bold text-emerald-400' : 'text-slate-300'}`}>
                          {match.team1?.name || 'TBD'}
                        </span>
                        <span className="font-mono font-bold text-sm tabular-nums text-slate-400">{match.scoreTeam1 ?? '-'}</span>
                      </div>
                      <div className={`flex justify-between items-center px-3 py-2.5 ${match.winnerId === match.team2Id && match.winnerId ? 'bg-emerald-500/10' : ''}`}>
                        <span className={`text-sm truncate pr-2 ${match.winnerId === match.team2Id && match.winnerId ? 'font-bold text-emerald-400' : 'text-slate-300'}`}>
                          {match.team2?.name || 'TBD'}
                        </span>
                        <span className="font-mono font-bold text-sm tabular-nums text-slate-400">{match.scoreTeam2 ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
