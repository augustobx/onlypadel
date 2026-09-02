'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Calendar as CalendarIcon, MapPin, Clock, ArrowRight, CheckCircle2, User, Phone, Lock, Loader2, CreditCard, Share2, Download, ExternalLink, Sparkles, Check } from 'lucide-react';
import { getAvailableSlots } from '@/actions/public-bookings';
import { createBooking } from '@/actions/bookings';
import { createPaymentPreference } from '@/actions/payments';
import { clearBookingRequestKey, getOrCreateBookingRequestKey } from '@/lib/booking-request';
import { getReadableForeground, normalizeHexColor } from '@/lib/color';
import { getGoogleCalendarUrl, downloadIcsFile } from '@/lib/calendar-export';
import { shareBooking } from '@/lib/share-booking';

interface SlotData {
  time: string;
  status: string;
}

interface CourtOption {
  id: string;
  name: string;
  surface?: string | null;
}

import ClubAnnouncementBoard from '@/components/ClubAnnouncementBoard';

interface PublicSettings {
  splashDuration?: number;
  bubbleDuration?: number;
  splashLogo?: string | null;
  splashName?: string | null;
  clubName?: string | null;
  sportEmoji?: string | null;
  pwaEnabled?: boolean;
  bubbleActive?: boolean;
  bubbleText?: string | null;
  bubbleColor?: string | null;
  announcementActive?: boolean;
  announcementBadge?: string | null;
  announcementTitle?: string | null;
  announcementText?: string | null;
  announcementLink?: string | null;
  announcementLinkText?: string | null;
  announcementVariant?: string | null;
  announcementDuration?: number;
  announcementAutoClose?: boolean;
  requireDeposit?: boolean;
  usersModuleEnabled?: boolean;
  requireDepositForRegistered?: boolean;
  clubLogo?: string | null;
  splashMode?: 'logo' | 'full_image' | null;
  splashFullImage?: string | null;
  contactPhone?: string | null;
  courtPhone?: string | null;
  apiPhone?: string | null;
  autoWhatsapp?: boolean;
}

interface UserSession {
  name?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

const BOOKING_DRAFT_KEY = 'onlypadel.booking-draft.v1';

function formatLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function BookingFlow({ courts, sysSettings, session, today }: { courts: CourtOption[], sysSettings?: PublicSettings | null, session?: UserSession | null, today: string }) {

  // VARIABLES DINÁMICAS DESDE LA BASE DE DATOS
  const splashDuration = sysSettings?.splashDuration || 1800;
  const bubbleDuration = sysSettings?.bubbleDuration || 3000;
  const splashLogo = sysSettings?.clubLogo || sysSettings?.splashLogo || "";
  const hasSplashLogo = /^(https?:\/\/|\/|data:image\/)/i.test(splashLogo);
  const splashMode = sysSettings?.splashMode || (sysSettings?.splashFullImage ? 'full_image' : 'logo');
  const splashFullImage = sysSettings?.splashFullImage || "";
  const hasSplashFullImage = splashMode === 'full_image' && /^(https?:\/\/|\/|data:image\/)/i.test(splashFullImage);
  const splashName = sysSettings?.splashName || "OnlyPadel";
  const clubName = sysSettings?.clubName || "Padel Club";
  const sportEmoji = sysSettings?.sportEmoji || "🎾";

  // ESTADOS Y REFS
  const slotsRef = useRef<HTMLDivElement>(null);
  const bookingFormRef = useRef<HTMLFormElement>(null);
  const retryWhenOnlineRef = useRef(false);
  const completedRef = useRef(false);
  const [showSplash, setShowSplash] = useState(sysSettings?.pwaEnabled !== false && splashDuration > 0);
  const [showBubble, setShowBubble] = useState(sysSettings?.bubbleActive || false);
  const [showFloatingAnnouncement, setShowFloatingAnnouncement] = useState(true);

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(`${today}T12:00:00`));
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [draftReady, setDraftReady] = useState(false);

  // ESTADO: Solo Nombre y Teléfono (Sin email)
  const [formData, setFormData] = useState({ 
    name: session ? `${session.name || ''} ${session.lastName || ''}`.trim() : '', 
    phone: session?.phone || '' 
  });
  const [paymentFeedback, setPaymentFeedback] = useState<'approved' | 'rejected' | 'pending' | null>(null);
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'MORNING' | 'AFTERNOON' | 'NIGHT'>('ALL');
  const [shareToast, setShareToast] = useState('');
  const [confirmedDetails, setConfirmedDetails] = useState<{
    courtName: string;
    dateFormatted: string;
    slotTime: string;
    playerName: string;
  } | null>(null);

  // Escuchar retornos de Mercado Pago (?status=success, etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedConfirmed = window.sessionStorage.getItem('last_confirmed_booking');
      if (savedConfirmed) {
        setConfirmedDetails(JSON.parse(savedConfirmed));
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');
    if (status === 'success' || status === 'approved') {
      setPaymentFeedback('approved');
      setStep(3);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'failure' || status === 'rejected') {
      setPaymentFeedback('rejected');
      setError('El pago de la seña fue cancelado o rechazado en Mercado Pago.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (status === 'pending' || status === 'in_process') {
      setPaymentFeedback('pending');
      setStep(3);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(BOOKING_DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as { date?: string; courtId?: string; slot?: string; formData?: { name: string; phone: string }; step?: number };
          const canRestoreSelection = Boolean(
            draft.date && draft.date >= today && draft.slot && draft.courtId
            && courts.some((court) => court.id === draft.courtId),
          );
          if (session) {
            setFormData({
              name: `${session.name || ''} ${session.lastName || ''}`.trim(),
              phone: session.phone || '',
            });
          } else if (draft.formData) {
            setFormData(draft.formData);
          }
          if (canRestoreSelection && draft.date && draft.courtId && draft.slot) {
            setSelectedDate(new Date(`${draft.date}T12:00:00`));
            setSlotsLoading(true);
            setSelectedCourt(draft.courtId);
            setSelectedSlot(draft.slot);
            if (draft.step === 2) setStep(2);
          } else {
            window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
          }
        }
      } catch {
        // Si el borrador está dañado, iniciamos un flujo limpio.
      } finally {
        setDraftReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [courts, today, session]);

  useEffect(() => {
    if (!draftReady || step === 3 || completedRef.current) return;
    const date = formatLocalDateStr(selectedDate);
    window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ date, courtId: selectedCourt, slot: selectedSlot, formData, step }));
  }, [draftReady, selectedDate, selectedCourt, selectedSlot, formData, step]);

  // Calculate if deposit is required for this specific user
  const clientRequireDeposit = (() => {
    if (sysSettings?.requireDeposit === false) return false;
    if (sysSettings?.usersModuleEnabled && sysSettings?.requireDepositForRegistered === false && session) return false;
    return true;
  })();

  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + i);
    return d;
  });

  // EFECTO DEL SPLASH
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), Math.min(Math.max(splashDuration, 400), 5000));
    return () => clearTimeout(timer);
  }, [showSplash, splashDuration]);

  // EFECTO DE LA BURBUJA CENTRADA (Desaparece según el bubbleDuration)
  useEffect(() => {
    if (sysSettings?.bubbleActive) {
      const timer = setTimeout(() => setShowBubble(false), bubbleDuration);
      return () => clearTimeout(timer);
    }
  }, [sysSettings?.bubbleActive, bubbleDuration]);

  useEffect(() => {
    if (selectedCourt && selectedDate) {
      let active = true;
      const dateStr = formatLocalDateStr(selectedDate);

      // Auto-scroll a la sección de horarios
      setTimeout(() => {
        slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);

      getAvailableSlots(selectedCourt, dateStr)
        .then(res => {
          if (!active) return;
          setSlots(res.success && res.data ? res.data as SlotData[] : []);
          if (!res.success) setError(res.error || 'No pudimos consultar los horarios.');
          if (step !== 3) {
            setSelectedSlot((current) => res.success && res.data?.some((slot) => slot.time === current && slot.status === 'AVAILABLE') ? current : '');
          }
        })
        .catch(() => {
          if (active) {
            setSlots([]);
            setError('No pudimos consultar la agenda. Revisá tu conexión e intentá nuevamente.');
          }
        })
        .finally(() => { if (active) setSlotsLoading(false); });
      return () => { active = false; };
    }
  }, [selectedCourt, selectedDate, step]);

  const handleNextStep = () => {
    if (step === 1 && selectedCourt && selectedSlot) setStep(2);
  };

  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.phone) return;

    setSubmitting(true);
    setError('');

    try {
      const dateStr = formatLocalDateStr(selectedDate);
      const chosenCourt = courts.find(c => c.id === selectedCourt)?.name || 'Cancha Principal';
      const chosenDateFormatted = selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
      const chosenSlot = selectedSlot;

      // Guardar datos exactos para el resumen de éxito
      const details = {
        courtName: chosenCourt,
        dateFormatted: chosenDateFormatted,
        slotTime: chosenSlot,
        playerName: formData.name.trim(),
      };
      setConfirmedDetails(details);
      try {
        window.sessionStorage.setItem('last_confirmed_booking', JSON.stringify(details));
      } catch {}

      const bookingResult = await createBooking({
        courtId: selectedCourt,
        date: dateStr,
        time: selectedSlot,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        requestKey: getOrCreateBookingRequestKey(selectedCourt, dateStr, selectedSlot),
      });

      if (!bookingResult.success || !bookingResult.data) {
        setError(bookingResult.error || 'Error al crear la reserva');
        setSubmitting(false);
        return;
      }

      const { bookingId, fee, requireDeposit } = bookingResult.data;
      retryWhenOnlineRef.current = false;
      completedRef.current = true;
      window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);

      if (requireDeposit && fee > 0) {
        const paymentResult = await createPaymentPreference(bookingId);

        if (paymentResult.success && paymentResult.init_point) {
          window.location.href = paymentResult.init_point;
          return;
        } else {
          setError(paymentResult.error || 'No pudimos conectar con Mercado Pago para cobrar la seña. Por favor intentá nuevamente.');
          setSubmitting(false);
          return;
        }
      } else {
        clearBookingRequestKey();
        setStep(3);
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error en el flujo de reserva:', err);
      retryWhenOnlineRef.current = true;
      setError('La conexión se interrumpió. Estamos verificando la misma reserva para no duplicarla.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const retry = () => {
      if (retryWhenOnlineRef.current && bookingFormRef.current) {
        retryWhenOnlineRef.current = false;
        bookingFormRef.current.requestSubmit();
      }
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  // --- PANTALLA SPLASH DE INICIO ---
  if (showSplash) {
    if (hasSplashFullImage) {
      return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between p-8 animate-in fade-in duration-300">
          <Image 
            src={splashFullImage} 
            alt={splashName} 
            fill 
            unoptimized 
            priority
            className="object-cover opacity-90 scale-105 animate-pulse" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none" />
          
          {/* Top Badge */}
          <div className="relative z-10 w-full flex justify-center pt-8 animate-in slide-in-from-top-4 duration-500">
            <span className="text-xs font-black tracking-widest uppercase px-4 py-1.5 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20">
              {clubName}
            </span>
          </div>

          {/* Bottom Title & Spinner */}
          <div className="relative z-10 w-full flex flex-col items-center text-center pb-8 space-y-3 animate-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">
              {splashName}
            </h1>
            <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] bg-[var(--background,#030712)] text-[var(--foreground,#f8fafc)] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="flex flex-col items-center animate-bounce">
          {hasSplashLogo ? (
            <Image 
              src={splashLogo} 
              alt={splashName} 
              width={128} 
              height={128} 
              unoptimized 
              className="w-28 h-28 md:w-32 md:h-32 object-contain mb-6 rounded-3xl shadow-[0_0_50px_var(--color-primary,rgba(16,185,129,0.3))] bg-white/5 p-2 border border-[var(--border,rgba(255,255,255,0.1))]" 
            />
          ) : (
            <div className="w-24 h-24 bg-[var(--color-primary)] rounded-3xl flex items-center justify-center font-black text-[var(--color-primary-foreground)] text-5xl mb-6 shadow-[0_0_50px_var(--color-primary,rgba(16,185,129,0.4))]">
              {sportEmoji}
            </div>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-1.5 text-center">
          {splashName}
        </h1>
        <p className="text-[var(--color-primary)] font-bold tracking-widest text-xs md:text-sm uppercase text-center">{clubName}</p>
      </div>
    );
  }

  // --- RENDER DE LA PWA ---
  return (
    <div className="w-full flex-1 flex flex-col relative bg-transparent">

      {/* HEADER HERO RENOVADO CON SOPORTE DE TEMAS ÉPICOS */}
      <div className="theme-hero-banner px-6 py-10 text-center relative z-10 rounded-b-[2.5rem] shadow-md border-b border-[var(--border,rgba(255,255,255,0.1))]">
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">
          Reservá tu Cancha {sportEmoji}
        </h2>
        <p className="text-slate-300 text-sm font-medium opacity-90">
          Elegí día, horario y preparate para jugar.
        </p>
      </div>

      <div className="hide-scrollbar flex-1 space-y-7 overflow-y-auto p-5 pb-8 -mt-2">

        <ol className="grid grid-cols-3 gap-2 pt-3" aria-label="Progreso de la reserva">
          {['Disponibilidad', 'Tus datos', 'Confirmación'].map((label, index) => {
            const number = index + 1;
            const active = step === number;
            const complete = step > number;
            return <li key={label} className={`flex min-w-0 flex-col items-center gap-1 text-center text-[10px] font-black uppercase tracking-wide ${active ? 'text-[var(--foreground,#0f172a)] font-extrabold' : 'text-slate-400'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${active || complete ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm' : 'border-[var(--border)] bg-[var(--card)] text-slate-400'}`}>{complete ? '✓' : number}</span><span className="truncate">{label}</span></li>;
          })}
        </ol>

        {/* PASO 1 */}
        {step === 1 && (
          <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">

            {/* Fechas */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[var(--foreground)] flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-[var(--color-primary)]" /> ¿Qué día jugás?
              </label>
              <div className="flex space-x-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
                {upcomingDays.map((date, i) => {
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedDate(date);
                        setError('');
                        if (selectedCourt) setSlotsLoading(true);
                      }}
                      className={`flex-shrink-0 w-16 p-3 rounded-2xl flex flex-col items-center justify-center transition-all snap-start shadow-sm border ${isSelected
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/20 font-black scale-105 z-10'
                        : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:border-[var(--color-primary)]/60'
                        }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80 mb-1">
                        {date.toLocaleDateString('es-AR', { weekday: 'short' })}
                      </span>
                      <span className="text-2xl font-black leading-none">
                        {date.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canchas */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[var(--foreground)] flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-[var(--color-primary)]" /> Elegí tu cancha
              </label>
              <div className="grid grid-cols-2 gap-3">
                {courts.map(court => (
                  <button
                    key={court.id}
                    onClick={() => {
                      setSelectedCourt(court.id);
                      setSelectedSlot('');
                      setError('');
                      setSlotsLoading(true);
                    }}
                    className={`p-4 rounded-2xl text-left transition-all border shadow-sm flex flex-col active:scale-[0.98] ${selectedCourt === court.id
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] text-[var(--color-primary-foreground)] transform scale-[1.02]'
                      : 'bg-[var(--card)] text-[var(--card-foreground)] border-[var(--border)] hover:border-[var(--color-primary)]/60'
                      }`}
                  >
                    <span className="font-bold text-base">{court.name}</span>
                    <span className="text-[11px] uppercase opacity-60 mt-1 font-bold">{court.surface || 'Piso Sintético'}</span>
                  </button>
                ))}
              </div>
              {courts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/50 p-6 text-center">
                  <MapPin className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-black text-[var(--foreground)]">No hay canchas disponibles</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">Comunicate con el club para consultar horarios.</p>
                </div>
              )}
            </div>

            {/* Horarios FOMO (Grilla Visual de Ocupación) */}
            {selectedCourt && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" ref={slotsRef}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[var(--foreground)] flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-[var(--color-primary)]" /> Horarios disponibles
                    </label>
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase">
                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[var(--color-primary)] mr-1"></span>Libre</span>
                      <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-400 mr-1"></span>Ocupado</span>
                    </div>
                  </div>

                  {/* Filtro Rápido por Franja Horaria */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                    {[
                      { id: 'ALL', label: '⚡ Todos' },
                      { id: 'MORNING', label: '☀️ Mañana' },
                      { id: 'AFTERNOON', label: '⛅ Tarde' },
                      { id: 'NIGHT', label: '🌙 Noche' },
                    ].map((tf) => (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => setTimeFilter(tf.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          timeFilter === tf.id
                            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm scale-105'
                            : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                {slotsLoading ? (
                  <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>
                ) : slots.length > 0 ? (
                  (() => {
                    const visibleSlots = slots.filter((slot) => {
                      if (timeFilter === 'ALL') return true;
                      const hour = parseInt(slot.time.split(':')[0], 10);
                      if (timeFilter === 'MORNING') return hour < 14;
                      if (timeFilter === 'AFTERNOON') return hour >= 14 && hour < 19;
                      if (timeFilter === 'NIGHT') return hour >= 19;
                      return true;
                    });

                    if (visibleSlots.length === 0) {
                      return (
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 text-xs font-medium">
                          No encontramos horarios en la franja seleccionada. Probá tocando <strong>"⚡ Todos"</strong>.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {visibleSlots.map((slot, idx) => {
                          const isAvailable = slot.status === 'AVAILABLE';
                          const isSelected = selectedSlot === slot.time;

                          return (
                            <button
                              key={idx}
                              disabled={!isAvailable}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`relative p-3.5 rounded-2xl text-center font-bold text-sm transition-all border overflow-hidden flex flex-col items-center justify-center active:scale-[0.98]
                                ${isAvailable
                                  ? isSelected
                                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/20 shadow-lg shadow-[var(--color-primary)]/30 transform scale-[1.02]'
                                    : 'bg-[var(--card)] text-[var(--card-foreground)] border-[var(--border)] shadow-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                                  : 'bg-[var(--card)]/40 text-slate-500 border-[var(--border)]/40 cursor-not-allowed opacity-50'
                                }
                              `}
                            >
                              <span className="text-lg">{slot.time} hs</span>
                              <span className="text-[10px] uppercase tracking-wider mt-0.5 opacity-80">
                                {isAvailable ? (isSelected ? 'Seleccionado' : 'Disponible') :
                                  slot.status === 'FIXED' ? 'Abono Fijo' :
                                    slot.status === 'BLOCKED' ? 'Cancha Cerrada' : 'Ocupado'}
                              </span>
                              {!isAvailable && (
                                <Lock className="absolute -right-2 -bottom-2 w-10 h-10 text-slate-400/30 opacity-50" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-sm font-medium">
                    No hay horarios configurados para este día.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- PASO 2: DATOS DEL CLIENTE --- */}
        {step === 2 && (
          <form ref={bookingFormRef} onSubmit={handleFinalSubmit} className="space-y-6 animate-in slide-in-from-right-8 duration-500 pt-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider mb-1">Resumen de Reserva</p>
                <p className="text-sm font-bold">
                  {selectedDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace(/^\w/, c => c.toUpperCase())} • {selectedSlot} hs
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cancha</p>
                <p className="text-sm font-bold text-[var(--color-primary)]">
                  {courts.find(c => c.id === selectedCourt)?.name || 'Cancha'}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-800 text-sm font-bold animate-in shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Nombre y Apellido</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Teléfono de Contacto</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 11 1234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {clientRequireDeposit && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 p-3 rounded-xl text-sm text-amber-800 dark:text-amber-200 font-medium flex items-start">
                <CreditCard className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-amber-500" />
                <span>Al confirmar serás redirigido a <strong>MercadoPago</strong> para pagar la seña. Tu turno se confirma automáticamente una vez acreditado el pago.</span>
              </div>
            )}
          </form>
        )}

        {/* --- PASO 3: ESPERANDO PAGO / ÉXITO --- */}
        {step === 3 && (() => {
          const displayCourtName = confirmedDetails?.courtName || courts.find(c => c.id === selectedCourt)?.name || 'Cancha Principal';
          const displayDateFormatted = confirmedDetails?.dateFormatted || selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
          const displaySlotTime = confirmedDetails?.slotTime || selectedSlot || '18:00';
          const bookingCode = `#OP-${(displaySlotTime.replace(':', '') || 'PAD')}${selectedDate.getDate()}`;

          // Armado de fechas para exportar a Calendarios
          const [hrs, mins] = displaySlotTime.split(':').map(Number);
          const startEvent = new Date(selectedDate);
          if (!isNaN(hrs)) startEvent.setHours(hrs, mins || 0, 0, 0);
          const endEvent = new Date(startEvent);
          endEvent.setMinutes(endEvent.getMinutes() + 90);

          const googleCalendarUrl = getGoogleCalendarUrl({
            title: `🎾 Pádel en ${clubName} (${displayCourtName})`,
            description: `Turno confirmado en ${displayCourtName}. Código de reserva: ${bookingCode}`,
            location: `${displayCourtName} - ${clubName}`,
            startDate: startEvent,
            endDate: endEvent,
          });

          const handleIcsDownload = () => {
            downloadIcsFile(
              {
                title: `🎾 Pádel en ${clubName} (${displayCourtName})`,
                description: `Turno confirmado en ${displayCourtName}. Código: ${bookingCode}`,
                location: `${displayCourtName} - ${clubName}`,
                startDate: startEvent,
                endDate: endEvent,
              },
              `turno-${displaySlotTime.replace(':', '')}.ics`
            );
          };

          const handleShareGroup = async () => {
            const res = await shareBooking({
              courtName: displayCourtName,
              dateStr: displayDateFormatted,
              timeStr: displaySlotTime,
              bookingCode,
              clubName,
              sportEmoji,
              playerName: confirmedDetails?.playerName || formData.name || 'Jugador 1',
            });
            if (res.method === 'clipboard') {
              setShareToast('¡Convocatoria copiada! Pegala en el grupo de WhatsApp de tu partido.');
              setTimeout(() => setShareToast(''), 4000);
            }
          };

          return (
            <div className="flex flex-col items-center justify-center text-center py-6 px-1 sm:px-4 animate-in zoom-in-95 duration-500 max-w-md mx-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-inner relative ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 mb-1">
                {paymentFeedback === 'approved' 
                  ? '¡Pago Aprobado y Turno Confirmado!' 
                  : `¡Reserva ${clientRequireDeposit ? 'registrada' : 'confirmada'}!`}
              </h3>

              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium px-2 leading-relaxed mb-5">
                {paymentFeedback === 'approved'
                  ? `Tu seña fue acreditada con éxito en Mercado Pago. Te esperamos en la cancha. ${sportEmoji}`
                  : clientRequireDeposit
                  ? `Tu turno queda confirmado una vez acreditada la seña. ${sportEmoji}`
                  : `¡Tu lugar está asegurado! Te esperamos en la cancha. ${sportEmoji}`}
              </p>

              {/* TICKET DEPORTIVO DIGITAL */}
              <div className="w-full bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden mb-5 text-left">
                {/* Badge de estado & Código */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Turno Confirmado</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-400 bg-white/10 px-2.5 py-1 rounded-lg">
                    {bookingCode}
                  </span>
                </div>

                {/* Detalles de Cancha, Día y Hora */}
                <div className="py-4 space-y-3">
                  <div className="flex items-center text-slate-200">
                    <MapPin className="w-5 h-5 mr-3 text-[var(--color-primary)] flex-shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Cancha</span>
                      <span className="font-bold text-base sm:text-lg">{displayCourtName}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-slate-200">
                    <CalendarIcon className="w-5 h-5 mr-3 text-[var(--color-primary)] flex-shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha</span>
                      <span className="font-bold text-base sm:text-lg capitalize">{displayDateFormatted}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-slate-200">
                    <Clock className="w-5 h-5 mr-3 text-[var(--color-primary)] flex-shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Horario</span>
                      <span className="font-black text-lg sm:text-xl text-[var(--color-primary)]">{displaySlotTime} hs</span>
                    </div>
                  </div>
                </div>

                {/* Decoración Ticket Punch */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 dark:bg-slate-900 rounded-full"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 dark:bg-slate-900 rounded-full"></div>
              </div>

              {/* FEEDBACK TOAST DE COMPARTIR */}
              {shareToast && (
                <div className="w-full mb-3 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <Check className="w-4 h-4" />
                  <span>{shareToast}</span>
                </div>
              )}

              {/* BOTONES DE ACCIÓN PROFESIONALES */}
              <div className="w-full space-y-2.5 mb-4">
                {/* 1. Compartir con el grupo de 4 */}
                <button
                  type="button"
                  onClick={handleShareGroup}
                  className="w-full flex items-center justify-center gap-2.5 bg-[var(--color-primary)] hover:opacity-90 text-[var(--color-primary-foreground)] font-black text-sm py-3.5 px-5 rounded-2xl shadow-md transition-all active:scale-[0.98]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>🎾 Compartir Convocatoria con el Grupo</span>
                </button>

                {/* 2. Fila Calendarios: Google Calendar & Apple/Outlook (.ics) */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                    <span>Google Calendar</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleIcsDownload}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Apple / Outlook (.ics)</span>
                  </button>
                </div>
              </div>

              {/* BOTÓN VOLVER AL INICIO */}
              <button 
                onClick={() => {
                  try {
                    window.sessionStorage.removeItem('last_confirmed_booking');
                    window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
                  } catch {}
                  window.location.href = '/';
                }} 
                className="font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-2.5 px-6 rounded-xl transition-colors text-xs"
              >
                Volver al inicio
              </button>
            </div>
          );
        })()}
      </div>

      {/* FOOTER FLOTANTE PWA */}
      {step < 3 && (
        <div className="z-50 shrink-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          {step === 1 ? (
            <button
              onClick={handleNextStep}
              disabled={!selectedCourt || !selectedSlot}
              className="w-full flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-lg py-4 rounded-2xl shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[var(--color-primary)] active:scale-[0.98]"
            >
              Continuar <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={submitting || formData.name.trim().length < 2 || formData.phone.trim().length < 6}
              className="w-full flex items-center justify-center bg-slate-900 dark:bg-[var(--color-primary)] text-white font-bold text-lg py-4 rounded-2xl shadow-xl transition-all hover:bg-black dark:hover:bg-[var(--color-primary)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : clientRequireDeposit ? (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pagar Seña y Reservar
                </>
              ) : (
                <>
                  Confirmar Reserva <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* TABLÓN DE ANUNCIOS FLOTANTE POST-SPLASH CON CONTADOR CONFIGURABLE Y BOTÓN DE CIERRE */}
      {showFloatingAnnouncement && (sysSettings?.announcementActive || (sysSettings?.bubbleActive && sysSettings?.bubbleText)) && (
        <ClubAnnouncementBoard
          active={true}
          mode="floating"
          badge={sysSettings?.announcementBadge || 'COMUNICADO'}
          title={sysSettings?.announcementTitle || ''}
          text={sysSettings?.announcementText || sysSettings?.bubbleText || ''}
          link={sysSettings?.announcementLink || ''}
          linkText={sysSettings?.announcementLinkText || 'Ver más'}
          variant={sysSettings?.announcementVariant || 'theme'}
          duration={sysSettings?.announcementDuration || 5}
          autoClose={sysSettings?.announcementAutoClose ?? true}
          onClose={() => setShowFloatingAnnouncement(false)}
        />
      )}

      {/* CSS Ocultar Scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
