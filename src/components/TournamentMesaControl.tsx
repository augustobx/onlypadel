'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { updateMatchScore, setMatchInProgress, resetMatchResult, updateMatchAssignment } from '@/actions/tournament-engine';
import { getCourts } from '@/actions/courts';
import { useRouter } from 'next/navigation';
import { Play, CheckCircle2, Clock, ChevronDown, RotateCcw, MapPin } from 'lucide-react';
import type { CourtView, TournamentMatchView, TournamentView } from '@/lib/tournaments/types';

export default function TournamentMesaControl({ tournament }: { tournament: TournamentView }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [collapsedZones, setCollapsedZones] = useState<Record<string, boolean>>({});
  const [courts, setCourts] = useState<CourtView[]>([]);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    getCourts().then(res => {
      if (res.success && res.data) setCourts(res.data);
    });
  }, []);

  const matches: TournamentMatchView[] = (tournament.categories || []).flatMap((c) =>
    (c.matches || []).map((m) => ({ ...m, categoryName: c.name }))
  );

  const pendingMatches = matches.filter((m) => m.status !== 'COMPLETED' && m.team1Id && m.team2Id);
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED' && m.scoreTeam1 !== 'BYE' && m.scoreTeam2 !== 'BYE');

  // Agrupar pendientes por zona
  const pendingByZone = pendingMatches.reduce<Record<string, TournamentMatchView[]>>((acc, m) => {
    const zoneName = m.group?.name || 'Fase Final';
    if (!acc[zoneName]) acc[zoneName] = [];
    acc[zoneName].push(m);
    return acc;
  }, {});

  const sortedZones = Object.keys(pendingByZone).sort((a, b) => {
    if (a === 'Fase Final') return 1;
    if (b === 'Fase Final') return -1;
    return a.localeCompare(b);
  });

  const toggleZone = (zoneName: string) => {
    setCollapsedZones(prev => ({ ...prev, [zoneName]: !prev[zoneName] }));
  };

  const handleStartMatch = async (matchId: string) => {
    setLoading(matchId);
    const result = await setMatchInProgress(matchId);
    setFeedback(result.success ? { type: 'success', message: 'Partido iniciado.' } : { type: 'error', message: result.error || 'No se pudo iniciar.' });
    setLoading(null);
    router.refresh();
  };

  const handleUpdate = async (matchId: string) => {
    const s1 = (document.getElementById(`s1-${matchId}`) as HTMLInputElement)?.value || '';
    const s2 = (document.getElementById(`s2-${matchId}`) as HTMLInputElement)?.value || '';
    const wId = (document.getElementById(`w-${matchId}`) as HTMLSelectElement)?.value || '';

    if (!wId) {
      alert("Seleccioná un ganador");
      return;
    }

    setLoading(matchId);
    const result = await updateMatchScore(matchId, s1, s2, wId);
    setFeedback(result.success ? { type: 'success', message: 'Resultado guardado.' } : { type: 'error', message: result.error || 'No se pudo guardar el resultado.' });
    setLoading(null);
    router.refresh();
  };

  // #12 — Resetear resultado
  const handleReset = async (matchId: string) => {
    if (!confirm('¿Revertir este resultado? Se limpiarán el score, ganador, estadísticas de zona y propagación al cuadro.')) return;
    setLoading(`reset_${matchId}`);
    const result = await resetMatchResult(matchId);
    setFeedback(result.success ? { type: 'success', message: 'Resultado revertido.' } : { type: 'error', message: result.error || 'No se pudo revertir.' });
    setLoading(null);
    router.refresh();
  };

  // #13 — Asignar cancha/horario
  const handleAssignment = async (matchId: string) => {
    const courtId = (document.getElementById(`court-${matchId}`) as HTMLSelectElement)?.value || '';
    const startTime = (document.getElementById(`time-${matchId}`) as HTMLInputElement)?.value || '';

    setLoading(`assign_${matchId}`);
    const result = await updateMatchAssignment(matchId, {
      courtId: courtId || null,
      startTime: startTime || null,
    });
    if (result.success) setEditingAssignment(null);
    setFeedback(result.success ? { type: 'success', message: 'Cancha y horario asignados.' } : { type: 'error', message: result.error || 'No se pudo asignar.' });
    setLoading(null);
    router.refresh();
  };

  if (matches.length === 0) {
    return <p className="text-slate-500 py-4 text-center">Generá un cuadro desde la sección de Categorías para empezar.</p>;
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div className={`rounded-xl border p-3 text-sm font-semibold ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {feedback.message}
        </div>
      )}
      {/* PARTIDOS ACTIVOS */}
      {pendingMatches.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" /> Partidos Pendientes / En Juego ({pendingMatches.length})
          </h3>
          <div className="space-y-6">
            {sortedZones.map(zoneName => {
              const zoneMatches = pendingByZone[zoneName];
              const isCollapsed = collapsedZones[zoneName];

              return (
                <div key={zoneName} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div 
                    className="bg-slate-100 dark:bg-slate-800 p-3 px-5 flex items-center justify-between cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => toggleZone(zoneName)}
                  >
                    <h4 className="font-black text-emerald-600 dark:text-emerald-400 text-lg uppercase tracking-wider flex items-center gap-2">
                      {zoneName}
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold ml-2">
                        {zoneMatches.length} partidos
                      </span>
                    </h4>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {!isCollapsed && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 bg-white dark:bg-slate-900/50">
                      {zoneMatches.map((m) => (
                        <Card key={m.id} className={`border-l-4 shadow-md hover:shadow-lg transition-shadow ${m.status === 'IN_PROGRESS' ? 'border-l-red-500' : 'border-l-blue-300'}`}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">{m.categoryName}</span>
                                {m.startTime && (
                                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(m.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                                  </span>
                                )}
                              </div>
                              <Badge variant={m.status === 'IN_PROGRESS' ? 'destructive' : 'secondary'} className="text-xs">
                                {m.status === 'IN_PROGRESS' ? '🔴 EN VIVO' : m.roundName || `Ronda ${m.round}`}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {/* FIX #4: optional chaining para evitar crash con team1/team2 null */}
                                <span className={`flex-1 truncate text-sm ${m.team1?.name?.startsWith('Plaza') ? 'text-slate-400 italic' : 'font-medium'}`}>{m.team1?.name || 'TBD'}</span>
                                <Input id={`s1-${m.id}`} type="text" placeholder="6-4 / 7-5" defaultValue={m.scoreTeam1 || ''} className="w-28 text-center h-8 text-sm" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`flex-1 truncate text-sm ${m.team2?.name?.startsWith('Plaza') ? 'text-slate-400 italic' : 'font-medium'}`}>{m.team2?.name || 'TBD'}</span>
                                <Input id={`s2-${m.id}`} type="text" placeholder="4-6 / 5-7" defaultValue={m.scoreTeam2 || ''} className="w-28 text-center h-8 text-sm" />
                              </div>
                            </div>

                            <select id={`w-${m.id}`} className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" defaultValue="">
                              <option value="">Seleccionar Ganador...</option>
                              {m.team1Id && <option value={m.team1Id}>{m.team1?.name}</option>}
                              {m.team2Id && <option value={m.team2Id}>{m.team2?.name}</option>}
                            </select>

                            {/* #13 — Asignar cancha/horario (solo partidos de fase final sin grupo) */}
                            {!m.groupId && (
                              <>
                                {editingAssignment === m.id ? (
                                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="grid grid-cols-2 gap-2">
                                      <select id={`court-${m.id}`} defaultValue={m.courtId || ''} className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs outline-none">
                                        <option value="">Sin cancha</option>
                                        {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                      </select>
                                      <Input id={`time-${m.id}`} type="datetime-local" defaultValue={m.startTime ? new Date(m.startTime).toISOString().slice(0, 16) : ''} className="h-8 text-xs" />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setEditingAssignment(null)}>Cancelar</Button>
                                      <Button size="sm" className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleAssignment(m.id)} disabled={loading === `assign_${m.id}`}>
                                        {loading === `assign_${m.id}` ? '...' : 'Guardar'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setEditingAssignment(m.id)}
                                    className="w-full text-xs text-slate-400 hover:text-blue-500 flex items-center justify-center gap-1 py-1 transition-colors"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    {m.courtId ? 'Cambiar cancha/hora' : 'Asignar cancha y horario'}
                                  </button>
                                )}
                              </>
                            )}

                            <div className="flex gap-2 pt-2">
                              {m.status === 'SCHEDULED' && (
                                <Button variant="outline" size="sm" onClick={() => handleStartMatch(m.id)} disabled={loading === m.id} className="flex-1">
                                  <Play className="w-3 h-3 mr-1" /> Iniciar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleUpdate(m.id)}
                                disabled={loading === m.id}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                {loading === m.id ? 'Guardando...' : 'Finalizar'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingMatches.length === 0 && (
        <p className="text-slate-500 py-4 text-center">No hay partidos pendientes. Todos los cruces fueron definidos.</p>
      )}

      {/* RESULTADOS CARGADOS */}
      {completedMatches.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Resultados Cargados ({completedMatches.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {completedMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-sm group">
                <div className="flex-1 min-w-0">
                  <span className={`${m.winnerId === m.team1Id ? 'font-bold text-emerald-600' : 'text-slate-500'}`}>{m.team1?.name}</span>
                  <span className="mx-2 text-slate-400">vs</span>
                  <span className={`${m.winnerId === m.team2Id ? 'font-bold text-emerald-600' : 'text-slate-500'}`}>{m.team2?.name}</span>
                </div>
                <span className="font-mono font-bold text-xs mr-2">{m.scoreTeam1} / {m.scoreTeam2}</span>
                {/* #12 — Botón resetear resultado */}
                <button
                  onClick={() => handleReset(m.id)}
                  disabled={loading === `reset_${m.id}`}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded"
                  title="Deshacer resultado"
                >
                  <RotateCcw className={`w-4 h-4 ${loading === `reset_${m.id}` ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
