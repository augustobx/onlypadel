'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerTeam } from '@/actions/public-tournaments';
import { deleteTeam, toggleTeamPaid } from '@/actions/tournament-engine';
import { useRouter } from 'next/navigation';
import { Users, Trash2, DollarSign, UserPlus, Sparkles } from 'lucide-react';
import type { TournamentCategoryView } from '@/lib/tournaments/types';

export default function TournamentTeamsModal({ category, tournamentId }: { category: TournamentCategoryView; tournamentId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPaid, setLoadingPaid] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    teamId: '',
    teamName: '',
    player1Name: '',
    player1LastName: '',
    player1Dni: '',
    player1Phone: '',
    player2Name: '',
    player2LastName: '',
    player2Dni: '',
    player2Phone: '',
  });

  const realTeams = (category.teams || []).filter(t => t.player1?.phone !== 'DUMMY_PLAZA');
  const dummySlots = (category.teams || []).filter(t => t.player1?.phone === 'DUMMY_PLAZA');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.player1Name || !formData.player1Phone || !formData.player2Name || !formData.player2Phone) return;
    setLoading(true);
    const result = await registerTeam(tournamentId, category.id, {
      ...formData,
      teamId: formData.teamId && formData.teamId.length > 0 ? formData.teamId : undefined,
    });
    if (!result.success) {
      alert(result.error || 'No se pudo agregar la pareja');
      setLoading(false);
      return;
    }
    setFormData({
      teamId: '',
      teamName: '',
      player1Name: '',
      player1LastName: '',
      player1Dni: '',
      player1Phone: '',
      player2Name: '',
      player2LastName: '',
      player2Dni: '',
      player2Phone: '',
    });
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('¿Liberar o eliminar esta pareja inscripta?')) return;
    setLoading(true);
    const res = await deleteTeam(teamId);
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Error al eliminar pareja inscripta');
    }
  };

  const handleTogglePaid = async (teamId: string) => {
    setLoadingPaid(teamId);
    await toggleTeamPaid(teamId);
    setLoadingPaid(null);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Users className="w-4 h-4 mr-1.5" />
        Inscriptos ({realTeams.length}{dummySlots.length > 0 ? ` / ${category.teams?.length}` : ''})
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
                Inscriptos — {category.name}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {realTeams.length} {dummySlots.length > 0 ? `de ${category.teams?.length} parejas confirmadas` : 'parejas inscriptas'}
                {dummySlots.length > 0 && ` • ${dummySlots.length} plazas libres disponibles`}
              </p>
            </div>
            {dummySlots.length > 0 && (
              <span className="self-start sm:self-auto text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                {dummySlots.length} Cupos Libres
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {/* TABLA DE PAREJAS REALES */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5 text-left font-bold text-xs">#</th>
                    <th className="p-2.5 text-left font-bold text-xs">Pareja</th>
                    <th className="p-2.5 text-left font-bold text-xs">Jugador 1</th>
                    <th className="p-2.5 text-left font-bold text-xs">Jugador 2</th>
                    <th className="p-2.5 text-center font-bold text-xs">Pagó</th>
                    <th className="p-2.5 w-10 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {realTeams.map((t, idx: number) => {
                    const group = category.groups?.find(g => g.teams?.some(gt => gt.teamId === t.id) || g.id === t.preferredGroupId);
                    return (
                      <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-2.5 text-slate-400 text-xs font-mono">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{t.name || '-'}</div>
                          {group && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block mt-0.5">
                              {group.name}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-xs">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{t.player1?.name} {t.player1?.lastName || ''}</div>
                          {t.phone1 && <div className="text-[10px] text-slate-400 font-mono">{t.phone1}</div>}
                        </td>
                        <td className="p-2.5 text-xs">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{t.player2?.name ? `${t.player2.name} ${t.player2.lastName || ''}` : '-'}</div>
                          {t.phone2 && <div className="text-[10px] text-slate-400 font-mono">{t.phone2}</div>}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleTogglePaid(t.id)}
                            disabled={loadingPaid === t.id}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                              t.isPaid 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200' 
                                : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100'
                            }`}
                            title={t.isPaid ? 'Click para marcar como no pagado' : 'Click para marcar como pagado'}
                          >
                            {loadingPaid === t.id ? '...' : t.isPaid ? (
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Pagó</span>
                            ) : (
                              '❌ Debe'
                            )}
                          </button>
                        </td>
                        <td className="p-2.5 text-right">
                          <button 
                            onClick={() => handleDelete(t.id)} 
                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors" 
                            title="Liberar plaza o eliminar pareja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {realTeams.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                        <p className="font-bold text-slate-700 dark:text-slate-200">No hay parejas inscriptas aún</p>
                        {dummySlots.length > 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                            El torneo cuenta con <strong>{dummySlots.length} plazas disponibles</strong> en las zonas. Podés anotar parejas manualmente abajo o recibir inscripciones desde la app.
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">Usá el formulario de abajo para agregar una pareja.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RESUMEN DE PLAZAS LIBRES DISPONIBLES */}
          {dummySlots.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Plazas Libres Disponibles ({dummySlots.length})
                </span>
                <span className="text-[11px] text-slate-400">Listas para ser ocupadas en las zonas</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dummySlots.map(slot => {
                  const group = category.groups?.find(g => g.teams?.some(gt => gt.teamId === slot.id) || g.id === slot.preferredGroupId);
                  return (
                    <span key={slot.id} className="text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg shadow-2xs">
                      <strong className="text-slate-900 dark:text-white mr-1">{slot.name}</strong> 
                      {group && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">({group.name})</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* FORMULARIO MANUAL */}
          <form onSubmit={handleAdd} className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-slate-900 dark:text-white">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                Agregar Pareja Manualmente
              </h3>
              <span className="text-[11px] text-slate-400">Si no existen, se crean como usuarios automáticamente</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre de la Pareja (opcional)</Label>
                <Input 
                  value={formData.teamName} 
                  onChange={e => setFormData({ ...formData, teamName: e.target.value })} 
                  placeholder="Ej: González / Pérez" 
                  className="h-10 text-xs sm:text-sm mt-1" 
                />
              </div>

              {dummySlots.length > 0 && (
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Plaza o Zona a Ocupar</Label>
                  <select
                    value={formData.teamId}
                    onChange={e => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full h-10 mt-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">⚡ Asignar automáticamente a la 1ra plaza libre</option>
                    {dummySlots.map(slot => {
                      const group = category.groups?.find(g => g.teams?.some(gt => gt.teamId === slot.id) || g.id === slot.preferredGroupId);
                      return (
                        <option key={slot.id} value={slot.id}>
                          {slot.name} {group ? `— ${group.name}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* J1 */}
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Jugador 1</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-[11px]">Nombre</Label>
                  <Input required value={formData.player1Name} onChange={e => setFormData({ ...formData, player1Name: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[11px]">Apellido</Label>
                  <Input value={formData.player1LastName} onChange={e => setFormData({ ...formData, player1LastName: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[11px]">DNI</Label>
                  <Input value={formData.player1Dni} onChange={e => setFormData({ ...formData, player1Dni: e.target.value })} className="h-8 text-xs" placeholder="Sin puntos" />
                </div>
                <div>
                  <Label className="text-[11px]">Teléfono</Label>
                  <Input required type="tel" value={formData.player1Phone} onChange={e => setFormData({ ...formData, player1Phone: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* J2 */}
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Jugador 2</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-[11px]">Nombre</Label>
                  <Input required value={formData.player2Name} onChange={e => setFormData({ ...formData, player2Name: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[11px]">Apellido</Label>
                  <Input value={formData.player2LastName} onChange={e => setFormData({ ...formData, player2LastName: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[11px]">DNI</Label>
                  <Input value={formData.player2Dni} onChange={e => setFormData({ ...formData, player2Dni: e.target.value })} className="h-8 text-xs" placeholder="Sin puntos" />
                </div>
                <div>
                  <Label className="text-[11px]">Teléfono</Label>
                  <Input required type="tel" value={formData.player2Phone} onChange={e => setFormData({ ...formData, player2Phone: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              {loading ? 'Guardando pareja...' : 'Agregar Pareja'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
