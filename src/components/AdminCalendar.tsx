'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, User, Phone, Trash2, X, Lock, Repeat } from 'lucide-react';
import { getAdminCalendarData, createAdminBooking, cancelAdminBooking } from '@/actions/admin-calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminCalendar({ courts, initialDate, highlightBookingId, hideToolbar = false }: { courts: any[], initialDate?: string, highlightBookingId?: string, hideToolbar?: boolean }) {
    const [selectedCourt, setSelectedCourt] = useState('ALL');
    const [currentDate, setCurrentDate] = useState(initialDate ? new Date(`${initialDate}T12:00:00`) : new Date());
    const [gridData, setGridData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [slotData, setSlotData] = useState<{ courtId: string, courtName: string, time: string, endTime: string } | null>(null);
    const [formData, setFormData] = useState({ clientName: '', clientPhone: '', type: 'RESERVA' as 'RESERVA' | 'BLOQUEO' | 'FIJO' });

    const loadData = async () => {
        setLoading(true);
        const res = await getAdminCalendarData(selectedCourt, format(currentDate, 'yyyy-MM-dd'));
        if (res.success && res.data) setGridData(res.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [selectedCourt, currentDate]);

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

    const changeDay = (days: number) => {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + days);
        setCurrentDate(next);
    };

    const handleCancel = async (id: string) => {
        if (confirm('¿Estás seguro de cancelar este turno? Si es un turno fijo, solo se cancelará el de este día puntual.')) {
            const res = await cancelAdminBooking(id);
            if (res.success) loadData();
        }
    };

    const openModal = (courtId: string, courtName: string, time: string, endTime: string) => {
        setSlotData({ courtId, courtName, time, endTime });
        setFormData({ clientName: '', clientPhone: '', type: 'RESERVA' });
        setModalOpen(true);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!slotData) return;
        setSubmitting(true);

        const res = await createAdminBooking({
            courtId: slotData.courtId,
            dateStr: format(currentDate, 'yyyy-MM-dd'),
            startTimeStr: slotData.time,
            endTimeStr: slotData.endTime,
            type: formData.type,
            clientName: (formData.type === 'RESERVA' || formData.type === 'FIJO') ? formData.clientName : undefined,
            clientPhone: (formData.type === 'RESERVA' || formData.type === 'FIJO') ? formData.clientPhone : undefined,
        });

        if (res.success) {
            setModalOpen(false);
            loadData();
        } else {
            alert(res.error);
        }
        setSubmitting(false);
    };

    return (
        <div className="space-y-6 relative">

            {/* TOOLBAR SUPERIOR RESPONSIVA */}
            {!hideToolbar && (
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => changeDay(-1)} className="rounded-full">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center gap-3 font-black text-lg md:text-xl min-w-[220px] justify-center text-slate-800 dark:text-white">
                            <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 text-emerald-500" />
                            {format(currentDate, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => changeDay(1)} className="rounded-full">
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex items-center w-full lg:w-auto gap-2">
                        <select
                            value={selectedCourt}
                            onChange={(e) => setSelectedCourt(e.target.value)}
                            className="w-full lg:min-w-[300px] p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500 transition-all text-slate-700 dark:text-slate-200"
                        >
                            <option value="ALL">🌟 Ver TODAS las canchas</option>
                            {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* GRILLA DE CANCHAS */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold animate-pulse">Sincronizando agenda...</p>
                </div>
            ) : (
                <div className={`grid grid-cols-1 gap-6 ${selectedCourt === 'ALL' ? 'lg:grid-cols-2 xl:grid-cols-3' : ''}`}>
                    {gridData.map((courtData, cIdx) => (
                        <div key={cIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">

                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{courtData.court.name}</h3>
                                <Badge variant="outline">{courtData.court.surface}</Badge>
                            </div>

                            {!courtData.businessHour ? (
                                <div className="text-center py-10 text-slate-400 font-medium">Sin horarios para este día.</div>
                            ) : (
                                <div className="space-y-3">
                                    {courtData.slots.map((slot: any, idx: number) => {
                                        const isFree = slot.status === 'FREE';
                                        const isHighlighted = slot.booking?.id && slot.booking.id === highlightBookingId;
                                        
                                        return (
                                            <div
                                                key={idx}
                                                id={slot.booking?.id ? `booking-${slot.booking.id}` : undefined}
                                                className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-500 relative overflow-hidden ${isFree
                                                        ? 'bg-emerald-50/30 border-emerald-100 dark:bg-slate-800/30 dark:border-slate-800'
                                                        : isHighlighted 
                                                            ? 'bg-amber-50 border-amber-500 ring-4 ring-amber-500/20 shadow-xl scale-[1.02] z-10 animate-pulse dark:bg-amber-900/30 dark:border-amber-500'
                                                            : 'bg-slate-50 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700'
                                                    }`}
                                            >
                                                {isHighlighted && (
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse"></div>
                                                )}
                                                
                                                {/* BLOQUE HORA */}
                                                <div className="min-w-[70px] text-center">
                                                    <span className={`text-lg font-black ${isFree ? 'text-emerald-700 dark:text-emerald-400' : isHighlighted ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {slot.time}
                                                    </span>
                                                </div>

                                                {/* BLOQUE CONTENIDO */}
                                                <div className="flex-1 px-3">
                                                    {isFree ? (
                                                        <span className="text-emerald-600/70 dark:text-emerald-400/50 font-bold text-sm hidden group-hover:inline-block md:inline-block transition-all">
                                                            Libre
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                                                                {slot.booking?.user?.name || (slot.status === 'BLOCKED' ? 'Bloqueo Interno' : 'Cliente Local')}
                                                                {slot.status === 'FIXED' && <Badge variant="secondary" className="text-[9px] bg-blue-100 text-blue-700 hover:bg-blue-200 px-1 py-0 shadow-none">Fijo</Badge>}
                                                                {isHighlighted && <Badge className="text-[9px] bg-amber-500 hover:bg-amber-600 border-none px-1 py-0 shadow-none">¡NUEVO!</Badge>}
                                                            </div>
                                                            <div className={`text-xs font-medium ${isHighlighted ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>{slot.booking?.user?.phone}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ACCIONES */}
                                                <div>
                                                    {isFree ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openModal(courtData.court.id, courtData.court.name, slot.time, slot.endTime)}
                                                            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold rounded-xl shadow-md active:scale-95"
                                                        >
                                                            <Plus className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Reservar</span>
                                                        </Button>
                                                    ) : (
                                                        <Button variant="ghost" size="icon" onClick={() => handleCancel(slot.booking.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DE RESERVA MANUAL Y FIJA */}
            {modalOpen && slotData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">

                        <div className="bg-slate-100 dark:bg-slate-800 p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg text-slate-900 dark:text-white">Nueva Reserva</h3>
                                <p className="text-sm font-medium text-slate-500">{slotData.courtName} • {slotData.time} hs</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="p-5 space-y-5">
                            <div className="space-y-3">
                                <Label>Tipo de Gestión</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'RESERVA' })}
                                        className={`p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center text-xs ${formData.type === 'RESERVA' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
                                    >
                                        <User className="w-5 h-5 mb-1" />
                                        Cliente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'FIJO' })}
                                        className={`p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center text-xs ${formData.type === 'FIJO' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
                                    >
                                        <Repeat className="w-5 h-5 mb-1" />
                                        Fijo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'BLOQUEO' })}
                                        className={`p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center text-xs ${formData.type === 'BLOQUEO' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
                                    >
                                        <Lock className="w-5 h-5 mb-1" />
                                        Bloqueo
                                    </button>
                                </div>
                            </div>

                            {/* MENSAJES CONDICIONALES */}
                            {formData.type === 'FIJO' && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm font-medium animate-in fade-in space-y-2">
                                    <p>Se reservará <strong>todos los {format(currentDate, "EEEE", { locale: es })}</strong> por los próximos <strong>6 meses</strong>.</p>
                                    <p className="text-xs opacity-80">Si alguna semana ya tiene reserva, el sistema saltará ese día automáticamente.</p>
                                </div>
                            )}

                            {formData.type === 'BLOQUEO' && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl text-sm font-medium animate-in fade-in">
                                    Bloquea este turno solo por este día. Ideal para mantenimiento o clases particulares.
                                </div>
                            )}

                            {(formData.type === 'RESERVA' || formData.type === 'FIJO') && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="clientName">Nombre / Equipo</Label>
                                        <Input id="clientName" required placeholder="Ej: Juan Pérez / Los Pibes" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="clientPhone">WhatsApp (Opcional)</Label>
                                        <Input id="clientPhone" placeholder="Ej: 3329..." value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            <Button type="submit" disabled={submitting} className="w-full h-12 text-lg font-bold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-xl shadow-lg mt-4 transition-all">
                                {submitting ? 'Guardando...' : 'Confirmar'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
