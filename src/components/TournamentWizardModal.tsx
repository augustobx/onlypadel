'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getCourts } from '@/actions/courts';
import { createTournamentWithWizard } from '@/actions/tournaments';
import { VALID_CATEGORIES, CATEGORY_LABELS } from '@/lib/tournaments/category-rules';
import type { CourtView } from '@/lib/tournaments/types';
import { 
  Sparkles, 
  Calendar, 
  Trophy, 
  Users, 
  Clock, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface TournamentWizardModalProps {
  tournamentId?: string;
  tournamentName?: string;
  triggerButton?: React.ReactNode;
}

export default function TournamentWizardModal({
  tournamentId,
  tournamentName,
  triggerButton,
}: TournamentWizardModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courts, setCourts] = useState<CourtView[]>([]);
  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState(tournamentName || '');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 2 * 86400000), 'yyyy-MM-dd'));
  const [entryFee, setEntryFee] = useState(15000);

  // Category Configuration
  const [categoryType, setCategoryType] = useState<'CATEGORIA_UNICA' | 'SUMA'>('CATEGORIA_UNICA');
  const [baseCategory, setBaseCategory] = useState<string>('7ma');
  const [targetSum, setTargetSum] = useState<number>(15);

  // Courts and Structure
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [numZones, setNumZones] = useState<number>(4);
  const [teamsPerZone, setTeamsPerZone] = useState<number>(3);

  // Scheduling
  const [matchDate, setMatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [matchTime, setMatchTime] = useState('09:00');
  const [matchDuration, setMatchDuration] = useState<number>(45);

  useEffect(() => {
    if (open) {
      void (async () => {
        const res = await getCourts();
        if (res.success && res.data) {
          const activeCourts = res.data.filter(c => c.isActive !== false);
          setCourts(activeCourts);
          if (selectedCourts.length === 0) {
            setSelectedCourts(activeCourts.map(c => c.id));
          }
        }
      })();
    }
  }, [open]);

  const totalTeams = numZones * teamsPerZone;
  const matchesPerZone = (teamsPerZone * (teamsPerZone - 1)) / 2;
  const totalMatches = numZones * matchesPerZone;

  const toggleCourt = (courtId: string) => {
    setSelectedCourts(prev => 
      prev.includes(courtId) ? prev.filter(id => id !== courtId) : [...prev, courtId]
    );
  };

  const handleSelectAllCourts = () => {
    if (selectedCourts.length === courts.length) {
      setSelectedCourts([]);
    } else {
      setSelectedCourts(courts.map(c => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId && !name.trim()) {
      alert('Ingresá el nombre del torneo');
      return;
    }
    if (selectedCourts.length === 0) {
      alert('Seleccioná al menos una cancha para jugar los partidos');
      return;
    }

    setLoading(true);

    const startTimeCombined = `${matchDate}T${matchTime}:00`;

    const res = await createTournamentWithWizard({
      tournamentId,
      name: name.trim(),
      startDate,
      endDate,
      entryFee: Number(entryFee) || 0,
      categoryType,
      baseCategory,
      targetSum: Number(targetSum),
      courtIds: selectedCourts,
      numZones,
      teamsPerZone,
      startTime: startTimeCombined,
      matchDurationMinutes: matchDuration,
    });

    setLoading(false);

    if (res.success && res.data) {
      setOpen(false);
      router.push(`/admin/torneos/${res.data.tournamentId}`);
      router.refresh();
    } else {
      alert(res.error || 'Error al generar el torneo');
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {triggerButton || (
          <Button type="button" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-md gap-2">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            Asistente Inteligente de Torneos
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>

      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-800 text-white p-6 rounded-3xl">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Asistente Inteligente de Torneo
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Automático
                </Badge>
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Configura categoría, canchas, zonas y genera todo el cronograma de partidos automáticamente.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* STEPPER PILLS */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[
            { stepNum: 1, label: 'General' },
            { stepNum: 2, label: 'Categoría' },
            { stepNum: 3, label: 'Estructura' },
            { stepNum: 4, label: 'Horarios' },
          ].map(s => (
            <button
              key={s.stepNum}
              type="button"
              onClick={() => setStep(s.stepNum)}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                step === s.stepNum 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : step > s.stepNum
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              {s.stepNum}. {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">

          {/* PASO 1: GENERAL */}
          {step === 1 && (
            <div className="space-y-4">
              {!tournamentId && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Nombre del Torneo</Label>
                  <Input
                    required
                    placeholder="Ej: Torneo Primavera 2026 / Master OnlyPadel"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fecha de Inicio</Label>
                  <Input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fecha de Fin</Label>
                  <Input
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Precio de Inscripción por Pareja ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={entryFee}
                  onChange={e => setEntryFee(Number(e.target.value))}
                  className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl font-bold"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="button" 
                  onClick={() => setStep(2)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Siguiente: Categoría →
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: CATEGORÍA Y MODALIDAD */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Modalidad del Torneo</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategoryType('CATEGORIA_UNICA')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      categoryType === 'CATEGORIA_UNICA'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-black text-sm">Categoría Única</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Ej: 7ma, 6ta, 5ta. Control estricto: nadie juega para abajo, máximo 1 categoría superior.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategoryType('SUMA')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      categoryType === 'SUMA'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-black text-sm">Torneo por Suma</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Ej: Suma 15, Suma 13. La suma de las categorías de la pareja debe respetar el límite.
                    </div>
                  </button>
                </div>
              </div>

              {categoryType === 'CATEGORIA_UNICA' ? (
                <div className="space-y-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Seleccionar Categoría Base
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {VALID_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setBaseCategory(cat)}
                        className={`py-2.5 px-3 rounded-xl font-black text-sm border transition-all ${
                          baseCategory === cat
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Categoría seleccionada: <strong>{CATEGORY_LABELS[baseCategory] || baseCategory}</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Suma Objetivo (Límite del Nivel)
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[16, 15, 14, 13, 12, 11, 10, 9].map(sum => (
                      <button
                        key={sum}
                        type="button"
                        onClick={() => setTargetSum(sum)}
                        className={`py-2.5 px-3 rounded-xl font-black text-sm border transition-all ${
                          targetSum === sum
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Suma {sum}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 mt-2 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      En <strong>Suma {targetSum}</strong>: Se admiten parejas cuya suma sea mayor o igual a {targetSum} (ej: 8va [8] + 7ma [7] = 15). Parejas más fuertes (ej: 6ta+7ma=13) quedan bloqueadas por el sistema.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-xl border-slate-700">
                  ← Anterior
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Siguiente: Canchas y Zonas →
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: CANCHAS Y ESTRUCTURA */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Canchas Disponibles</Label>
                  <button
                    type="button"
                    onClick={handleSelectAllCourts}
                    className="text-xs text-emerald-400 hover:underline font-bold"
                  >
                    {selectedCourts.length === courts.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {courts.map(court => {
                    const isSelected = selectedCourts.includes(court.id);
                    return (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => toggleCourt(court.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold text-xs truncate">{court.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cantidad de Zonas</Label>
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 6, 8].map(nz => (
                      <button
                        key={nz}
                        type="button"
                        onClick={() => setNumZones(nz)}
                        className={`flex-1 py-2 rounded-xl font-black text-sm border ${
                          numZones === nz 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {nz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Parejas por Zona</Label>
                  <div className="flex items-center gap-2">
                    {[3, 4].map(tpz => (
                      <button
                        key={tpz}
                        type="button"
                        onClick={() => setTeamsPerZone(tpz)}
                        className={`flex-1 py-2 rounded-xl font-black text-sm border ${
                          teamsPerZone === tpz 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {tpz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RESUMEN DE ESTRUCTURA */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
                <div>
                  <div className="font-bold text-sm text-white">{totalTeams} Parejas en Total</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {numZones} Zonas de {teamsPerZone} parejas • {totalMatches} Partidos de zona
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1">
                  {selectedCourts.length} Canchas
                </Badge>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="rounded-xl border-slate-700">
                  ← Anterior
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setStep(4)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Siguiente: Horarios →
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4: HORARIOS Y CONFIRMACIÓN */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Día de Inicio de Partidos</Label>
                  <Input
                    type="date"
                    required
                    value={matchDate}
                    onChange={e => setMatchDate(e.target.value)}
                    className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hora de Inicio (1er Partido)</Label>
                  <Input
                    type="time"
                    required
                    value={matchTime}
                    onChange={e => setMatchTime(e.target.value)}
                    className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Duración Estimada por Partido</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 40, 45, 60].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setMatchDuration(dur)}
                      className={`py-2.5 rounded-xl font-black text-xs border ${
                        matchDuration === dur 
                          ? 'bg-emerald-500 text-white border-emerald-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {dur} min
                    </button>
                  ))}
                </div>
              </div>

              {/* CARD DE RESUMEN FINAL */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Resumen de lo que se creará:
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Torneo:</span>
                    <strong className="text-white">{name || tournamentName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Categoría:</span>
                    <strong className="text-emerald-400">
                      {categoryType === 'CATEGORIA_UNICA' ? `${baseCategory} Categoría` : `Suma ${targetSum}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Zonas y Plazas:</span>
                    <strong className="text-white">{numZones} zonas ({totalTeams} plazas libres)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fixture Automático:</span>
                    <strong className="text-white">{totalMatches} partidos en {selectedCourts.length} canchas</strong>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p>
                    🔒 <strong>Privacidad de Plazas:</strong> Los jugadores podrán ver y elegir los horarios al inscribirse, pero no verán las parejas rivales hasta que presiones &ldquo;Publicar Zonas&rdquo;.
                  </p>
                  <p>
                    ⚙️ <strong>Control Total:</strong> Podrás mover parejas entre zonas, agregar, eliminar y reprogramar horarios cuando quieras.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(3)} className="rounded-xl border-slate-700">
                  ← Anterior
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando Torneo y Fixture...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      Generar Torneo Completo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

        </form>
      </DialogContent>
    </Dialog>
  </>
);
}
