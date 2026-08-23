'use client';

import { useState } from 'react';
import { getBookingsByPhone } from '@/actions/public-bookings';
import { Search, Loader2, ArrowLeft, Calendar, Clock, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function MisTurnosClient() {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [bookings, setBookings] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = phone.trim().replace(/\D/g, '');
        if (clean.length < 6) {
            setError('Ingresa un número de teléfono válido con código de área.');
            return;
        }

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            const result = await getBookingsByPhone(phone);
            if (result.success && result.data) {
                setBookings(result.data);
            } else {
                setError(result.error || 'Ocurrió un error al buscar los turnos.');
                setBookings([]);
            }
        } catch (err) {
            setError('Ocurrió un error de conexión al buscar los turnos.');
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
            <div className="mb-6 flex items-center gap-3">
                <Link href="/" aria-label="Volver" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-slate-200">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Mis Turnos</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Historial y estado de tus reservas</p>
                </div>
            </div>

            <form onSubmit={handleSearch} className="mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 mb-3">
                    <label htmlFor="search-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Ingresa el WhatsApp con el que reservaste:
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                id="search-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all shadow-sm"
                                placeholder="Ej: 3329 123456"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold py-3 px-5 rounded-xl transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm shadow-md"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-300 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </form>

            {searched && !loading && bookings.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No encontramos reservas</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No hay turnos registrados para este número en los últimos 30 días.</p>
                </div>
            )}

            {bookings.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Turnos Encontrados ({bookings.length})
                        </h2>
                    </div>
                    {bookings.map((booking) => {
                        const isPlayed = booking.isPast && booking.status === 'CONFIRMED';
                        return (
                            <div 
                                key={booking.id} 
                                className={`rounded-2xl border p-4 transition-all shadow-sm relative overflow-hidden ${
                                    isPlayed 
                                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75' 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <MapPin className={`w-4 h-4 ${isPlayed ? 'text-slate-400' : 'text-[var(--color-primary)]'}`} />
                                        <span className={`font-black text-sm ${isPlayed ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                            {booking.courtName}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                        isPlayed ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                                        booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' :
                                        booking.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40' :
                                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/40'
                                    }`}>
                                        {isPlayed ? 'JUGADO' :
                                         booking.status === 'CONFIRMED' ? 'CONFIRMADO' :
                                         booking.status === 'PENDING' ? 'PENDIENTE PAGO' : 'CANCELADO'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {booking.date}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {booking.time} hs
                                        </span>
                                    </div>
                                    {booking.totalAmount > 0 && (
                                        <span className="font-black text-slate-900 dark:text-white">
                                            ${booking.totalAmount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
