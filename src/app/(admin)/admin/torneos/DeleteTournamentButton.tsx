'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteTournament } from '@/actions/tournaments';
import { useRouter } from 'next/navigation';

export default function DeleteTournamentButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el torneo "${name}" y TODOS sus datos (categorías, equipos, partidos, zonas)?`)) return;
    setLoading(true);
    const res = await deleteTournament(id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Error al eliminar torneo');
    }
    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
      title="Eliminar torneo"
    >
      <Trash2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  );
}
