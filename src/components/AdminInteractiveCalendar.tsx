'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, 
  Plus, User, Phone, Trash2, X, Lock, Repeat, CheckCircle2, AlertCircle, 
  Layers, Eye, Filter, Sparkles, RefreshCw, CalendarDays, LayoutGrid,
  CheckSquare, Square
} from 'lucide-react';
import { 
  getAdminCalendarData, getAdminCalendarWeekData, createAdminBooking, cancelAdminBooking, rescheduleAdminBooking, releaseFixedBookingOccurrence 
} from '@/actions/admin-calendar';
import { getMonthlyStats } from '@/actions/monthly-calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type CalendarViewMode = 'day' | 'week' | 'month';

interface Court {
  id: string;
  name: string;
  isActive: boolean;
  [key: string]: any;
}

interface SlotItem {
  time: string;
  endTime: string;
  status: 'FREE' | 'CONFIRMED' | 'PENDING' | 'FIXED' | 'BLOCKED' | 'CANCELLED' | string;
  booking?: any;
}

interface CourtDayData {
  court: Court | any;
  businessHour: any;
  slots: SlotItem[] | any[];
}

export default function AdminInteractiveCalendar({
  courts,
  initialDate,
  initialView = 'day',
  highlightBookingId
}: {
  courts: Court[];
  initialDate?: string;
  initialView?: CalendarViewMode;
  highlightBookingId?: string;
}) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialView);
  const [selectedCourt, setSelectedCourt] = useState<string>('ALL');
  const [currentDate, setCurrentDate] = useState<Date>(
    initialDate ? new Date(`${initialDate}T12:00:00`) : new Date()
  );

  // Data states
  const [dayData, setDayData] = useState<CourtDayData[]>([]);
  const [weekData, setWeekData] = useState<{ dateStr: string; dayIndex: number; dayData: CourtDayData[] }[]>([]);
  const [monthStats, setMonthStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal creation states
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slotData, setSlotData] = useState<{ 
    courtId: string; 
    courtName: string; 
    dateStr: string; 
    time: string; 
    endTime: string; 
  } | null>(null);

  // Modal reprogramación states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{
    bookingId: string;
    clientName: string;
    clientPhone: string;
    currentCourtId: string;
    currentCourtName: string;
    currentDateStr: string;
    currentTime: string;
    targetCourtId: string;
    targetDateStr: string;
    targetTime: string;
  } | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<{ time: string; endTime: string; status: string }[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<{
    clientName: string;
    clientPhone: string;
    type: 'RESERVA' | 'BLOQUEO' | 'FIJO';
    paymentMethod: 'CASH' | 'TRANSFER' | 'PENDING';
    amountPaid: number;
  }>({
    clientName: '',
    clientPhone: '',
    type: 'RESERVA',
    paymentMethod: 'CASH',
    amountPaid: 0,
  });

  const [fastBookingOpen, setFastBookingOpen] = useState(false);
  const [fastForm, setFastForm] = useState({
    courtId: courts[0]?.id || '',
    dateStr: format(currentDate, 'yyyy-MM-dd'),
    startTimeStr: '18:00',
    durationMins: 90,
    clientName: '',
    clientPhone: '',
    paymentMethod: 'CASH' as 'CASH' | 'TRANSFER' | 'PENDING',
    amountPaid: 0,
  });

  const formattedCurrentDate = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate]);

  // Load Data based on active view
  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'day') {
        const res = await getAdminCalendarData(selectedCourt, formattedCurrentDate);
        if (res.success && res.data) setDayData(res.data);
      } else if (viewMode === 'week') {
        const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
        const mondayStr = format(monday, 'yyyy-MM-dd');
        const res = await getAdminCalendarWeekData(selectedCourt, mondayStr);
        if (res.success && res.data) setWeekData(res.data);
      } else if (viewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const res = await getMonthlyStats(year, month);
        if (res.success && res.data) setMonthStats(res.data);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode, selectedCourt, formattedCurrentDate]);

  // Auto-scroll to highlighted booking if provided
  useEffect(() => {
    if (!loading && highlightBookingId) {
      setTimeout(() => {
        const el = document.getElementById(`booking-${highlightBookingId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [loading, highlightBookingId]);

  // Date Navigators
  const navigateStep = (direction: number) => {
    if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, direction));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => addWeeks(prev, direction));
    } else if (viewMode === 'month') {
      setCurrentDate(prev => addMonths(prev, direction));
    }
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
  };

  // Actions
  const openNewBookingModal = (courtId: string, courtName: string, dateStr: string, time: string, endTime: string) => {
    setSlotData({ courtId, courtName, dateStr, time, endTime });
    setFormData({ clientName: '', clientPhone: '', type: 'RESERVA', paymentMethod: 'CASH', amountPaid: 0 });
    setModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotData) return;
    setSubmitting(true);

    const res = await createAdminBooking({
      courtId: slotData.courtId,
      dateStr: slotData.dateStr,
      startTimeStr: slotData.time,
      endTimeStr: slotData.endTime,
      type: formData.type,
      clientName: (formData.type === 'RESERVA' || formData.type === 'FIJO') ? formData.clientName : undefined,
      clientPhone: (formData.type === 'RESERVA' || formData.type === 'FIJO') ? formData.clientPhone : undefined,
      paymentMethod: formData.type === 'RESERVA' ? formData.paymentMethod : undefined,
      amountPaid: formData.type === 'RESERVA' ? Number(formData.amountPaid) || 0 : undefined,
    });

    if (res.success) {
      setModalOpen(false);
      loadData();
    } else {
      alert(res.error || 'No se pudo guardar la reserva.');
    }
    setSubmitting(false);
  };

  const handleFastBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastForm.courtId || !fastForm.clientName) return;
    setSubmitting(true);

    const [hrs, mins] = fastForm.startTimeStr.split(':').map(Number);
    const startD = new Date(`${fastForm.dateStr}T${fastForm.startTimeStr}:00-03:00`);
    const endD = new Date(startD);
    endD.setMinutes(endD.getMinutes() + (Number(fastForm.durationMins) || 90));
    const endHrs = String(endD.getHours()).padStart(2, '0');
    const endMins = String(endD.getMinutes()).padStart(2, '0');
    const endTimeStr = `${endHrs}:${endMins}`;

    const res = await createAdminBooking({
      courtId: fastForm.courtId,
      dateStr: fastForm.dateStr,
      startTimeStr: fastForm.startTimeStr,
      endTimeStr,
      type: 'RESERVA',
      clientName: fastForm.clientName.trim(),
      clientPhone: fastForm.clientPhone.trim() || undefined,
      paymentMethod: fastForm.paymentMethod,
      amountPaid: Number(fastForm.amountPaid) || 0,
      notes: 'Mostrador Rápido',
    });

    if (res.success) {
      setFastBookingOpen(false);
      setFastForm(prev => ({ ...prev, clientName: '', clientPhone: '', amountPaid: 0 }));
      loadData();
    } else {
      alert(res.error || 'No se pudo registrar el turno express.');
    }
    setSubmitting(false);
  };

  const handleCancelBooking = async (id: string) => {
    if (confirm('¿Estás seguro de cancelar este turno? Si es un turno fijo o confirmado, se publicará un aviso en la PWA avisando que se liberó.')) {
      const res = await cancelAdminBooking(id, true);
      if (res.success) loadData();
    }
  };

  const openRescheduleModal = async (
    bookingId: string, 
    courtId: string, 
    courtName: string, 
    dateStr: string, 
    time: string, 
    clientName: string, 
    clientPhone?: string
  ) => {
    const initialData = {
      bookingId,
      clientName: clientName || 'Turno',
      clientPhone: clientPhone || '',
      currentCourtId: courtId,
      currentCourtName: courtName,
      currentDateStr: dateStr,
      currentTime: time,
      targetCourtId: courtId,
      targetDateStr: dateStr,
      targetTime: '',
    };
    setRescheduleData(initialData);
    setRescheduleModalOpen(true);
    fetchRescheduleSlots(courtId, dateStr, bookingId);
  };

  const fetchRescheduleSlots = async (courtId: string, dateStr: string, currentBookingId?: string) => {
    setLoadingRescheduleSlots(true);
    try {
      const res = await getAdminCalendarData(courtId, dateStr);
      if (res.success && res.data) {
        const courtMatch = res.data.find((c: any) => c.court.id === courtId);
        if (courtMatch) {
          setRescheduleSlots(courtMatch.slots.map((s: any) => ({
            time: s.time,
            endTime: s.endTime,
            status: s.booking?.id === currentBookingId ? 'FREE' : s.status,
          })));
        }
      }
    } catch {}
    setLoadingRescheduleSlots(false);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleData || !rescheduleData.targetTime) {
      alert('Por favor seleccioná el nuevo horario de destino.');
      return;
    }

    setRescheduleSubmitting(true);
    const res = await rescheduleAdminBooking({
      bookingId: rescheduleData.bookingId,
      newCourtId: rescheduleData.targetCourtId,
      newDateStr: rescheduleData.targetDateStr,
      newStartTimeStr: rescheduleData.targetTime,
    });

    if (res.success) {
      alert(res.message || 'Turno reprogramado exitosamente.');
      setRescheduleModalOpen(false);
      loadData();
    } else {
      alert(res.error || 'No se pudo reprogramar el turno.');
    }
    setRescheduleSubmitting(false);
  };

  // Estado para Liberación de Turnos de Abono Fijo
  const [releaseFixedModalOpen, setReleaseFixedModalOpen] = useState(false);
  const [releaseFixedData, setReleaseFixedData] = useState<{
    fixedBookingId: string;
    courtId: string;
    courtName: string;
    clientName: string;
    clientPhone: string;
    dateStr: string;
    time: string;
    endTime?: string;
    dayOfWeek: number;
    seriesDates: string[];
  } | null>(null);
  const [releaseScope, setReleaseScope] = useState<'single' | 'series'>('single');
  const [selectedSeriesDates, setSelectedSeriesDates] = useState<string[]>([]);
  const [notifyAppOnRelease, setNotifyAppOnRelease] = useState(true);
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);

  const openReleaseFixedModal = (slot: any, court: any, dateStr: string) => {
    const dow = slot.booking?.dayOfWeek !== undefined 
      ? slot.booking.dayOfWeek 
      : (new Date(`${dateStr}T12:00:00-03:00`).getDay());
    
    // Generar las próximas 8 semanas de esta serie
    const seriesDates: string[] = [];
    const baseDate = new Date(`${dateStr}T12:00:00-03:00`);
    for (let i = 0; i < 8; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (i * 7));
      const nextDateStr = format(nextDate, 'yyyy-MM-dd');
      seriesDates.push(nextDateStr);
    }

    setReleaseFixedData({
      fixedBookingId: slot.booking?.fixedBookingId || slot.booking?.id,
      courtId: court.id,
      courtName: court.name,
      clientName: slot.booking?.user?.name || 'Abonado',
      clientPhone: slot.booking?.user?.phone || '',
      dateStr,
      time: slot.time,
      endTime: slot.endTime,
      dayOfWeek: dow,
      seriesDates,
    });
    setReleaseScope('single');
    setSelectedSeriesDates([dateStr]);
    setNotifyAppOnRelease(true);
    setReleaseFixedModalOpen(true);
  };

  const toggleSeriesDate = (dStr: string) => {
    setSelectedSeriesDates(prev => 
      prev.includes(dStr) ? prev.filter(d => d !== dStr) : [...prev, dStr]
    );
  };

  const handleConfirmReleaseFixed = async () => {
    if (!releaseFixedData) return;

    const datesToRelease = releaseScope === 'single' 
      ? [releaseFixedData.dateStr] 
      : selectedSeriesDates;

    if (datesToRelease.length === 0) {
      alert('Por favor seleccioná al menos una fecha para liberar.');
      return;
    }

    setReleaseSubmitting(true);
    try {
      const res = await releaseFixedBookingOccurrence({
        fixedBookingId: releaseFixedData.fixedBookingId,
        courtId: releaseFixedData.courtId,
        dates: datesToRelease,
        startTimeStr: releaseFixedData.time,
        endTimeStr: releaseFixedData.endTime,
        notifyApp: notifyAppOnRelease,
        reason: 'Abono fijo liberado',
      });

      if (res.success) {
        setReleaseFixedModalOpen(false);
        await loadData();
      } else {
        alert(res.error || 'Error al liberar el turno.');
      }
    } catch (err: any) {
      alert('Ocurrió un error inesperado al liberar el turno.');
    } finally {
      setReleaseSubmitting(false);
    }
  };

  // Status color helpers
  const getSlotBadge = (status: SlotItem['status'], booking?: any, isReleased?: boolean) => {
    if (isReleased) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40">
          <Sparkles className="w-3 h-3 text-amber-600" /> Liberado
        </span>
      );
    }
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40">
            <CheckCircle2 className="w-3 h-3" /> Confirmado
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40">
            <AlertCircle className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'FIXED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300/40">
            <Repeat className="w-3 h-3" /> Abono Fijo
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/40">
            <Lock className="w-3 h-3" /> Bloqueado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Libre
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* TOOLBAR PRINCIPAL & NAVEGACIÓN */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-white dark:bg-slate-900 p-4 md:p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        
        {/* Controles de Fecha */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateStep(-1)} 
              className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={jumpToToday} 
              className="h-9 px-3 text-xs font-bold rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              Hoy
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigateStep(1)} 
              className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </Button>
          </div>

          <div className="flex items-center gap-2 font-black text-base md:text-lg text-slate-900 dark:text-white capitalize">
            <CalendarIcon className="h-5 w-5 text-[var(--color-primary)]" />
            {viewMode === 'day' && format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
            {viewMode === 'week' && (
              <span>
                Semana {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: es })} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}
              </span>
            )}
            {viewMode === 'month' && format(currentDate, "MMMM yyyy", { locale: es })}
          </div>
        </div>

        {/* Filtros y Selector de Vistas */}
        <div className="flex flex-wrap items-center gap-3 justify-end">
          {/* Selector de Cancha */}
          <select
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
            className="h-10 px-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="ALL">🌟 Todas las Canchas</option>
            {courts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Selector de Modo: Día / Semana / Mes */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => {
              const isActive = viewMode === mode;
              const label = mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes';
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Botón Turno Express Mostrador */}
          <Button
            type="button"
            onClick={() => {
              setFastForm(prev => ({
                ...prev,
                dateStr: format(currentDate, 'yyyy-MM-dd'),
                courtId: selectedCourt !== 'ALL' ? selectedCourt : (courts[0]?.id || ''),
              }));
              setFastBookingOpen(true);
            }}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Turno Rápido</span>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={loadData} 
            className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            title="Recargar datos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
          </Button>
        </div>
      </div>

      {/* RENDER DE LA VISTA SELECCIONADA */}
      
      {/* 1. VISTA DÍA */}
      {viewMode === 'day' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : dayData.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 font-bold">No hay horarios configurados para este día.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
              {dayData.map(({ court, slots }) => (
                <div 
                  key={court.id} 
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
                      <h2 className="text-lg font-black text-slate-800 dark:text-white">{court.name}</h2>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {slots.filter(s => s.status !== 'FREE').length} / {slots.length} turnos
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                    {slots.map((slot, idx) => {
                      const isOccupied = slot.status !== 'FREE';
                      return (
                        <div 
                          key={idx}
                          id={slot.booking?.id ? `booking-${slot.booking.id}` : undefined}
                          className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                            isOccupied
                              ? slot.status === 'BLOCKED'
                                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                : slot.status === 'FIXED'
                                ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40'
                                : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                              : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {slot.time} - {slot.endTime}
                            </div>
                            <div className="min-w-0">
                              {isOccupied ? (
                                <div className="truncate">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {slot.booking?.user?.name || 'Cliente'}
                                  </p>
                                  {slot.booking?.user?.phone && slot.booking.user.phone !== 'ADMIN_LOCAL' && (
                                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5" /> {slot.booking.user.phone}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Disponible</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {getSlotBadge(slot.status, slot.booking, slot.isReleased)}
                            {isOccupied ? (
                              slot.booking?.id && (
                                <div className="flex items-center gap-1">
                                  {slot.status === 'FIXED' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openReleaseFixedModal(slot, court, formattedCurrentDate)}
                                      className="h-7 px-2.5 text-xs font-bold rounded-lg border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/60 flex items-center gap-1 shadow-xs active:scale-95"
                                      title="Liberar este turno fijo para que aparezca en la app"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                      <span>Liberar</span>
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openRescheduleModal(
                                          slot.booking.id,
                                          court.id,
                                          court.name,
                                          formattedCurrentDate,
                                          slot.time,
                                          slot.booking.user?.name || '',
                                          slot.booking.user?.phone || ''
                                        )}
                                        className="h-7 w-7 text-slate-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg"
                                        title="Reprogramar turno"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleCancelBooking(slot.booking.id)}
                                        className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg"
                                        title="Cancelar turno"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openNewBookingModal(court.id, court.name, formattedCurrentDate, slot.time, slot.endTime)}
                                className="h-7 px-2.5 text-xs font-bold rounded-lg border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Reservar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. VISTA SEMANA */}
      {viewMode === 'week' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-7 gap-3">
                {weekData.map((dayItem) => {
                  const dayDate = parseISO(dayItem.dateStr);
                  const isToday = isSameDay(dayDate, new Date());
                  const totalSlots = dayItem.dayData.reduce((acc, c) => acc + c.slots.length, 0);
                  const occupiedSlots = dayItem.dayData.reduce(
                    (acc, c) => acc + c.slots.filter(s => s.status !== 'FREE').length, 0
                  );

                  return (
                    <div 
                      key={dayItem.dateStr} 
                      className={`flex flex-col rounded-2xl border transition-all ${
                        isToday 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 shadow-sm' 
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                      }`}
                    >
                      {/* Cabecera del día */}
                      <div className={`p-3 text-center border-b ${
                        isToday ? 'border-[var(--color-primary)]/30' : 'border-slate-200 dark:border-slate-800'
                      }`}>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {format(dayDate, 'EEEE', { locale: es })}
                        </p>
                        <p className={`text-xl font-black mt-0.5 ${
                          isToday ? 'text-[var(--color-primary)]' : 'text-slate-800 dark:text-slate-100'
                        }`}>
                          {format(dayDate, 'd')}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-1">
                          {occupiedSlots} / {totalSlots} turnos
                        </p>
                      </div>

                      {/* Lista de slots del día */}
                      <div className="p-2 space-y-1.5 flex-1 max-h-[500px] overflow-y-auto">
                        {dayItem.dayData.flatMap((c) => c.slots.map(s => ({ ...s, courtName: c.court.name, courtId: c.court.id }))).length === 0 ? (
                          <div className="py-8 text-center text-[11px] text-slate-400 font-medium">
                            Sin turnos
                          </div>
                        ) : (
                          dayItem.dayData.flatMap(c => c.slots.map(s => ({ ...s, courtName: c.court.name, courtId: c.court.id }))).map((slot, idx) => {
                            const isOccupied = slot.status !== 'FREE';
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (!isOccupied) {
                                    openNewBookingModal(slot.courtId, slot.courtName, dayItem.dateStr, slot.time, slot.endTime);
                                  } else if (slot.status === 'FIXED') {
                                    openReleaseFixedModal(slot, { id: slot.courtId, name: slot.courtName }, dayItem.dateStr);
                                  }
                                }}
                                className={`p-2 rounded-xl text-left transition-all text-xs border ${
                                  isOccupied
                                    ? slot.status === 'BLOCKED'
                                      ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-900/60'
                                      : slot.status === 'FIXED'
                                      ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-900/60 hover:ring-2 hover:ring-purple-400 cursor-pointer'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-900/60'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400 cursor-pointer shadow-xs'
                                }`}
                              >
                                <div className="flex items-center justify-between font-black text-[10px]">
                                  <span>{slot.time}</span>
                                  <span className="opacity-75">{slot.courtName}</span>
                                </div>
                                {isOccupied ? (
                                  <div className="flex items-center justify-between mt-0.5">
                                    <p className="font-bold text-[11px] truncate">
                                      {slot.booking?.user?.name || (slot.status === 'BLOCKED' ? 'Bloqueo' : 'Turno')}
                                    </p>
                                    {slot.status === 'FIXED' && (
                                      <span className="text-[9px] font-black uppercase text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-900/60 px-1.5 py-0.5 rounded ml-1 shrink-0">
                                        Liberar
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                    <Plus className="w-2.5 h-2.5" /> Libre
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. VISTA MES */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-center py-3">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <span key={d} className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Grilla Mensual */}
          {loading ? (
            <div className="flex items-center justify-center py-28">
              <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {(() => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(monthStart);
                const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

                const days = [];
                let day = startDate;

                while (day <= endDate) {
                  const currentClone = day;
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isCurrentM = isSameMonth(day, monthStart);
                  const isToday = isSameDay(day, new Date());
                  const bookingsCount = monthStats[dateKey] || 0;

                  days.push(
                    <div
                      key={day.toString()}
                      onClick={() => {
                        setCurrentDate(currentClone);
                        setViewMode('day');
                      }}
                      className={`min-h-[110px] md:min-h-[130px] p-2.5 transition-all cursor-pointer flex flex-col justify-between group ${
                        !isCurrentM 
                          ? 'bg-slate-50/40 dark:bg-slate-950/40 opacity-40 text-slate-400' 
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isToday 
                            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md shadow-[var(--color-primary)]/30' 
                            : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-800'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {bookingsCount > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {bookingsCount}
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        {bookingsCount > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block truncate">
                              {bookingsCount} {bookingsCount === 1 ? 'turno' : 'turnos'}
                            </span>
                            <div className="flex gap-1">
                              {Array.from({ length: Math.min(bookingsCount, 5) }).map((_, i) => (
                                <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Ver día
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  day = addDays(day, 1);
                }
                return days;
              })()}
            </div>
          )}
        </div>
      )}

      {/* MODAL PARA CREAR RESERVA / BLOQUEO / ABONO FIJO */}
      {modalOpen && slotData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Nueva Operación</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {slotData.courtName} • {slotData.dateStr} • {slotData.time} a {slotData.endTime}
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              
              {/* Selector de Tipo */}
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                {(['RESERVA', 'FIJO', 'BLOQUEO'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                    className={`py-2 text-xs font-black rounded-xl transition-all ${
                      formData.type === t
                        ? t === 'BLOQUEO'
                          ? 'bg-rose-500 text-white shadow-md'
                          : t === 'FIJO'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {t === 'RESERVA' ? 'Reserva' : t === 'FIJO' ? 'Abono Fijo' : 'Bloqueo'}
                  </button>
                ))}
              </div>

              {formData.type !== 'BLOQUEO' ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="clientName" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nombre del Jugador / Cliente
                    </Label>
                    <Input
                      id="clientName"
                      required
                      placeholder="Ej: Juan Pérez"
                      value={formData.clientName}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="clientPhone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Teléfono WhatsApp (Opcional)
                    </Label>
                    <Input
                      id="clientPhone"
                      placeholder="Ej: 549..."
                      value={formData.clientPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  {formData.type === 'RESERVA' && (
                    <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Cobro de Mostrador
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'CASH', label: '💵 Efectivo' },
                          { id: 'TRANSFER', label: '📲 Transf.' },
                          { id: 'PENDING', label: '⏳ Pendiente' },
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: m.id as any }))}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                              formData.paymentMethod === m.id
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div className="pt-1">
                        <Input
                          type="number"
                          placeholder="Monto cobrado ($)"
                          value={formData.amountPaid || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, amountPaid: Number(e.target.value) || 0 }))}
                          className="rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === 'FIJO' && (
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/50">
                      ℹ️ Se creará un abono semanal recurrente por 24 semanas para este día y horario.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="blockReason" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Motivo del Bloqueo
                  </Label>
                  <Input
                    id="blockReason"
                    placeholder="Ej: Mantenimiento, Lluvia, Torneo"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold hover:opacity-90"
                >
                  {submitting ? 'Guardando...' : 'Confirmar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TURNO RÁPIDO / MOSTRADOR EXPRESS */}
      {fastBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Turno Rápido en Mostrador
                  </h3>
                  <p className="text-xs text-slate-500">Carga veloz para llamadas o recepción</p>
                </div>
              </div>
              <button 
                onClick={() => setFastBookingOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFastBookingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cancha</Label>
                  <select
                    value={fastForm.courtId}
                    onChange={(e) => setFastForm(prev => ({ ...prev, courtId: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    required
                  >
                    {courts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Fecha</Label>
                  <Input
                    type="date"
                    value={fastForm.dateStr}
                    onChange={(e) => setFastForm(prev => ({ ...prev, dateStr: e.target.value }))}
                    className="rounded-xl text-xs h-10 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Horario de Inicio</Label>
                  <Input
                    type="time"
                    value={fastForm.startTimeStr}
                    onChange={(e) => setFastForm(prev => ({ ...prev, startTimeStr: e.target.value }))}
                    className="rounded-xl text-xs h-10 font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Duración</Label>
                  <select
                    value={fastForm.durationMins}
                    onChange={(e) => setFastForm(prev => ({ ...prev, durationMins: Number(e.target.value) }))}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value={60}>60 minutos (1 hora)</option>
                    <option value={90}>90 minutos (1.5 hs)</option>
                    <option value={120}>120 minutos (2 hs)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre del Jugador</Label>
                <Input
                  required
                  placeholder="Ej: Martínez / Los Pérez"
                  value={fastForm.clientName}
                  onChange={(e) => setFastForm(prev => ({ ...prev, clientName: e.target.value }))}
                  className="rounded-xl font-bold"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Teléfono (Opcional)</Label>
                <Input
                  placeholder="Ej: 11 2345 6789"
                  value={fastForm.clientPhone}
                  onChange={(e) => setFastForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                  className="rounded-xl text-xs"
                />
              </div>

              {/* Cobro */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Cobro de Mostrador
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'CASH', label: '💵 Efectivo' },
                    { id: 'TRANSFER', label: '📲 Transf.' },
                    { id: 'PENDING', label: '⏳ Pendiente' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFastForm(prev => ({ ...prev, paymentMethod: m.id as any }))}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                        fastForm.paymentMethod === m.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="pt-1">
                  <Input
                    type="number"
                    placeholder="Monto cobrado ($)"
                    value={fastForm.amountPaid || ''}
                    onChange={(e) => setFastForm(prev => ({ ...prev, amountPaid: Number(e.target.value) || 0 }))}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFastBookingOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !fastForm.clientName.trim()}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20"
                >
                  {submitting ? 'Creando...' : '⚡ Confirmar Turno'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REPROGRAMACIÓN DE TURNOS */}
      {rescheduleModalOpen && rescheduleData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Reprogramar Turno</h3>
                  <p className="text-xs text-slate-400">Mover reserva a otra cancha, día u horario</p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detalle Actual */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Jugador:</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{rescheduleData.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Turno Actual:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {rescheduleData.currentCourtName} • {rescheduleData.currentDateStr} • {rescheduleData.currentTime} hs
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Cancha de destino */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Cancha de Destino
                </Label>
                <select
                  value={rescheduleData.targetCourtId}
                  onChange={(e) => {
                    const newCourtId = e.target.value;
                    setRescheduleData(prev => prev ? ({ ...prev, targetCourtId: newCourtId, targetTime: '' }) : null);
                    fetchRescheduleSlots(newCourtId, rescheduleData.targetDateStr, rescheduleData.bookingId);
                  }}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200"
                >
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Fecha de destino */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Fecha de Destino
                </Label>
                <input
                  type="date"
                  value={rescheduleData.targetDateStr}
                  onChange={(e) => {
                    const newDateStr = e.target.value;
                    setRescheduleData(prev => prev ? ({ ...prev, targetDateStr: newDateStr, targetTime: '' }) : null);
                    fetchRescheduleSlots(rescheduleData.targetCourtId, newDateStr, rescheduleData.bookingId);
                  }}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Horarios disponibles */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Horario de Destino
                </Label>
                {loadingRescheduleSlots ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Consultando horarios libres...
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    No hay turnos disponibles para esta fecha.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1">
                    {rescheduleSlots.map((s, idx) => {
                      const isFree = s.status === 'FREE';
                      const isSelected = rescheduleData.targetTime === s.time;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isFree}
                          onClick={() => setRescheduleData(prev => prev ? ({ ...prev, targetTime: s.time }) : null)}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                              : isFree
                              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600'
                              : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-transparent cursor-not-allowed opacity-40'
                          }`}
                        >
                          {s.time} hs
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleModalOpen(false)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={rescheduleSubmitting || !rescheduleData.targetTime}
                onClick={handleConfirmReschedule}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-600/20"
              >
                {rescheduleSubmitting ? 'Reprogramando...' : 'Confirmar Cambio'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LIBERACIÓN DE ABONO FIJO */}
      {releaseFixedModalOpen && releaseFixedData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Liberar Turno de Abono Fijo</h3>
                  <p className="text-xs text-slate-500">Publicá este horario en la app para que otros socios lo puedan reservar.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReleaseFixedModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ficha Resumen del Abono */}
            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-800 dark:text-purple-300 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> {releaseFixedData.clientName}
                </span>
                {releaseFixedData.clientPhone && (
                  <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {releaseFixedData.clientPhone}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-purple-200/40 dark:border-purple-900/40">
                <span className="font-semibold">{releaseFixedData.courtName}</span>
                <span className="font-black text-purple-700 dark:text-purple-300">
                  {releaseFixedData.time} {releaseFixedData.endTime ? `- ${releaseFixedData.endTime}` : ''} hs
                </span>
              </div>
            </div>

            {/* Opciones de Alcance: Solo esta fecha o más de la serie */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ¿Qué turnos deseas liberar?
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setReleaseScope('single')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    releaseScope === 'single'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>Solo este día</span>
                    {releaseScope === 'single' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 capitalize">
                    {format(new Date(`${releaseFixedData.dateStr}T12:00:00-03:00`), "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReleaseScope('series');
                    if (selectedSeriesDates.length <= 1) {
                      setSelectedSeriesDates(releaseFixedData.seriesDates.slice(0, 4));
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    releaseScope === 'series'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>Múltiples de la serie</span>
                    {releaseScope === 'series' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Elegir varias semanas de este abono
                  </p>
                </button>
              </div>

              {/* Selector de fechas de la serie */}
              {releaseScope === 'series' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Seleccioná las fechas ({selectedSeriesDates.length} seleccionadas):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSeriesDates.length === releaseFixedData.seriesDates.length) {
                          setSelectedSeriesDates([releaseFixedData.dateStr]);
                        } else {
                          setSelectedSeriesDates([...releaseFixedData.seriesDates]);
                        }
                      }}
                      className="text-[11px] font-bold text-purple-600 hover:underline"
                    >
                      {selectedSeriesDates.length === releaseFixedData.seriesDates.length ? 'Desmarcar' : 'Todas'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {releaseFixedData.seriesDates.map((dStr) => {
                      const isChecked = selectedSeriesDates.includes(dStr);
                      const dateObj = new Date(`${dStr}T12:00:00-03:00`);
                      const label = format(dateObj, "EEE d 'de' MMM", { locale: es });
                      return (
                        <button
                          key={dStr}
                          type="button"
                          onClick={() => toggleSeriesDate(dStr)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all border text-left ${
                            isChecked
                              ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <span className="capitalize">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox de Publicación en la App y Notificación Push */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <input
                type="checkbox"
                id="notifyAppOnRelease"
                checked={notifyAppOnRelease}
                onChange={(e) => setNotifyAppOnRelease(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
              />
              <label htmlFor="notifyAppOnRelease" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <span className="font-bold text-slate-900 dark:text-white block">Publicar en el tablón de la App y avisar a los socios</span>
                Muestra el turno como &quot;⚡ ¡Se liberó un turno!&quot; en la PWA y envía una notificación Web Push a los jugadores para que lo reserven online.
              </label>
            </div>

            {/* Acciones del Modal */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReleaseFixedModalOpen(false)}
                className="flex-1 rounded-2xl h-11"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={releaseSubmitting || (releaseScope === 'series' && selectedSeriesDates.length === 0)}
                onClick={handleConfirmReleaseFixed}
                className="flex-1 rounded-2xl h-11 bg-purple-600 hover:bg-purple-700 text-white font-black shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2"
              >
                {releaseSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Liberando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Liberar {releaseScope === 'single' ? '1 Turno' : `${selectedSeriesDates.length} Turnos`}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
