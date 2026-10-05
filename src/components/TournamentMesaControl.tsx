'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { updateMatchScore, setMatchInProgress, resetMatchResult, updateMatchAssignment } from '@/actions/tournament-engine';
import { getCourts } from '@/actions/courts';
import { useRouter } from 'next/navigation';
import { Play, CheckCircle2, Clock, ChevronDown, RotateCcw, MapPin, Sparkles, Trophy } from 'lucide-react';
import type { CourtView, TournamentMatchView, TournamentView } from '@/lib/tournaments/types';
import { mirrorScore, validateScore, findTiedSet, resolveTiedSetScore } from '@/lib/tournaments/rules';

export default function TournamentMesaControl({ tournament }: { tournament: TournamentView }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [collapsedZones, setCollapsedZones] = useState<Record<string, boolean>>({});
  const [courts, setCourts] = useState<CourtView[]>([]);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Estados para Modal de Desempate por Tiebreak
  const [tiebreakModal, setTiebreakModal] = useState<{
    matchId: string;
    setIndex: number;
    tiedScore: number;
    rawScore: string;
    team1Name: string;
    team2Name: string;
    team1Id: string;
    team2Id: string;
  } | null>(null);
  const [tbPointsTeam1, setTbPointsTeam1] = useState<number>(7);
  const [tbPointsTeam2, setTbPointsTeam2] = useState<number>(5);
  const [tbGamesFormat, setTbGamesFormat] = useState<'7-6' | '8-7'>('7-6');

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

  // Espejar automáticamente el marcador y seleccionar el ganador en tiempo real
  const handleScoreInput = (matchId: string, teamNum: 1 | 2, team1Id: string | null, team2Id: string | null) => {
    const s1Input = document.getElementById(`s1-${matchId}`) as HTMLInputElement | null;
    const s2Input = document.getElementById(`s2-${matchId}`) as HTMLInputElement | null;
    const winnerSelect = document.getElementById(`w-${matchId}`) as HTMLSelectElement | null;
    if (!s1Input || !s2Input) return;

    const currentVal = teamNum === 1 ? s1Input.value : s2Input.value;
    const mirrored = mirrorScore(currentVal);

    if (teamNum === 1) {
      s2Input.value = mirrored;
    } else {
      s1Input.value = mirrored;
    }

    const s1Val = s1Input.value;
    const s2Val = s2Input.value;
    if (s1Val && s2Val && winnerSelect) {
      const evalRes = validateScore(s1Val, s2Val);
      if (evalRes.valid && evalRes.winner > 0) {
        const detectedWinnerId = evalRes.winner === 1 ? team1Id : team2Id;
        if (detectedWinnerId) {
          winnerSelect.value = detectedWinnerId;
        }
      }
    }
  };

  const handleConfirmTiebreak = async () => {
    if (!tiebreakModal) return;
    if (tbPointsTeam1 === tbPointsTeam2) {
      alert('El tiebreak debe tener un ganador (los puntos no pueden ser iguales).');
      return;
    }

    const { matchId, setIndex, rawScore, team1Id, team2Id } = tiebreakModal;
    const resolved = resolveTiedSetScore(rawScore, setIndex, tbPointsTeam1, tbPointsTeam2, tbGamesFormat);
    const resolvedWinnerId = resolved.winnerNum === 1 ? team1Id : team2Id;

    // Actualizar campos en pantalla
    const s1Input = document.getElementById(`s1-${matchId}`) as HTMLInputElement | null;
    const s2Input = document.getElementById(`s2-${matchId}`) as HTMLInputElement | null;
    const winnerSelect = document.getElementById(`w-${matchId}`) as HTMLSelectElement | null;
    if (s1Input) s1Input.value = resolved.scoreTeam1;
    if (s2Input) s2Input.value = resolved.scoreTeam2;
    if (winnerSelect) winnerSelect.value = resolvedWinnerId;

    setTiebreakModal(null);
    setLoading(matchId);
    const result = await updateMatchScore(matchId, resolved.scoreTeam1, resolved.scoreTeam2, resolvedWinnerId);
    setFeedback(result.success ? { type: 'success', message: '¡Partido finalizado con desempate por Tiebreak!' } : { type: 'error', message: result.error || 'No se pudo guardar el resultado.' });
    setLoading(null);
    router.refresh();
  };

  const handleUpdate = async (
    matchId: string, 
    team1Id?: string | null, 
    team2Id?: string | null, 
    team1Name?: string, 
    team2Name?: string
  ) => {
    let s1 = (document.getElementById(`s1-${matchId}`) as HTMLInputElement)?.value.trim() || '';
    let s2 = (document.getElementById(`s2-${matchId}`) as HTMLInputElement)?.value.trim() || '';
    let wId = (document.getElementById(`w-${matchId}`) as HTMLSelectElement)?.value || '';

    // Auto-espejar si solo se cargó un marcador
    if (s1 && !s2) {
      s2 = mirrorScore(s1);
      const s2Input = document.getElementById(`s2-${matchId}`) as HTMLInputElement | null;
      if (s2Input) s2Input.value = s2;
    } else if (s2 && !s1) {
      s1 = mirrorScore(s2);
      const s1Input = document.getElementById(`s1-${matchId}`) as HTMLInputElement | null;
      if (s1Input) s1Input.value = s1;
    }

    if (!s1 || !s2) {
      setFeedback({ type: 'error', message: 'Ingresá el resultado del partido (ej: 6-4 o 6-4 / 7-5).' });
      return;
    }

    // SI HAY UN SET EMPATADO (ej: 7-7, 6-6, 7 a 7): ABRIR DIALOG DE TIEBREAK
    const tiedSet = findTiedSet(s1);
    if (tiedSet) {
      setTiebreakModal({
        matchId,
        setIndex: tiedSet.setIndex,
        tiedScore: tiedSet.ownGames,
        rawScore: s1,
        team1Name: team1Name || 'Pareja 1',
        team2Name: team2Name || 'Pareja 2',
        team1Id: team1Id || '',
        team2Id: team2Id || '',
      });
      setTbPointsTeam1(7);
      setTbPointsTeam2(5);
      setTbGamesFormat(tiedSet.ownGames >= 7 ? '7-6' : '7-6');
      return;
    }

    // Auto-detectar ganador si no se seleccionó en el dropdown
    if (!wId && s1 && s2) {
      const evalRes = validateScore(s1, s2);
      if (evalRes.valid && evalRes.winner > 0) {
        wId = evalRes.winner === 1 ? (team1Id || '') : (team2Id || '');
        const winnerSelect = document.getElementById(`w-${matchId}`) as HTMLSelectElement | null;
        if (winnerSelect && wId) winnerSelect.value = wId;
      }
    }

    if (!wId) {
      setFeedback({ type: 'error', message: 'Seleccioná el ganador del partido.' });
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
                                <Input 
                                  id={`s1-${m.id}`} 
                                  type="text" 
                                  placeholder="6-4 / 7-5" 
                                  defaultValue={m.scoreTeam1 || ''} 
                                  onChange={() => handleScoreInput(m.id, 1, m.team1Id, m.team2Id)}
                                  className="w-28 text-center h-8 text-sm font-mono" 
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`flex-1 truncate text-sm ${m.team2?.name?.startsWith('Plaza') ? 'text-slate-400 italic' : 'font-medium'}`}>{m.team2?.name || 'TBD'}</span>
                                <Input 
                                  id={`s2-${m.id}`} 
                                  type="text" 
                                  placeholder="4-6 / 5-7" 
                                  defaultValue={m.scoreTeam2 || ''} 
                                  onChange={() => handleScoreInput(m.id, 2, m.team1Id, m.team2Id)}
                                  className="w-28 text-center h-8 text-sm font-mono" 
                                />
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded">
                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Escribí solo 1 resultado (<strong className="text-slate-700 dark:text-slate-200">6-4</strong> ó <strong className="text-slate-700 dark:text-slate-200">6-4 / 7-5</strong>); el rival y ganador se autocompletan.</span>
                              </p>
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
                                onClick={() => handleUpdate(m.id, m.team1Id, m.team2Id, m.team1?.name, m.team2?.name)}
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
                <span className="font-mono font-bold text-xs mr-2 bg-slate-100 dark:bg-slate-700/60 px-2 py-1 rounded text-slate-700 dark:text-slate-200">{m.scoreTeam1}</span>
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

      {/* MODAL DE DESEMPATE POR TIEBREAK */}
      {tiebreakModal && (
        <Dialog open={Boolean(tiebreakModal)} onOpenChange={() => setTiebreakModal(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Desempate por Tiebreak
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                El marcador tiene un set empatado ({tiebreakModal.tiedScore} a {tiebreakModal.tiedScore}). Ingresá los puntos del tiebreak para desempatar y definir automáticamente al ganador:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* FILA PAREJA 1 */}
              <div className={`p-3 rounded-xl border transition-all ${tbPointsTeam1 > tbPointsTeam2 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Pareja 1</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {tiebreakModal.team1Name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      value={tbPointsTeam1}
                      onChange={e => setTbPointsTeam1(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 h-10 text-center font-mono font-bold text-lg"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setTbPointsTeam1(7)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold hover:bg-slate-300"
                        title="Setear 7"
                      >
                        7
                      </button>
                      <button
                        type="button"
                        onClick={() => setTbPointsTeam1(10)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold hover:bg-slate-300"
                        title="Setear 10"
                      >
                        10
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FILA PAREJA 2 */}
              <div className={`p-3 rounded-xl border transition-all ${tbPointsTeam2 > tbPointsTeam1 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Pareja 2</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {tiebreakModal.team2Name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      value={tbPointsTeam2}
                      onChange={e => setTbPointsTeam2(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 h-10 text-center font-mono font-bold text-lg"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setTbPointsTeam2(5)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold hover:bg-slate-300"
                        title="Setear 5"
                      >
                        5
                      </button>
                      <button
                        type="button"
                        onClick={() => setTbPointsTeam2(8)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold hover:bg-slate-300"
                        title="Setear 8"
                      >
                        8
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORMATO DE GAMES RESULTANTES */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">Formato del set:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTbGamesFormat('7-6')}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${tbGamesFormat === '7-6' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    7-6 (Estándar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTbGamesFormat('8-7')}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${tbGamesFormat === '8-7' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    8-7 (Set a 7)
                  </button>
                </div>
              </div>

              {/* PREVIEW DEL GANADOR Y MARCADOR */}
              {tbPointsTeam1 !== tbPointsTeam2 ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Ganador: {tbPointsTeam1 > tbPointsTeam2 ? tiebreakModal.team1Name : tiebreakModal.team2Name}</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Marcador asignado: {tbPointsTeam1 > tbPointsTeam2 
                      ? `${tbGamesFormat} (${tbPointsTeam1}-${tbPointsTeam2})` 
                      : `${tbGamesFormat === '7-6' ? '6-7' : '7-8'} (${tbPointsTeam1}-${tbPointsTeam2})`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-center font-semibold">
                  ⚠️ El tiebreak no puede terminar empatado. Debe haber un ganador.
                </p>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTiebreakModal(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmTiebreak}
                disabled={tbPointsTeam1 === tbPointsTeam2 || loading === tiebreakModal.matchId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {loading === tiebreakModal.matchId ? 'Guardando...' : 'Confirmar y Finalizar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
