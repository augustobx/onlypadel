import { getTournamentDetails } from "@/actions/public-tournaments";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, Trophy, ChevronRight, Clock } from "lucide-react";
import TournamentBracket from "@/components/TournamentBracket";

export default async function PublicTournamentDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const response = await getTournamentDetails(params.id);
  const tournament = response.success && response.data ? response.data : null;

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-slate-950">
        <Trophy className="w-16 h-16 text-slate-700 mb-6" />
        <h1 className="text-2xl font-bold text-slate-300">Torneo no encontrado</h1>
        <Link href="/torneos" className="mt-4 text-blue-400 hover:text-blue-300 transition-colors">← Volver a Torneos</Link>
      </div>
    );
  }

  const formatLabels: Record<string, string> = {
    'KNOCKOUT': 'Eliminación Directa',
    'ROUND_ROBIN': 'Zonas (Round Robin)',
    'MIXED': 'Mixto',
  };

  const statusColors: Record<string, string> = {
    'DRAFT': 'bg-slate-500',
    'REGISTRATION': 'bg-emerald-500',
    'ONGOING': 'bg-red-500',
    'COMPLETED': 'bg-blue-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/10 to-emerald-600/20 blur-3xl"></div>
        <div className="relative max-w-5xl mx-auto px-4 pt-6 pb-10 md:pt-10 md:pb-16">
          <Link href="/torneos" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver a Torneos
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`${statusColors[tournament.status] || 'bg-slate-500'} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider`}>
                  {tournament.status === 'REGISTRATION' ? '📋 Inscripciones Abiertas' :
                   tournament.status === 'ONGOING' ? '🔴 En Juego' :
                   tournament.status === 'COMPLETED' ? '✅ Finalizado' : '📝 Próximamente'}
                </span>
                <span className="text-slate-500 text-xs font-medium uppercase">{formatLabels[tournament.format] || tournament.format}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">{tournament.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(tournament.startDate).toLocaleDateString('es-AR')} — {new Date(tournament.endDate).toLocaleDateString('es-AR')}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Inscripción: ${tournament.entryFee.toString()}</span>
              </div>
            </div>

            {tournament.status === 'REGISTRATION' && tournament.categories.length > 0 && (() => {
              const totalTeams = tournament.categories.reduce((acc: number, cat: any) => acc + (cat.teams?.length || 0), 0);
              const isFull = tournament.maxTeams ? totalTeams >= tournament.maxTeams : false;
              
              return (
                <div className="flex flex-col items-end gap-2">
                  <Link 
                    href={isFull ? '#' : `/torneos/${tournament.id}/registro`} 
                    className={`font-bold py-4 px-8 rounded-2xl transition-all shadow-lg text-center flex items-center justify-center gap-2 ${
                      isFull 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30 active:scale-95'
                    }`}
                  >
                    <Users className="w-5 h-5" /> 
                    {isFull ? 'Cupos Agotados' : 'Inscribir Pareja'}
                  </Link>
                  {tournament.maxTeams && (
                    <span className={`text-sm font-medium ${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
                      {totalTeams} / {tournament.maxTeams} cupos ocupados
                    </span>
                  )}
                </div>
              );
            })()}

            {tournament.status === 'ONGOING' && (
              <div className="bg-red-500/15 text-red-400 font-bold py-3 px-6 rounded-2xl border border-red-500/20 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                TORNEO EN JUEGO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CATEGORIAS */}
      <div className="max-w-5xl mx-auto px-4 pb-12 space-y-12">
        {tournament.categories.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 rounded-3xl border border-slate-700/50">
            <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Las categorías se publicarán próximamente.</p>
          </div>
        ) : (
          tournament.categories.map((category: any) => (
            <div key={category.id} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-700/50 pb-3">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold">{category.name}</h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">{category.teams?.length || 0} parejas</span>
              </div>

              {/* TABLAS DE ZONAS */}
              {category.groups.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.groups.map((g: any) => {
                    // Partidos del grupo
                    const groupMatches = category.matches
                      ?.filter((m: any) => m.groupId === g.id)
                      ?.sort((a: any, b: any) => {
                        if (a.startTime && b.startTime) return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                        return a.matchOrder - b.matchOrder;
                      }) || [];

                    return (
                      <div key={g.id} className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-4 text-center text-yellow-400">{g.name}</h3>
                        
                        {/* Tabla de posiciones (#11 — mostrar más stats) */}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-700/50">
                              <th className="text-left pb-2">Pareja</th>
                              <th className="pb-2 text-center">Pts</th>
                              <th className="pb-2 text-center">PJ</th>
                              <th className="pb-2 text-center">SG</th>
                              <th className="pb-2 text-center">SP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.teams.map((gt: any) => (
                              <tr key={gt.id} className="border-b border-slate-800/50">
                                <td className="py-3 font-medium">{gt.team?.name}</td>
                                <td className="py-3 text-center font-bold text-emerald-400">{gt.points}</td>
                                <td className="py-3 text-center text-slate-400">{gt.matchesPlayed}</td>
                                <td className="py-3 text-center text-slate-400">{gt.setsWon}</td>
                                <td className="py-3 text-center text-slate-400">{gt.setsLost}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Partidos del grupo */}
                        {groupMatches.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-700/30 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Fixture</p>
                            {groupMatches.map((m: any) => (
                              <div key={m.id} className={`flex items-center text-xs rounded-lg px-2 py-1.5 ${
                                m.status === 'COMPLETED' ? 'bg-emerald-900/10' :
                                m.status === 'IN_PROGRESS' ? 'bg-red-900/15' :
                                'bg-slate-900/30'
                              }`}>
                                {m.startTime && (
                                  <span className="text-slate-500 font-mono w-12 shrink-0 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(m.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                <span className={`flex-1 truncate ${m.winnerId === m.team1Id && m.winnerId ? 'font-bold text-emerald-400' : 'text-slate-300'}`}>
                                  {m.team1?.name || '?'}
                                </span>
                                <span className="text-slate-600 mx-1 shrink-0">vs</span>
                                <span className={`flex-1 truncate text-right ${m.winnerId === m.team2Id && m.winnerId ? 'font-bold text-emerald-400' : 'text-slate-300'}`}>
                                  {m.team2?.name || '?'}
                                </span>
                                {m.status === 'COMPLETED' && m.scoreTeam1 && (
                                  <span className="ml-2 font-mono text-yellow-400/70 shrink-0 text-[10px]">{m.scoreTeam1} - {m.scoreTeam2}</span>
                                )}
                                {m.status === 'IN_PROGRESS' && (
                                  <span className="ml-1 shrink-0">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CUADRO DE ELIMINACIÓN */}
              {category.matches.length > 0 ? (
                <div className="overflow-x-auto pb-4 -mx-4 px-4">
                  <TournamentBracket matches={category.matches} format={category.format || tournament.format} />
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-2xl p-10 text-center text-slate-500 border border-slate-700/30">
                  Las llaves se publicarán una vez se cierren las inscripciones.
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}