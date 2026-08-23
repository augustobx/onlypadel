'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateZonesAndSchedule } from '@/actions/tournament-engine';
import { getCourts } from '@/actions/courts';
import { Settings, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { CourtView, TournamentCategoryView } from '@/lib/tournaments/types';

type ZoneConfig = {
  name: string;
  dateStr: string;
  timeStr: string;
  intervalMinutes: number;
  courtId: string;
};

export default function TournamentZonesGeneratorModal({ category, tournamentStartDate }: { category: Pick<TournamentCategoryView, 'id' | 'name'>, tournamentStartDate: Date }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courts, setCourts] = useState<CourtView[]>([]);

  const [numZones, setNumZones] = useState(2);
  const [teamsPerZone, setTeamsPerZone] = useState(3);
  const [zonesConfig, setZonesConfig] = useState<ZoneConfig[]>([]);

  const buildZoneConfig = (count: number, courtList: CourtView[] = courts) => {
    const defaultDate = format(new Date(tournamentStartDate), 'yyyy-MM-dd');
    return Array.from({ length: count }).map((_, i) => ({
        name: `Zona ${String.fromCharCode(65 + i)}`,
        dateStr: defaultDate,
        timeStr: '09:00',
        intervalMinutes: 90,
        courtId: courtList.length > 0 ? (courtList[i % courtList.length]?.id || courtList[0]?.id || '') : ''
    }));
  };

  const handleOpen = async () => {
    const res = await getCourts();
    const fetchedCourts = (res.success && res.data) ? res.data : [];
    setCourts(fetchedCourts);
    setZonesConfig(buildZoneConfig(numZones, fetchedCourts));
    setOpen(true);
  };

  const handleConfigChange = <K extends keyof ZoneConfig>(index: number, field: K, value: ZoneConfig[K]) => {
    setZonesConfig((current) => current.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, [field]: value } : zone));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('¿Generar Zonas? Se reemplazará el fixture y partidos existentes en esta categoría.')) return;
    
    setLoading(true);

    const formattedConfig = zonesConfig.map(zc => ({
      name: zc.name,
      startTime: `${zc.dateStr}T${zc.timeStr}:00-03:00`,
      intervalMinutes: Number(zc.intervalMinutes) || 90,
      courtId: zc.courtId || null
    }));

    const res = await generateZonesAndSchedule(category.id, {
      numZones,
      teamsPerZone,
      zonesConfig: formattedConfig
    });

    if (res.success) {
      setOpen(false);
      window.location.reload();
    } else {
      alert(res.error || 'Error al generar zonas');
    }
    setLoading(false);
  };

  return (
    <>
      <Button variant="secondary" size="sm" className="whitespace-nowrap" onClick={handleOpen}>
        <Settings className="w-4 h-4 mr-1" /> Generar Zonas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold dark:text-white flex items-center gap-2">
            Configurar Zonas y Horarios - {category.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl text-sm border border-amber-200 dark:border-amber-800/50">
            <strong>Atención:</strong> Las parejas confirmadas se distribuirán de forma balanceada y los lugares restantes quedarán como plazas libres. El torneo tiene prioridad automática sobre las reservas de canchas.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-300 font-bold">Cantidad de Zonas</Label>
              <Input 
                type="number" min={1} max={16} 
                value={numZones} onChange={e => { const count = Number(e.target.value); setNumZones(count); setZonesConfig(buildZoneConfig(count)); }}
                className="bg-white dark:bg-slate-800 font-bold" required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-600 dark:text-slate-300 font-bold">Parejas por Zona (Plazas)</Label>
              <Input 
                type="number" min={2} max={6} 
                value={teamsPerZone} onChange={e => setTeamsPerZone(Number(e.target.value))}
                className="bg-white dark:bg-slate-800 font-bold" required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold border-b pb-2 dark:text-white dark:border-slate-800 text-sm">Configuración de Horarios por Zona</h3>
            {zonesConfig.map((zc, idx) => (
              <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-black text-emerald-600 dark:text-emerald-400">{zc.name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Inicio</Label>
                    <Input 
                      type="date" required value={zc.dateStr}
                      onChange={e => handleConfigChange(idx, 'dateStr', e.target.value)}
                      className="h-10 text-sm bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hora de Inicio</Label>
                    <Input 
                      type="time" required value={zc.timeStr}
                      onChange={e => handleConfigChange(idx, 'timeStr', e.target.value)}
                      className="h-10 text-sm bg-slate-50 dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duración Turno (min)</Label>
                    <Input 
                      type="number" required value={zc.intervalMinutes} min={45}
                      onChange={e => handleConfigChange(idx, 'intervalMinutes', Number(e.target.value))}
                      className="h-10 text-sm bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cancha</Label>
                    <select
                      required
                      value={zc.courtId}
                      onChange={e => handleConfigChange(idx, 'courtId', e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">Seleccionar cancha...</option>
                      {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Generar Zonas y Fixture
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
