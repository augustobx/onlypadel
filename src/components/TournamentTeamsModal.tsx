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
import { Users, Trash2, DollarSign, UserPlus } from 'lucide-react';
import type { TournamentCategoryView } from '@/lib/tournaments/types';

export default function TournamentTeamsModal({ category, tournamentId }: { category: TournamentCategoryView; tournamentId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPaid, setLoadingPaid] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.player1Name || !formData.player1Phone || !formData.player2Name || !formData.player2Phone) return;
    setLoading(true);
    const result = await registerTeam(tournamentId, category.id, formData);
    if (!result.success) {
      alert(result.error || 'No se pudo agregar la pareja');
      setLoading(false);
      return;
    }
    setFormData({
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
    if (!confirm('¿Eliminar esta pareja inscripta?')) return;
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
          <Users className="w-4 h-4 mr-1" /> Inscriptos ({category.teams?.length || 0})
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inscriptos — {category.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* LISTA */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-2 text-left font-medium">#</th>
                  <th className="p-2 text-left font-medium">Pareja</th>
                  <th className="p-2 text-left font-medium">Jugador 1</th>
                  <th className="p-2 text-left font-medium">Jugador 2</th>
                  <th className="p-2 text-center font-medium">Pagó</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {category.teams?.map((t, idx: number) => (
                  <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2 text-slate-400 text-xs font-mono">{idx + 1}</td>
                    <td className="p-2 font-medium">{t.name || '-'}</td>
                    <td className="p-2">
                      <div>{t.player1?.name} {t.player1?.lastName || ''}</div>
                      {t.phone1 && <div className="text-[10px] text-slate-400">{t.phone1}</div>}
                    </td>
                    <td className="p-2">
                      <div>{t.player2?.name ? `${t.player2.name} ${t.player2.lastName || ''}` : t.phone2 || '-'}</div>
                      {t.phone2 && <div className="text-[10px] text-slate-400">{t.phone2}</div>}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleTogglePaid(t.id)}
                        disabled={loadingPaid === t.id}
                        className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
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
                    <td className="p-2">
                      <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!category.teams?.length && (
                  <tr><td colSpan={6} className="p-4 text-center text-slate-500">No hay inscriptos aún</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FORMULARIO MANUAL */}
          <form onSubmit={handleAdd} className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-500" />
                Agregar Pareja Manualmente
              </h3>
              <span className="text-[11px] text-slate-400">Si no existen, se crean como usuarios automáticamente</span>
            </div>

            <div>
              <Label className="text-xs font-bold">Nombre de la Pareja (opcional)</Label>
              <Input value={formData.teamName} onChange={e => setFormData({ ...formData, teamName: e.target.value })} placeholder="Ej: González / Pérez" className="h-9 text-sm" />
            </div>

            {/* J1 */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Jugador 1</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Jugador 2</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

            <Button type="submit" disabled={loading} size="sm" className="w-full font-bold">
              {loading ? 'Guardando...' : 'Agregar Pareja'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
