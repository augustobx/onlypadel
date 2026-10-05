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
          <Button type="button" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-md gap-2 rounded-xl text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>Asistente Inteligente de Torneos</span>
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl">
          <DialogHeader className="border-b border-slate-800 pb-4 text-left">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-white">
                    Asistente Inteligente de Torneo
                  </DialogTitle>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                    Automático
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Configura categoría, canchas, zonas y genera todo el cronograma de partidos automáticamente.
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* STEPPER PILLS - RESPONSIVE 2 COLS ON MOBILE, 4 COLS ON SM+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
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
                className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  step === s.stepNum 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-500/10' 
                    : step > s.stepNum
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                  step === s.stepNum
                    ? 'bg-emerald-500 text-slate-950'
                    : step > s.stepNum
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                }`}>
                  {s.stepNum}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">

            {/* PASO 1: GENERAL */}
            {step === 1 && (
              <div className="space-y-4">
                {!tournamentId && (
                  <div className="space-y-1.5">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fecha de Inicio</Label>
                    <Input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
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

                <div className="space-y-1.5">
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

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-slate-800/80">
                  <Button 
                    type="button" 
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-5"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCategoryType('CATEGORIA_UNICA')}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                        categoryType === 'CATEGORIA_UNICA'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-black text-sm flex items-center gap-2">
                        <span>Categoría Única</span>
                        {categoryType === 'CATEGORIA_UNICA' && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Ej: 7ma, 6ta, 5ta. Control estricto: nadie juega para abajo, máximo 1 categoría superior.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategoryType('SUMA')}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                        categoryType === 'SUMA'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-black text-sm flex items-center gap-2">
                        <span>Torneo por Suma</span>
                        {categoryType === 'SUMA' && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />}
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-400 mt-1.5 leading-relaxed">
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
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {VALID_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setBaseCategory(cat)}
                          className={`h-11 rounded-xl font-black text-xs sm:text-sm border transition-all flex items-center justify-center ${
                            baseCategory === cat
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Categoría seleccionada: <strong className="text-emerald-400">{CATEGORY_LABELS[baseCategory] || baseCategory}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Suma Objetivo (Límite del Nivel)
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[16, 15, 14, 13, 12, 11, 10, 9].map(sum => (
                        <button
                          key={sum}
                          type="button"
                          onClick={() => setTargetSum(sum)}
                          className={`h-11 px-3 rounded-xl font-black text-xs sm:text-sm border transition-all flex items-center justify-center ${
                            targetSum === sum
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          Suma {sum}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 mt-2 flex items-start gap-2 leading-relaxed">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        En <strong className="text-white">Suma {targetSum}</strong>: Se admiten parejas cuya suma sea mayor o igual a {targetSum} (ej: 8va [8] + 7ma [7] = 15). Parejas más fuertes (ej: 6ta+7ma=13) quedan bloqueadas por el sistema.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-4 border-t border-slate-800/80">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto rounded-xl border-slate-700 h-11">
                    ← Anterior
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep(3)}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-5"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {courts.map(court => {
                      const isSelected = selectedCourts.includes(court.id);
                      return (
                        <button
                          key={court.id}
                          type="button"
                          onClick={() => toggleCourt(court.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="font-bold text-xs truncate">{court.name}</span>
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ESTRUCTURA DE ZONAS Y PAREJAS - TOTALMENTE RESPONSIVE */}
                <div className="space-y-4 p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Cantidad de Zonas (Grupos)
                      </Label>
                      <span className="text-xs font-bold text-emerald-400">
                        {numZones} {numZones === 1 ? 'Zona' : 'Zonas'}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {[2, 3, 4, 6, 8].map(nz => (
                        <button
                          key={nz}
                          type="button"
                          onClick={() => setNumZones(nz)}
                          className={`h-11 rounded-xl font-black text-sm sm:text-base border transition-all flex items-center justify-center ${
                            numZones === nz 
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {nz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Parejas por Cada Zona
                      </Label>
                      <span className="text-xs font-bold text-emerald-400">
                        {teamsPerZone} Parejas/Zona
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {[
                        { count: 3, label: '3 Parejas', desc: '3 partidos por zona' },
                        { count: 4, label: '4 Parejas', desc: '6 partidos por zona' },
                      ].map(tp => (
                        <button
                          key={tp.count}
                          type="button"
                          onClick={() => setTeamsPerZone(tp.count)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            teamsPerZone === tp.count 
                              ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-black text-xs sm:text-sm flex items-center justify-between">
                            <span>{tp.label}</span>
                            {teamsPerZone === tp.count && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                            {tp.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RESUMEN DE ESTRUCTURA */}
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-300">
                  <div>
                    <div className="font-bold text-sm text-white">{totalTeams} Parejas en Total</div>
                    <div className="text-slate-400 text-[11px] sm:text-xs mt-0.5">
                      {numZones} Zonas de {teamsPerZone} parejas • {totalMatches} Partidos de zona
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1 shrink-0">
                    {selectedCourts.length} {selectedCourts.length === 1 ? 'Cancha' : 'Canchas'}
                  </Badge>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-4 border-t border-slate-800/80">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full sm:w-auto rounded-xl border-slate-700 h-11">
                    ← Anterior
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep(4)}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-5"
                  >
                    Siguiente: Horarios →
                  </Button>
                </div>
              </div>
            )}

            {/* PASO 4: HORARIOS Y CONFIRMACIÓN */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Día de Inicio de Partidos</Label>
                    <Input
                      type="date"
                      required
                      value={matchDate}
                      onChange={e => setMatchDate(e.target.value)}
                      className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[30, 40, 45, 60].map(dur => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setMatchDuration(dur)}
                        className={`h-11 rounded-xl font-black text-xs sm:text-sm border transition-all flex items-center justify-center ${
                          matchDuration === dur 
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20' 
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {dur} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* CARD DE RESUMEN FINAL */}
                <div className="p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 shrink-0" /> 
                    <span>Resumen del Fixture a Generar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-500 text-xs block">Torneo:</span>
                      <strong className="text-white truncate block">{name || tournamentName}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-500 text-xs block">Categoría:</span>
                      <strong className="text-emerald-400 truncate block">
                        {categoryType === 'CATEGORIA_UNICA' ? `${baseCategory} Categoría` : `Suma ${targetSum}`}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-500 text-xs block">Zonas y Plazas:</span>
                      <strong className="text-white block">{numZones} zonas ({totalTeams} plazas libres)</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-500 text-xs block">Fixture Automático:</span>
                      <strong className="text-white block">{totalMatches} partidos en {selectedCourts.length} canchas</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-800 text-[11px] sm:text-xs text-slate-400 space-y-1.5 leading-relaxed">
                    <p>
                      🔒 <strong>Privacidad de Plazas:</strong> Los jugadores podrán ver y elegir los horarios al inscribirse, pero no verán las parejas rivales hasta que presiones &ldquo;Publicar Zonas&rdquo;.
                    </p>
                    <p>
                      ⚙️ <strong>Control Total:</strong> Podrás mover parejas entre zonas, agregar, eliminar y reprogramar horarios cuando quieras.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-4 border-t border-slate-800/80">
                  <Button type="button" variant="outline" onClick={() => setStep(3)} className="w-full sm:w-auto rounded-xl border-slate-700 h-11">
                    ← Anterior
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black px-6 h-11 rounded-xl shadow-lg shadow-emerald-500/20 gap-2 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Generando Torneo y Fixture...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                        <span>Generar Torneo Completo</span>
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
