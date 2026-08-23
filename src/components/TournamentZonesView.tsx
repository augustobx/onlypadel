'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, Edit2, ArrowRightLeft, Globe, EyeOff, Check, X, 
  Trash2, MapPin, Calendar, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { 
  togglePublishZones, 
  renameTournamentGroup, 
  moveTeamToGroup, 
  updateMatchTimeAndCourt 
} from '@/actions/tournament-engine';
import { getCourts } from '@/actions/courts';
import TournamentZonesGeneratorModal from './TournamentZonesGeneratorModal';
import type { TournamentCategoryView, TournamentGroupView, CourtView } from '@/lib/tournaments/types';
import { format } from 'date-fns';

export default function TournamentZonesView({ 
  category, 
  tournamentStartDate, 
  onRefresh 
}: { 
  category: TournamentCategoryView; 
  tournamentStartDate: Date; 
  onRefresh: () => void;
}) {
  const [courts, setCourts] = useState<CourtView[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Estados para editar nombre de zona
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');

  // Estados para mover equipo
  const [movingPlacement, setMovingPlacement] = useState<{ id: string; teamName: string; currentGroupId: string } | null>(null);
  const [targetGroupId, setTargetGroupId] = useState('');

  // Estados para editar partido
  const [editingMatch, setEditingMatch] = useState<{
    id: string;
    team1Name: string;
    team2Name: string;
    dateStr: string;
    timeStr: string;
    courtId: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await getCourts();
      if (res.success && res.data) setCourts(res.data);
    })();
  }, []);

  const hasZones = category.groups && category.groups.length > 0;
  const isPublished = Boolean(category.isZonesPublished);

  // 1. Publicar / Ocultar zonas
  const handleTogglePublish = async () => {
    setLoading('publish');
    setFeedback(null);
    const nextState = !isPublished;
    const res = await togglePublishZones(category.id, nextState);
    if (res.success) {
      setFeedback({ 
        text: nextState ? '¡Zonas publicadas en la app para los jugadores!' : 'Zonas ocultadas (quedaron en borrador).', 
        type: 'success' 
      });
      onRefresh();
    } else {
      setFeedback({ text: res.error || 'Error al cambiar visibilidad', type: 'error' });
    }
    setLoading(null);
  };

  // 2. Renombrar zona
  const handleSaveGroupName = async (groupId: string) => {
    if (!editGroupName.trim()) return;
    setLoading(`rename_${groupId}`);
    const res = await renameTournamentGroup(groupId, editGroupName.trim());
    if (res.success) {
      setEditingGroupId(null);
      setEditGroupName('');
      onRefresh();
    } else {
      alert(res.error || 'Error al renombrar la zona');
    }
    setLoading(null);
  };

  // 3. Mover pareja a otra zona
  const handleMoveTeam = async () => {
    if (!movingPlacement || !targetGroupId) return;
    setLoading('move_team');
    const res = await moveTeamToGroup(category.id, movingPlacement.id, targetGroupId);
    if (res.success) {
      setMovingPlacement(null);
      setTargetGroupId('');
      setFeedback({ text: 'Pareja movida de zona y fixture actualizado.', type: 'success' });
      onRefresh();
    } else {
      alert(res.error || 'Error al mover la pareja');
    }
    setLoading(null);
  };

  // 4. Guardar horario de partido
  const handleSaveMatchSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setLoading('save_match');
    
    let isoString: string | null = null;
    if (editingMatch.dateStr && editingMatch.timeStr) {
      isoString = `${editingMatch.dateStr}T${editingMatch.timeStr}:00-03:00`;
    }

    const res = await updateMatchTimeAndCourt(editingMatch.id, isoString, editingMatch.courtId || null);
    if (res.success) {
      setEditingMatch(null);
      setFeedback({ text: 'Horario y cancha del partido guardados.', type: 'success' });
      onRefresh();
    } else {
      alert(res.error || 'Error al guardar horario');
    }
    setLoading(null);
  };

  const openMatchEditor = (m: any) => {
    let dateStr = '';
    let timeStr = '';
    if (m.startTime) {
      const d = new Date(m.startTime);
      dateStr = format(d, 'yyyy-MM-dd');
      timeStr = format(d, 'HH:mm');
    } else {
      dateStr = format(new Date(tournamentStartDate), 'yyyy-MM-dd');
      timeStr = '10:00';
    }

    setEditingMatch({
      id: m.id,
      team1Name: m.team1?.name || 'Pareja 1',
      team2Name: m.team2?.name || 'Pareja 2',
      dateStr,
      timeStr,
      courtId: m.courtId || ''
    });
  };

  return (
    <div className="p-6 border rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      
      {/* HEADER DE CATEGORÍA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-xl text-slate-900 dark:text-white">{category.name}</h3>
            {hasZones && (
              isPublished ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 font-bold">
                  <Globe className="w-3 h-3 mr-1" /> Publicada en App
                </Badge>
              ) : (
                <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 font-bold">
                  <EyeOff className="w-3 h-3 mr-1" /> En Borrador
                </Badge>
              )
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {hasZones ? `${category.groups.length} zonas configuradas` : 'Sin zonas generadas'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasZones && (
            <Button
              size="sm"
              variant={isPublished ? "outline" : "default"}
              onClick={handleTogglePublish}
              disabled={loading === 'publish'}
              className={isPublished ? "text-amber-600 border-amber-300 hover:bg-amber-50" : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"}
            >
              {isPublished ? (
                <><EyeOff className="w-4 h-4 mr-1.5" /> Ocultar (Pasar a Borrador)</>
              ) : (
                <><Globe className="w-4 h-4 mr-1.5" /> 📢 Publicar Zonas en App</>
              )}
            </Button>
          )}

          <TournamentZonesGeneratorModal 
            category={category} 
            tournamentStartDate={new Date(tournamentStartDate)} 
          />
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* GRID DE ZONAS */}
      {hasZones ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {category.groups.map((g) => {
            const groupMatches = category.matches
              ?.filter((m) => m.groupId === g.id)
              ?.sort((a, b) => {
                if (a.startTime && b.startTime) return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                return a.matchOrder - b.matchOrder;
              }) || [];

            const isEditingThisGroup = editingGroupId === g.id;

            return (
              <div key={g.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
                
                {/* CABECERA DE ZONA & RENOMBRAR */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  {isEditingThisGroup ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editGroupName}
                        onChange={e => setEditGroupName(e.target.value)}
                        placeholder="Nombre de la zona"
                        className="h-8 text-sm font-bold"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleSaveGroupName(g.id)}
                        disabled={loading === `rename_${g.id}`}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        title="Guardar nombre"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setEditingGroupId(null)}
                        className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-emerald-600 dark:text-emerald-400 text-base">{g.name}</h4>
                      <button
                        onClick={() => { setEditingGroupId(g.id); setEditGroupName(g.name); }}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                        title="Renombrar zona"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <span className="text-[11px] font-bold text-slate-400">{g.teams.length} parejas</span>
                </div>

                {/* TABLA DE PAREJAS Y BOTÓN MOVER */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Parejas en esta zona</p>
                  {g.teams.map((gt, i: number) => {
                    const otherGroups = category.groups.filter(x => x.id !== g.id);
                    return (
                      <div key={gt.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[55%]">
                          {i + 1}. {gt.team?.name || 'Pareja'}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px]">{gt.points || 0} pts</Badge>
                          {otherGroups.length > 0 && (
                            <button
                              onClick={() => {
                                setMovingPlacement({ id: gt.id, teamName: gt.team?.name || 'Pareja', currentGroupId: g.id });
                                setTargetGroupId(otherGroups[0].id);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-1 rounded-lg transition-colors border border-blue-200 dark:border-blue-800/60"
                              title="Mover a otra zona"
                            >
                              <ArrowRightLeft className="w-3 h-3" /> Mover
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* LISTA DE PARTIDOS Y ACOMODAR HORARIOS */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cronograma de Partidos</p>
                  {groupMatches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No hay partidos agendados en esta zona.</p>
                  ) : (
                    groupMatches.map((m) => {
                      const courtObj = courts.find(c => c.id === m.courtId);
                      const matchDate = m.startTime ? new Date(m.startTime) : null;

                      return (
                        <div 
                          key={m.id} 
                          className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400">{m.roundName || 'Fecha'}</span>
                            <button
                              onClick={() => openMatchEditor(m)}
                              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                            >
                              <Edit2 className="w-2.5 h-2.5" /> Cambiar Horario/Cancha
                            </button>
                          </div>

                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span className="truncate max-w-[45%]">{m.team1?.name || '?'}</span>
                            <span className="text-[10px] text-slate-400 font-normal">vs</span>
                            <span className="truncate max-w-[45%] text-right">{m.team2?.name || '?'}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                              <Clock className="w-3 h-3 text-emerald-500" />
                              {matchDate ? (
                                `${format(matchDate, 'd/MM')} • ${format(matchDate, 'HH:mm')} hs`
                              ) : (
                                'Sin horario'
                              )}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {courtObj?.name || 'Cancha sin asignar'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 bg-white dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="font-bold text-slate-600 dark:text-slate-300">Aún no se han generado zonas para esta categoría.</p>
          <p className="text-xs text-slate-400 mt-1">Hacé clic en &ldquo;Generar Zonas&rdquo; para armar el fixture.</p>
        </div>
      )}

      {/* MODAL MOVER PAREJA DE ZONA */}
      {movingPlacement && (
        <Dialog open={Boolean(movingPlacement)} onOpenChange={() => setMovingPlacement(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Mover Pareja de Zona</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Mover a <strong>{movingPlacement.teamName}</strong> hacia otra zona:
              </p>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Zona de Destino</Label>
                <select
                  value={targetGroupId}
                  onChange={e => setTargetGroupId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold"
                >
                  {category.groups
                    .filter(g => g.id !== movingPlacement.currentGroupId)
                    .map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.teams.length} parejas actuales)</option>
                    ))}
                </select>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                ⚠️ Al mover la pareja, el fixture de partidos de ambas zonas se actualizará automáticamente con los nuevos integrantes.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setMovingPlacement(null)}>Cancelar</Button>
                <Button 
                  size="sm" 
                  onClick={handleMoveTeam} 
                  disabled={loading === 'move_team' || !targetGroupId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {loading === 'move_team' ? 'Moviendo...' : 'Confirmar y Actualizar Fixture'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL EDITAR HORARIO Y CANCHA DE PARTIDO */}
      {editingMatch && (
        <Dialog open={Boolean(editingMatch)} onOpenChange={() => setEditingMatch(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Editar Horario de Partido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveMatchSchedule} className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 text-center">
                {editingMatch.team1Name} <span className="text-slate-400">vs</span> {editingMatch.team2Name}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">Fecha</Label>
                  <Input
                    type="date"
                    required
                    value={editingMatch.dateStr}
                    onChange={e => setEditingMatch({ ...editingMatch, dateStr: e.target.value })}
                    className="h-10 text-sm bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500">Hora</Label>
                  <Input
                    type="time"
                    required
                    value={editingMatch.timeStr}
                    onChange={e => setEditingMatch({ ...editingMatch, timeStr: e.target.value })}
                    className="h-10 text-sm bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Cancha</Label>
                <select
                  value={editingMatch.courtId}
                  onChange={e => setEditingMatch({ ...editingMatch, courtId: e.target.value })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">Sin cancha asignada</option>
                  {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingMatch(null)}>Cancelar</Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={loading === 'save_match'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {loading === 'save_match' ? 'Guardando...' : 'Guardar Horario'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
