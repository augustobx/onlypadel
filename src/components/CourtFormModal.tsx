'use client';

import { useState } from 'react';
import { Edit, Plus } from 'lucide-react';
import { Court } from '@prisma/client';
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
import { createCourt, updateCourt } from '@/actions/courts';

interface CourtFormModalProps {
  court?: Court;
}

export default function CourtFormModal({ court }: CourtFormModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: court?.name || '',
    sport: court?.sport || 'Padel',
    surface: court?.surface || 'Piso Sintético',
    isActive: court ? court.isActive : true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = court
        ? await updateCourt(court.id, formData)
        : await createCourt(formData);

      if (result.success) {
        setIsOpen(false);
        // Si estamos creando una nueva, limpiamos el formulario para la próxima vez
        if (!court) {
          setFormData({ name: '', sport: 'Padel', surface: 'Piso Sintético', isActive: true });
        }
      } else {
        setError(result.error || 'Ocurrió un error inesperado');
      }
    } catch (err) {
      console.error("Error en el submit:", err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {court ? (
        <DialogTrigger render={<Button variant="outline" size="icon" title="Editar Cancha" />}>
            <Edit className="h-4 w-4 text-slate-700 dark:text-slate-300" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" />}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Cancha
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{court ? 'Editar Cancha' : 'Nueva Cancha'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Cancha</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Cancha 1 - Cristal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport">Deporte</Label>
            <Input
              id="sport"
              value={formData.sport}
              onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              placeholder="Ej: Padel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="surface">Tipo de Superficie</Label>
            <Input
              id="surface"
              value={formData.surface}
              onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
              placeholder="Ej: Piso Sintético, Pavimento, Cemento"
              required
            />
          </div>

          <div className="flex items-center space-x-2 mt-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="isActive" className="cursor-pointer">Cancha habilitada para reservas</Label>
          </div>

          {error && (
            <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-2 border-t dark:border-slate-700 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
