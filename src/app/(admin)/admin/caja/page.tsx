'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, Calendar as CalendarIcon, ArrowDownCircle, ArrowUpCircle, 
  CreditCard, Smartphone, RefreshCw, Printer, CheckCircle2, AlertCircle,
  FileText, Coffee, MapPin, Clock, Loader2, Sparkles
} from 'lucide-react';
import { getCashRegisterReport, CashRegisterReport } from '@/actions/cash-register';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CashRegisterPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [report, setReport] = useState<CashRegisterReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BOOKINGS' | 'CANTINA' | 'EXPENSES'>('ALL');

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    const res = await getCashRegisterReport(selectedDate);
    if (res.success && res.data) {
      setReport(res.data);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* HEADER & CONTROLES DE FECHA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-500" /> Cierre & Arqueo de Caja Diario
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
            Control exacto de efectivo en mano, Mercado Pago, transferencias y gastos por fecha.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto h-11 rounded-2xl text-xs md:text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />

          <Button
            variant="outline"
            onClick={loadReport}
            disabled={loading}
            className="h-11 rounded-2xl px-3 text-slate-600 dark:text-slate-300"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </Button>

          <Button
            onClick={handlePrint}
            className="h-11 rounded-2xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs md:text-sm px-4 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-1.5" /> Imprimir Cierre
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Calculando balance de caja...</p>
        </div>
      ) : report ? (
        <>
          {/* TARJETAS DE ARQUEO / RESUMEN EJECUTIVO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            
            {/* EFECTIVO EN CAJA (DESTACADA) */}
            <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 rounded-3xl shadow-lg shadow-emerald-500/20 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider opacity-90 block mb-1">
                  💵 Efectivo en Caja (a Rendir)
                </span>
                <span className="text-2xl md:text-3xl font-black">
                  ${report.summary.netCashInDrawer.toLocaleString('es-AR')}
                </span>
              </div>
              <p className="text-[11px] opacity-80 mt-3 font-medium">
                (Recaudado en mano: ${report.summary.totalCashIn.toLocaleString('es-AR')} - Gastos: ${report.summary.totalExpenses.toLocaleString('es-AR')})
              </p>
            </div>

            {/* MERCADO PAGO ONLINE */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                  💳 Mercado Pago (Online)
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  ${report.summary.totalMercadoPagoIn.toLocaleString('es-AR')}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-2">Acreditado en cuenta</span>
            </div>

            {/* TRANSFERENCIAS / ALIAS */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                  📲 Transferencias / Alias
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  ${report.summary.totalTransferIn.toLocaleString('es-AR')}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-2">En banco / billetera</span>
            </div>

            {/* GASTOS / EGRESOS */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                  📉 Egresos / Gastos
                </span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  -${report.summary.totalExpenses.toLocaleString('es-AR')}
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-2">{report.expensesBreakdown.totalCount} movimientos</span>
            </div>

            {/* TOTAL FACTURADO BRUTO */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                  🏆 Facturación Bruta
                </span>
                <span className="text-2xl font-black">
                  ${report.summary.totalRevenue.toLocaleString('es-AR')}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 mt-2">Canchas + Cantina</span>
            </div>

          </div>

          {/* NAVEGACIÓN DE PESTAÑAS DETALLE */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {[
              { id: 'ALL', label: 'Todos los Movimientos' },
              { id: 'BOOKINGS', label: `Turnos (${report.bookingsBreakdown.totalBookingsCount})` },
              { id: 'CANTINA', label: `Cantina (${report.cantinaBreakdown.totalSalesCount})` },
              { id: 'EXPENSES', label: `Gastos (${report.expensesBreakdown.totalCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TABLAS DETALLADAS */}
          <div className="space-y-6">
            
            {/* 1. SECCIÓN TURNOS / RESERVAS */}
            {(activeTab === 'ALL' || activeTab === 'BOOKINGS') && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--color-primary)]" /> Turnos y Canchas de la Fecha
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-emerald-600">Efectivo: ${report.bookingsBreakdown.cashTotal.toLocaleString('es-AR')}</span>
                    <span className="text-blue-600">Transf.: ${report.bookingsBreakdown.transferTotal.toLocaleString('es-AR')}</span>
                    <span className="text-purple-600">MP: ${report.bookingsBreakdown.mercadoPagoTotal.toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {report.bookingsBreakdown.list.length === 0 ? (
                  <p className="text-slate-400 text-xs py-6 text-center">No hubo turnos registrados en esta fecha.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="pb-2">Horario</th>
                          <th className="pb-2">Cancha</th>
                          <th className="pb-2">Jugador</th>
                          <th className="pb-2">Método</th>
                          <th className="pb-2">Estado</th>
                          <th className="pb-2 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {report.bookingsBreakdown.list.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 font-bold text-slate-700 dark:text-slate-300">{b.timeStr}</td>
                            <td className="py-3 font-bold text-slate-900 dark:text-white">{b.courtName}</td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">{b.clientName}</td>
                            <td className="py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                b.method === 'CASH'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : b.method === 'TRANSFER'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                                  : b.method === 'MERCADOPAGO'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              }`}>
                                {b.method === 'CASH' ? 'Efectivo' : b.method === 'TRANSFER' ? 'Transferencia' : b.method === 'MERCADOPAGO' ? 'Mercado Pago' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="text-[11px] font-bold text-slate-500 capitalize">{b.status.toLowerCase()}</span>
                            </td>
                            <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                              ${b.totalAmount.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. SECCIÓN VENTAS DE CANTINA */}
            {(activeTab === 'ALL' || activeTab === 'CANTINA') && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-500" /> Ventas de Cantina & Kiosco
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-emerald-600">Efectivo: ${report.cantinaBreakdown.cashTotal.toLocaleString('es-AR')}</span>
                    <span className="text-blue-600">Transf.: ${report.cantinaBreakdown.transferTotal.toLocaleString('es-AR')}</span>
                    <span className="text-purple-600">MP: ${report.cantinaBreakdown.mercadoPagoTotal.toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {report.cantinaBreakdown.list.length === 0 ? (
                  <p className="text-slate-400 text-xs py-6 text-center">No hubo ventas de cantina registradas en esta fecha.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="pb-2">Hora</th>
                          <th className="pb-2">Cliente / Cancha</th>
                          <th className="pb-2">Artículos</th>
                          <th className="pb-2">Método</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {report.cantinaBreakdown.list.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 font-bold text-slate-700 dark:text-slate-300">
                              {new Date(s.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                            </td>
                            <td className="py-3 font-bold text-slate-900 dark:text-white">{s.customerName}</td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">
                              {s.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                            </td>
                            <td className="py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                s.paymentMethod === 'CASH'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : s.paymentMethod === 'TRANSFER'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                              }`}>
                                {s.paymentMethod === 'CASH' ? 'Efectivo' : s.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Mercado Pago'}
                              </span>
                            </td>
                            <td className="py-3 text-right font-black text-slate-900 dark:text-white">
                              ${Number(s.totalAmount).toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. SECCIÓN GASTOS / EGRESOS */}
            {(activeTab === 'ALL' || activeTab === 'EXPENSES') && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-rose-500" /> Gastos Operativos & Retiros de Caja
                  </h3>
                  <span className="text-xs font-black text-rose-600">
                    Total: -${report.expensesBreakdown.totalAmount.toLocaleString('es-AR')}
                  </span>
                </div>

                {report.expensesBreakdown.list.length === 0 ? (
                  <p className="text-slate-400 text-xs py-6 text-center">No hubo gastos registrados en esta fecha.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="pb-2">Hora</th>
                          <th className="pb-2">Categoría</th>
                          <th className="pb-2">Descripción</th>
                          <th className="pb-2 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {report.expensesBreakdown.list.map(e => (
                          <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 font-bold text-slate-700 dark:text-slate-300">{e.timeStr} hs</td>
                            <td className="py-3 font-bold text-slate-900 dark:text-white">
                              {e.category || 'Operativo'}
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">{e.description}</td>
                            <td className="py-3 text-right font-black text-rose-600 dark:text-rose-400">
                              -${e.amount.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No se pudo cargar el reporte de caja.</p>
        </div>
      )}

    </div>
  );
}
