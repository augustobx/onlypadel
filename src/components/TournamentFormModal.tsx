'use client';

import { useState } from 'react';
import { Edit, Plus } from 'lucide-react';
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
import { createTournament, updateTournament } from '@/actions/tournaments';
import type { TournamentFormatView } from '@/lib/tournaments/types';

type EditableTournament = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  entryFee: number | string | { toString(): string };
  isPublished: boolean;
  requireDeposit: boolean;
  depositAmount: number | string | { toString(): string };
  format: TournamentFormatView;
  maxTeams: number | null;
};

export default function TournamentFormModal({ tournament }: { tournament?: EditableTournament }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: tournament?.name || '',
    startDate: tournament?.startDate ? new Date(tournament.startDate).toISOString().split('T')[0] : '',
    endDate: tournament?.endDate ? new Date(tournament.endDate).toISOString().split('T')[0] : '',
    entryFee: tournament?.entryFee ? Number(tournament.entryFee) : 0,
    isPublished: tournament?.isPublished || false,
    requireDeposit: tournament?.requireDeposit || false,
    depositAmount: tournament?.depositAmount ? Number(tournament.depositAmount) : 0,
    format: tournament?.format || 'KNOCKOUT',
    maxTeams: tournament?.maxTeams || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSubmit = {
        ...formData,
        entryFee: Number(formData.entryFee),
        depositAmount: Number(formData.depositAmount),
        maxTeams: formData.maxTeams ? Number(formData.maxTeams) : null,
      };

      const result = tournament
        ? await updateTournament(tournament.id, dataToSubmit)
        : await createTournament(dataToSubmit);

      if (result.success) {
        setIsOpen(false);
        if (!tournament) {
          setFormData({
            name: '', startDate: '', endDate: '', entryFee: 0, 
            isPublished: false, requireDeposit: false, depositAmount: 0, 
            format: 'KNOCKOUT', maxTeams: ''
          });
        }
      } else {
        if (typeof result.error === 'string') {
          setError(result.error);
        } else {
          setError('Error de validación: Revisa los campos ingresados.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {tournament ? (
        <DialogTrigger render={<Button variant="outline" size="icon" title="Editar Torneo" />}>
            <Edit className="h-4 w-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" />}>
            <Plus className="mr-2 h-4 w-4" /> Crear Torneo
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tournament ? 'Editar Torneo' : 'Nuevo Torneo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Nombre del Torneo</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Inicio</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Fin</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Costo Inscripción ($)</Label>
              <Input
                type="number"
                min="0"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value as TournamentFormatView })}
              >
                <option value="KNOCKOUT">Eliminación Directa</option>
                <option value="ROUND_ROBIN">Zonas (Round Robin)</option>
                <option value="MIXED">Mixto</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cupo Máximo de Parejas (Opcional)</Label>
            <Input
              type="number"
              min="2"
              value={formData.maxTeams}
              onChange={(e) => setFormData({ ...formData, maxTeams: e.target.value })}
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md border space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireDeposit"
                checked={formData.requireDeposit}
                onChange={(e) => setFormData({ ...formData, requireDeposit: e.target.checked })}
              />
              <Label htmlFor="requireDeposit">Exigir seña por Mercado Pago</Label>
            </div>
            
            {formData.requireDeposit && (
              <div className="space-y-2 pl-6">
                <Label>Monto de la Seña ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
            />
            <Label htmlFor="isPublished" className="font-bold">Publicar torneo (Visible en la PWA)</Label>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

          <div className="pt-4 flex justify-end gap-2 border-t mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
