'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Calendar as CalendarIcon, MapPin, Clock, ArrowRight, CheckCircle2, User, Phone, Lock, Loader2, CreditCard } from 'lucide-react';
import { getAvailableSlots } from '@/actions/public-bookings';
import { createBooking } from '@/actions/bookings';
import { createPaymentPreference } from '@/actions/payments';
import { clearBookingRequestKey, getOrCreateBookingRequestKey } from '@/lib/booking-request';
import { getReadableForeground, normalizeHexColor } from '@/lib/color';

interface SlotData {
  time: string;
  status: string;
}

interface CourtOption {
  id: string;
  name: string;
  surface?: string | null;
}

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
  requireDeposit?: boolean;
  usersModuleEnabled?: boolean;
  requireDepositForRegistered?: boolean;
  clubLogo?: string | null;
  splashMode?: 'logo' | 'full_image' | null;
  splashFullImage?: string | null;
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
          setSelectedSlot((current) => res.success && res.data?.some((slot) => slot.time === current && slot.status === 'AVAILABLE') ? current : '');
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
  }, [selectedCourt, selectedDate]);

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
          setStep(3);
          setSubmitting(false);
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
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="flex flex-col items-center animate-bounce">
          {hasSplashLogo ? (
            <Image src={splashLogo} alt={splashName} width={128} height={128} unoptimized className="w-32 h-32 object-contain mb-6 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-slate-900/60 p-2 border border-slate-800" />
          ) : (
            <div className="w-24 h-24 bg-[var(--color-primary)] rounded-3xl flex items-center justify-center font-black text-[var(--color-primary-foreground)] text-5xl mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
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

      {/* HEADER HERO RENOVADO */}
      <div className="bg-slate-900 dark:bg-black px-6 py-10 text-center relative z-10 rounded-b-[2.5rem] shadow-md">
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">
          Reservá tu Cancha {sportEmoji}
        </h2>
        <p className="text-slate-400 text-sm font-medium">
          Elegí día, horario y preparate para jugar.
        </p>
      </div>

      <div className="hide-scrollbar flex-1 space-y-7 overflow-y-auto p-5 pb-8 -mt-2">

        <ol className="grid grid-cols-3 gap-2 pt-3" aria-label="Progreso de la reserva">
          {['Disponibilidad', 'Tus datos', 'Confirmación'].map((label, index) => {
            const number = index + 1;
            const active = step === number;
            const complete = step > number;
            return <li key={label} className={`flex min-w-0 flex-col items-center gap-1 text-center text-[10px] font-black uppercase tracking-wide ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${active || complete ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>{complete ? '✓' : number}</span><span className="truncate">{label}</span></li>;
          })}
        </ol>

        {/* PASO 1 */}
        {step === 1 && (
          <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">

            {/* Fechas */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
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
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
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
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
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
                      : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-[var(--color-primary)]'
                      }`}
                  >
                    <span className="font-bold text-base">{court.name}</span>
                    <span className="text-[11px] uppercase opacity-60 mt-1 font-bold">{court.surface || 'Piso Sintético'}</span>
                  </button>
                ))}
              </div>
              {courts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
                  <MapPin className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-black text-slate-700 dark:text-slate-200">No hay canchas disponibles</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Comunicate con el club para consultar horarios.</p>
                </div>
              )}
            </div>

            {/* Horarios FOMO (Grilla Visual de Ocupación) */}
            {selectedCourt && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" ref={slotsRef}>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-[var(--color-primary)]" /> Horarios</div>
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase">
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[var(--color-primary)] mr-1"></span>Libre</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-300 mr-1"></span>Ocupado</span>
                  </div>
                </label>

                {slotsLoading ? (
                  <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {slots.map((slot, idx) => {
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
                                ? 'bg-slate-900 text-white border-slate-900 ring-4 ring-slate-900/20 shadow-md transform scale-[1.02]'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 border-slate-100 dark:border-slate-800 cursor-not-allowed'
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
                            <Lock className="absolute -right-2 -bottom-2 w-10 h-10 text-slate-200 dark:text-slate-700 opacity-50" />
                          )}
                        </button>
                      );
                    })}
                  </div>
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
              <button type="button" onClick={() => setStep(1)} className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors">Modificar</button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><User className="w-4 h-4 mr-2 text-slate-400" /> Nombre y Apellido</label>
                <input id="classic-name" required minLength={2} type="text" autoComplete="name" placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl font-medium focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all shadow-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><Phone className="w-4 h-4 mr-2 text-slate-400" /> WhatsApp</label>
                <input id="classic-phone" required minLength={6} type="tel" inputMode="tel" autoComplete="tel" placeholder="Ej: 3329 123456" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl font-medium focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all shadow-sm" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
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
        {step === 3 && (
          <div className="flex flex-col items-center justify-center text-center py-12 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-[var(--color-primary)] rounded-full flex items-center justify-center mb-6 shadow-inner relative">
              <CheckCircle2 className="w-12 h-12 text-[var(--color-primary-foreground)] absolute" />
              <div className="w-24 h-24 border-4 border-[var(--color-primary)] rounded-full animate-ping opacity-20"></div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-3">¡Reserva {clientRequireDeposit ? 'registrada' : 'confirmada'}!</h3>
            <p className="text-slate-500 font-medium px-4 leading-relaxed mb-6">
              {clientRequireDeposit
                ? `Tu turno queda confirmado una vez acreditado el pago. Te enviamos la confirmación por WhatsApp. ${sportEmoji}`
                : `¡Tu lugar está asegurado! Te enviamos los detalles por WhatsApp. ${sportEmoji}`
              }
            </p>

            {/* RESUMEN DEL TURNO EN PANTALLA DE ÉXITO */}
            <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-4 mb-8">
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Detalles de tu turno</p>
              <div className="flex items-center text-slate-700 dark:text-slate-200">
                <MapPin className="w-5 h-5 mr-3 text-[var(--color-primary)]" />
                <span className="font-bold text-lg">{courts.find(c => c.id === selectedCourt)?.name || 'Cancha'}</span>
              </div>
              <div className="flex items-center text-slate-700 dark:text-slate-200">
                <CalendarIcon className="w-5 h-5 mr-3 text-[var(--color-primary)]" />
                <span className="font-bold text-lg capitalize">{selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex items-center text-slate-700 dark:text-slate-200">
                <Clock className="w-5 h-5 mr-3 text-[var(--color-primary)]" />
                <span className="font-bold text-lg">{selectedSlot} hs</span>
              </div>
            </div>

            <button onClick={() => window.location.reload()} className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 py-4 px-8 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full max-w-sm">
              Volver al inicio
            </button>
          </div>
        )}
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

      {/* BURBUJA CENTRADA TEMPORIZADA */}
      {showBubble && sysSettings?.bubbleText && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
          <div
            className="p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-90 fade-in slide-in-from-bottom-8 duration-500 pointer-events-auto"
            style={{ backgroundColor: normalizeHexColor(sysSettings.bubbleColor, '#10b981'), color: getReadableForeground(normalizeHexColor(sysSettings.bubbleColor, '#10b981')) }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-6xl drop-shadow-md">{sportEmoji}</span>
              <p className="font-bold text-xl leading-snug">{sysSettings.bubbleText}</p>
            </div>
          </div>
        </div>
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
