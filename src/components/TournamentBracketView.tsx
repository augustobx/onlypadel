'use client';

import { useState } from 'react';
import { updateMatchTeam } from '@/actions/tournament-engine';
import { useRouter } from 'next/navigation';
import type { TournamentCategoryView, TournamentMatchView } from '@/lib/tournaments/types';

export default function TournamentBracketView({ category }: { category: TournamentCategoryView }) {
  const router = useRouter();
  const [loadingMatch, setLoadingMatch] = useState<string | null>(null);

  // Filtrar los partidos que pertenecen al cuadro (groupId = null)
  const bracketMatches = category.matches?.filter((m) => !m.groupId) || [];
  
  if (bracketMatches.length === 0) {
    return <p className="text-slate-500 py-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">Aún no se ha generado el cuadro para esta categoría.</p>;
  }

  // Agrupar partidos por ronda
  const matchesByRound: Record<number, TournamentMatchView[]> = {};
  bracketMatches.forEach((m) => {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  });

  const maxRound = Math.max(...Object.keys(matchesByRound).map(Number));
  
  // Todos los equipos inscriptos en la categoría para el selector manual
  const allTeams = (category.teams || []).filter((team) => team.player1?.phone !== 'DUMMY_PLAZA');

  const handleTeamChange = async (matchId: string, slot: 'team1Id' | 'team2Id', teamId: string) => {
    setLoadingMatch(matchId);
    const result = await updateMatchTeam(matchId, slot, teamId || null);
    if (!result.success) alert(result.error || 'No se pudo cambiar la pareja');
    setLoadingMatch(null);
    router.refresh();
  };

  return (
    <div className="overflow-x-auto pb-8">
      <div className="flex min-w-max gap-8 px-4">
        {Array.from({ length: maxRound }).map((_, i) => {
          const roundNum = i + 1;
          const matchesInRound = matchesByRound[roundNum]?.sort((a, b) => a.matchOrder - b.matchOrder) || [];
          
          return (
            <div key={roundNum} className="flex flex-col gap-4 w-72 justify-around">
              <h4 className="font-black text-center text-slate-500 uppercase tracking-wider mb-2">
                {matchesInRound[0]?.roundName || `Ronda ${roundNum}`}
              </h4>
              
              {matchesInRound.map(match => (
                <div key={match.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm relative flex flex-col justify-center">
                  {match.startTime && (
                    <div className="text-[10px] text-slate-400 mb-2 font-medium flex items-center justify-center gap-1 border-b border-slate-100 dark:border-slate-700 pb-1">
                      {new Date(match.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </div>
                  )}
                  {/* Selector Equipo 1 (Solo Ronda 1) */}
                  <div className="border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                    {roundNum === 1 ? (
                      <select 
                        className="w-full text-sm bg-transparent outline-none font-bold text-slate-700 dark:text-slate-200"
                        value={match.team1Id || ''}
                        onChange={(e) => handleTeamChange(match.id, 'team1Id', e.target.value)}
                        disabled={loadingMatch === match.id}
                      >
                        <option value="">[ Seleccionar Pareja ]</option>
                        {allTeams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                        {match.team1?.name || <span className="text-slate-400 font-normal italic">Por definir</span>}
                      </div>
                    )}
                  </div>

                  {/* Selector Equipo 2 (Solo Ronda 1) */}
                  <div>
                    {roundNum === 1 ? (
                      <select 
                        className="w-full text-sm bg-transparent outline-none font-bold text-slate-700 dark:text-slate-200"
                        value={match.team2Id || ''}
                        onChange={(e) => handleTeamChange(match.id, 'team2Id', e.target.value)}
                        disabled={loadingMatch === match.id}
                      >
                        <option value="">[ Seleccionar Pareja ]</option>
                        {allTeams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                        {match.team2?.name || <span className="text-slate-400 font-normal italic">Por definir</span>}
                      </div>
                    )}
                  </div>

                  {/* Conectores visuales (para pantallas grandes) */}
                  {roundNum < maxRound && (
                    <div className="absolute top-1/2 -right-4 w-4 h-[2px] bg-slate-300 dark:bg-slate-600"></div>
                  )}
                  {roundNum > 1 && (
                    <div className="absolute top-1/2 -left-4 w-4 h-[2px] bg-slate-300 dark:bg-slate-600"></div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl text-sm max-w-2xl mx-auto flex items-start gap-3">
        <span className="text-xl">💡</span>
        <p>En la Ronda 1 puedes hacer clic en los nombres de los equipos para cambiarlos manualmente y armar los cruces exactos que necesites. El resto de las rondas se completarán automáticamente a medida que cargues resultados en la Mesa de Control.</p>
      </div>
    </div>
  );
}
