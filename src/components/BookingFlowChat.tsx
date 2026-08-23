'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { getAvailableSlotsByDate, getBookingsByPhone, cancelPublicBooking } from '@/actions/public-bookings';
import { createBooking } from '@/actions/bookings';
import { createPaymentPreference } from '@/actions/payments';
import { clearBookingRequestKey, getOrCreateBookingRequestKey } from '@/lib/booking-request';

interface CourtOption {
  id: string;
  name: string;
  surface?: string;
}

interface BookingSummary {
  id: string;
  courtName: string;
  date: string;
  time: string;
  status: string;
  isPast: boolean;
}

interface PublicSettings {
  clubName?: string;
  sportEmoji?: string;
  heroImage?: string | null;
  requireDeposit?: boolean;
  requireDepositForRegistered?: boolean;
  usersModuleEnabled?: boolean;
  clientCancellations?: boolean;
}

interface UserSession {
  name?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

type MessageKind = 'text' | 'menu' | 'dates' | 'slots' | 'courts' | 'form' | 'bookings' | 'success';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  kind: MessageKind;
  bookings?: BookingSummary[];
  paymentPending?: boolean;
}

const CHAT_DRAFT_KEY = 'tpadel.chat-booking-draft.v1';

function getDateLabel(date: Date, index: number) {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  return date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
}

function getStatusLabel(status: string) {
  if (status === 'CONFIRMED') return 'Confirmado';
  if (status === 'PENDING') return 'Pendiente de pago';
  if (status === 'CANCELLED') return 'Cancelado';
  return status;
}

export default function BookingFlowChat({
  courts,
  sysSettings,
  session,
  today,
}: {
  courts: CourtOption[];
  sysSettings: PublicSettings | null;
  session: UserSession | null;
  today: string;
}) {
  const clubName = sysSettings?.clubName || 'T-Padel';
  const sportEmoji = sysSettings?.sportEmoji || '🎾';
  const initialName = session ? `${session.name || ''} ${session.lastName || ''}`.trim() : '';
  const initialGreeting = session?.name
    ? `¡Hola, ${session.name}! Qué bueno verte de nuevo. ¿Qué querés hacer hoy?`
    : `¡Hola! Soy el asistente de ${clubName}. Te ayudo a reservar en pocos pasos.`;

  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', sender: 'bot', text: initialGreeting, kind: 'text' },
    { id: 'initial-menu', sender: 'bot', kind: 'menu' },
  ]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [aggregatedSlots, setAggregatedSlots] = useState<{ time: string; courts: CourtOption[] }[]>([]);
  const [availableCourts, setAvailableCourts] = useState<CourtOption[]>([]);
  const [formData, setFormData] = useState({ name: initialName, phone: session?.phone || '' });
  const [searchedPhone, setSearchedPhone] = useState(session?.phone || '');
  const [inputMode, setInputMode] = useState<'none' | 'phone'>('none');
  const [inputText, setInputText] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [formError, setFormError] = useState('');

  const messageCounter = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bookingFormRef = useRef<HTMLFormElement>(null);
  const retryWhenOnlineRef = useRef(false);
  const draftRestoredRef = useRef(false);

  const upcomingDays = useMemo(() => {
    const base = new Date(`${today}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      return date;
    });
  }, [today]);

  const nextId = (prefix: string) => `${prefix}-${++messageCounter.current}`;
  const removePrompts = (...kinds: MessageKind[]) => setMessages((current) => current.filter((message) => !kinds.includes(message.kind)));
  const addUserMessage = (text: string) => setMessages((current) => [...current, { id: nextId('user'), sender: 'user', text, kind: 'text' }]);
  const addBotMessage = (message: Omit<Message, 'id' | 'sender'>) => {
    setMessages((current) => [...current, { ...message, id: nextId('bot'), sender: 'bot' }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing, inputMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(CHAT_DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as { date?: string; slot?: string; courtId?: string; formData?: { name: string; phone: string } };
        if (!draft.date || draft.date < today || !draft.slot || !draft.courtId || !courts.some((court) => court.id === draft.courtId)) {
          window.sessionStorage.removeItem(CHAT_DRAFT_KEY);
          return;
        }
        setSelectedDate(draft.date);
        setSelectedSlot(draft.slot);
        setSelectedCourt(draft.courtId);
        if (draft.formData) setFormData(draft.formData);
        setMessages((current) => [
          ...current.filter((message) => message.kind !== 'menu'),
          { id: 'recovered', sender: 'bot', text: 'Recuperé la reserva que estabas completando. Revisá los datos y confirmá cuando quieras.', kind: 'text' },
          { id: 'recovered-form', sender: 'bot', kind: 'form' },
        ]);
      } catch {
        window.sessionStorage.removeItem(CHAT_DRAFT_KEY);
      } finally {
        draftRestoredRef.current = true;
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [courts, today]);

  useEffect(() => {
    if (!draftRestoredRef.current || !selectedDate || !selectedSlot || !selectedCourt) return;
    window.sessionStorage.setItem(CHAT_DRAFT_KEY, JSON.stringify({
      date: selectedDate,
      slot: selectedSlot,
      courtId: selectedCourt,
      formData,
    }));
  }, [selectedDate, selectedSlot, selectedCourt, formData]);

  const showMainMenu = (text = '¿Querés hacer algo más?') => {
    addBotMessage({ text, kind: 'text' });
    addBotMessage({ kind: 'menu' });
  };

  const handleMenuOption = (option: 'book' | 'view') => {
    removePrompts('menu');
    if (option === 'book') {
      addUserMessage('Quiero reservar una cancha');
      if (courts.length === 0) {
        showMainMenu('Todavía no hay canchas con horarios disponibles. Comunicate con el club para reservar.');
        return;
      }
      addBotMessage({ text: 'Perfecto. Primero elegí el día que te quede mejor.', kind: 'text' });
      addBotMessage({ kind: 'dates' });
      return;
    }

    addUserMessage('Quiero ver mis turnos');
    const phone = searchedPhone || formData.phone;
    if (phone) void fetchBookings(phone);
    else {
      addBotMessage({ text: 'Ingresá tu número con código de área para buscar tus reservas.', kind: 'text' });
      setInputMode('phone');
    }
  };

  const fetchBookings = async (phone: string) => {
    setTyping(true);
    setSearchedPhone(phone);
    setFormData((current) => ({ ...current, phone }));
    try {
      const result = await getBookingsByPhone(phone);
      if (result.success && result.data?.length) {
        addBotMessage({ text: 'Encontré estos turnos asociados al número:', kind: 'text' });
        addBotMessage({ kind: 'bookings', bookings: result.data as BookingSummary[] });
        addBotMessage({ kind: 'menu' });
      } else {
        showMainMenu(result.success ? 'No encontré reservas recientes para ese número.' : result.error || 'No pude consultar las reservas.');
      }
    } catch {
      showMainMenu('No pude consultar tus reservas por un problema de conexión. Podés volver a intentarlo.');
    } finally {
      setTyping(false);
    }
  };

  const handlePhoneSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const phone = inputText.trim();
    if (phone.length < 6) return;
    addUserMessage(phone);
    setInputText('');
    setInputMode('none');
    void fetchBookings(phone);
  };

  const handleCancelBooking = async (bookingId: string) => {
    const phone = searchedPhone || formData.phone;
    if (!phone || !window.confirm('¿Querés cancelar este turno?')) return;
    setBusy(true);
    try {
      const result = await cancelPublicBooking(bookingId, phone);
      addBotMessage({ text: result.success ? 'El turno quedó cancelado correctamente.' : result.error || 'No pude cancelar el turno.', kind: 'text' });
      if (result.success) await fetchBookings(phone);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectDate = async (date: Date, index: number) => {
    const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    setSelectedDate(dateStr);
    removePrompts('dates');
    addUserMessage(`${getDateLabel(date, index)} ${date.getDate()}`);
    setTyping(true);
    try {
      const result = await getAvailableSlotsByDate(dateStr);
      if (result.success && result.data?.length) {
        setAggregatedSlots(result.data as { time: string; courts: CourtOption[] }[]);
        addBotMessage({ text: 'Estos horarios tienen al menos una cancha libre:', kind: 'text' });
        addBotMessage({ kind: 'slots' });
      } else {
        addBotMessage({ text: 'No encontré horarios libres ese día. Elegí otra fecha.', kind: 'text' });
        addBotMessage({ kind: 'dates' });
      }
    } catch {
      addBotMessage({ text: 'No pude consultar la agenda. Revisá tu conexión y elegí nuevamente el día.', kind: 'text' });
      addBotMessage({ kind: 'dates' });
    } finally {
      setTyping(false);
    }
  };

  const handleSelectSlot = (time: string, slotCourts: CourtOption[]) => {
    setSelectedSlot(time);
    setAvailableCourts(slotCourts);
    removePrompts('slots');
    addUserMessage(`${time} hs`);
    addBotMessage({ text: slotCourts.length === 1 ? 'Hay una cancha disponible. Confirmá cuál querés reservar.' : 'Elegí la cancha que preferís.', kind: 'text' });
    addBotMessage({ kind: 'courts' });
  };

  const handleSelectCourt = (court: CourtOption) => {
    setSelectedCourt(court.id);
    removePrompts('courts');
    addUserMessage(court.name);
    addBotMessage({ text: 'Excelente. Solo falta revisar tus datos y confirmar la solicitud.', kind: 'text' });
    addBotMessage({ kind: 'form' });
  };

  const restartBooking = () => {
    removePrompts('form');
    setSelectedDate('');
    setSelectedSlot('');
    setSelectedCourt('');
    setFormError('');
    clearBookingRequestKey();
    window.sessionStorage.removeItem(CHAT_DRAFT_KEY);
    addBotMessage({ text: 'Empecemos de nuevo. Elegí el día que te quede mejor.', kind: 'text' });
    addBotMessage({ kind: 'dates' });
  };

  const handleBookingSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!selectedCourt || !selectedDate || !selectedSlot || formData.name.trim().length < 2 || formData.phone.trim().length < 6) {
      setFormError('Completá un nombre y un teléfono válidos.');
      return;
    }

    setBusy(true);
    setTyping(true);
    setFormError('');
    try {
      const result = await createBooking({
        courtId: selectedCourt,
        date: selectedDate,
        time: selectedSlot,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        requestKey: getOrCreateBookingRequestKey(selectedCourt, selectedDate, selectedSlot),
      });

      if (!result.success || !result.data) {
        setFormError(result.error || 'No pude crear la reserva.');
        return;
      }

      retryWhenOnlineRef.current = false;
      window.sessionStorage.removeItem(CHAT_DRAFT_KEY);
      removePrompts('form');
      const { bookingId, fee, requireDeposit } = result.data;

      if (requireDeposit && fee > 0) {
        const payment = await createPaymentPreference(bookingId);
        if (payment.success && payment.init_point) {
          addBotMessage({ text: 'La reserva quedó registrada. Te llevo a Mercado Pago para completar la seña.', kind: 'text' });
          window.location.assign(payment.init_point);
          return;
        }
        addBotMessage({
          text: 'La reserva quedó registrada y pendiente de pago, pero no pude abrir Mercado Pago. Revisá el enlace enviado por WhatsApp o consultá “Mis turnos”.',
          kind: 'success',
          paymentPending: true,
        });
      } else {
        clearBookingRequestKey();
        addBotMessage({ text: '¡Listo! Tu turno quedó confirmado.', kind: 'success' });
      }
      addBotMessage({ kind: 'menu' });
    } catch {
      retryWhenOnlineRef.current = true;
      setFormError('Se interrumpió la conexión. Tus datos siguen guardados; reintentaremos la misma solicitud al reconectar.');
    } finally {
      setBusy(false);
      setTyping(false);
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

  const selectedCourtName = courts.find((court) => court.id === selectedCourt)?.name || 'Cancha';
  const clientRequireDeposit = sysSettings?.requireDeposit !== false
    && !(sysSettings?.usersModuleEnabled && sysSettings?.requireDepositForRegistered === false && session);

  return (
    <section className="flex h-[calc(100dvh-4rem)] min-h-[560px] w-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 md:h-full md:min-h-0" aria-label="Asistente virtual de reservas">
      <header className="flex shrink-0 items-center gap-3 border-b border-black/10 bg-[var(--color-primary)] px-4 py-3 text-[var(--color-primary-foreground)] shadow-sm">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-foreground)]/12 ring-1 ring-[var(--color-primary-foreground)]/20">
          <Bot className="h-6 w-6" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-primary)] bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black tracking-tight">Asistente de {clubName}</h1>
          <p className="flex items-center gap-1.5 text-xs font-semibold opacity-75"><ShieldCheck className="h-3.5 w-3.5" /> Reserva segura y automática</p>
        </div>
        <span className="text-2xl" aria-hidden="true">{sportEmoji}</span>
      </header>

      <main
        className="hide-scrollbar relative flex-1 overflow-y-auto px-3 py-5 sm:px-4"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 7%, var(--background))',
          backgroundImage: sysSettings?.heroImage ? `linear-gradient(rgb(248 250 252 / 0.78), rgb(248 250 252 / 0.86)), url('${sysSettings.heroImage}')` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-3">
          <div className="my-1 flex justify-center"><span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Hoy</span></div>

          {messages.map((message) => {
            const isBot = message.sender === 'bot';
            return (
              <div key={message.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                {message.text && message.kind !== 'success' && (
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm ${isBot ? 'rounded-tl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100' : 'rounded-tr-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'}`}>
                    {message.text}
                  </div>
                )}

                {message.kind === 'menu' && (
                  <div className="mt-1 grid w-[88%] max-w-sm gap-2">
                    <button onClick={() => handleMenuOption('book')} className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-black text-slate-800 shadow-sm transition hover:border-[var(--color-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <span className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-[var(--color-primary)]" /> Reservar cancha</span><ArrowRight className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleMenuOption('view')} className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-black text-slate-800 shadow-sm transition hover:border-[var(--color-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <span className="flex items-center gap-2"><Search className="h-5 w-5 text-[var(--color-secondary)]" /> Consultar mis turnos</span><ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {message.kind === 'dates' && (
                  <div className="hide-scrollbar mt-1 flex w-[calc(100vw-2rem)] max-w-md gap-2 overflow-x-auto pb-2">
                    {upcomingDays.map((date, index) => (
                      <button key={date.toISOString()} onClick={() => void handleSelectDate(date, index)} className="flex h-[86px] w-[72px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm transition active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                        <span className="bg-slate-100 px-1 py-1.5 text-[10px] font-black uppercase tracking-wide dark:bg-slate-800">{getDateLabel(date, index)}</span>
                        <span className="flex flex-1 flex-col items-center justify-center"><strong className="text-2xl leading-none text-[var(--color-primary)]">{date.getDate()}</strong><small className="mt-1 text-[10px] font-bold uppercase text-slate-500">{date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</small></span>
                      </button>
                    ))}
                  </div>
                )}

                {message.kind === 'slots' && (
                  <div className="mt-1 grid w-[88%] max-w-sm grid-cols-3 gap-2">
                    {aggregatedSlots.map((slot) => <button key={slot.time} onClick={() => handleSelectSlot(slot.time, slot.courts)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm font-black text-slate-800 shadow-sm transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-white">{slot.time}</button>)}
                  </div>
                )}

                {message.kind === 'courts' && (
                  <div className="mt-1 grid w-[88%] max-w-sm gap-2">
                    {availableCourts.map((court) => <button key={court.id} onClick={() => handleSelectCourt(court)} className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-800 shadow-sm transition hover:border-[var(--color-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-white"><span><strong className="block">{court.name}</strong>{court.surface && <small className="text-slate-500">{court.surface}</small>}</span><ArrowRight className="h-4 w-4 text-[var(--color-primary)]" /></button>)}
                  </div>
                )}

                {message.kind === 'form' && (
                  <form ref={bookingFormRef} onSubmit={handleBookingSubmit} className="mt-1 w-[94%] max-w-sm space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Fecha</span><strong>{selectedDate.split('-').reverse().join('/')}</strong></span>
                      <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Horario</span><strong>{selectedSlot} hs</strong></span>
                      <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Cancha</span><strong>{selectedCourtName}</strong></span>
                    </div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300">Nombre completo<input required minLength={2} disabled={!!session} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white" autoComplete="name" /></label>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-300">WhatsApp<input required minLength={6} type="tel" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" autoComplete="tel" inputMode="tel" /></label>
                    {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{formError}</p>}
                    {clientRequireDeposit && <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><CreditCard className="h-4 w-4 shrink-0" /> Al confirmar, el turno queda pendiente hasta acreditar la seña.</p>}
                    <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-black text-[var(--color-primary-foreground)] disabled:opacity-60">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando turno…</> : <>Confirmar reserva <ArrowRight className="h-4 w-4" /></>}</button>
                    <button type="button" disabled={busy} onClick={restartBooking} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><RotateCcw className="h-4 w-4" /> Cambiar fecha u horario</button>
                  </form>
                )}

                {message.kind === 'bookings' && message.bookings && (
                  <div className="mt-1 grid w-[94%] max-w-sm gap-2">
                    {message.bookings.map((booking) => <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-slate-900 dark:text-white">{booking.courtName}</strong><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : booking.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{getStatusLabel(booking.status)}</span></div><div className="mt-3 flex gap-4 text-xs font-semibold text-slate-500"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{booking.date}</span><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{booking.time}</span></div>{sysSettings?.clientCancellations && !booking.isPast && ['PENDING', 'CONFIRMED'].includes(booking.status) && <button disabled={busy} onClick={() => void handleCancelBooking(booking.id)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-red-50 text-xs font-black text-red-700 dark:bg-red-950/30 dark:text-red-300"><XCircle className="h-4 w-4" /> Cancelar turno</button>}</article>)}
                  </div>
                )}

                {message.kind === 'success' && (
                  <div className="mt-1 w-[94%] max-w-sm rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h2 className="mt-2 text-lg font-black text-emerald-950 dark:text-emerald-100">{message.paymentPending ? 'Reserva pendiente de pago' : 'Reserva confirmada'}</h2><p className="mt-1 text-sm font-medium text-emerald-800 dark:text-emerald-300">{message.text}</p></div>
                )}
              </div>
            );
          })}

          {typing && <div className="flex items-center gap-1 self-start rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label="El asistente está procesando"><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" /><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" /></div>}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        {inputMode === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="mx-auto flex max-w-md gap-2"><label className="sr-only" htmlFor="assistant-phone">Número de teléfono</label><input id="assistant-phone" autoFocus type="tel" inputMode="tel" autoComplete="tel" placeholder="Número con código de área" value={inputText} onChange={(event) => setInputText(event.target.value)} className="h-12 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><button type="submit" aria-label="Buscar reservas" disabled={inputText.trim().length < 6} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] disabled:opacity-50"><Send className="h-5 w-5" /></button></form>
        ) : (
          <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Bot className="h-4 w-4" /> Asistente automático de reservas</div>
        )}
      </footer>
    </section>
  );
}
