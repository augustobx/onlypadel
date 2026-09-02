'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Search, Plus, DollarSign, ArrowUpRight, ArrowDownLeft, 
  User, CheckCircle2, AlertCircle, Clock, X, Loader2, RefreshCw, Eye
} from 'lucide-react';
import { 
  getAllAccountsSummary, getUserCurrentAccount, addAccountMovement, 
  recordDebtPayment, searchUsersForPos, UserAccountData, AccountMovement 
} from '@/actions/current-account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CuentasCorrientesPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'DEBTORS' | 'CLEAN'>('DEBTORS');

  // Modal para ver historial de un socio
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserAccountData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal para registrar pago de deuda
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingUser, setPayingUser] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal para cargo/abono manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualUser, setManualUser] = useState<any>(null);
  const [manualType, setManualType] = useState<'CHARGE' | 'PAYMENT'>('CHARGE');
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualConcept, setManualConcept] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getAllAccountsSummary();
    if (res.success) {
      setAccounts(res.data);
      setTotalDebt(res.totalDebt);
    }
    setLoading(false);
  };

  const handleOpenHistory = async (userId: string) => {
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    const res = await getUserCurrentAccount(userId);
    if (res.success && res.data) {
      setSelectedAccount(res.data);
    }
    setLoadingHistory(false);
  };

  const handleOpenPay = (account: any) => {
    setPayingUser(account);
    setPayAmount(Math.abs(account.balance));
    setPayMethod('CASH');
    setPayNotes('');
    setPayModalOpen(true);
  };

  const handleSubmitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingUser || payAmount <= 0) return;
    setSubmittingPayment(true);

    const res = await recordDebtPayment({
      userId: payingUser.userId,
      amount: payAmount,
      paymentMethod: payMethod,
      notes: payNotes.trim() || 'Abono en mostrador'
    });

    if (res.success) {
      setPayModalOpen(false);
      setPayingUser(null);
      loadData();
    } else {
      alert(res.error || 'Error al registrar el pago.');
    }
    setSubmittingPayment(false);
  };

  const handleManualUserSearch = async (q: string) => {
    setUserSearchQuery(q);
    if (!q.trim()) {
      setUserSearchResults([]);
      return;
    }
    const res = await searchUsersForPos(q);
    if (res.success) setUserSearchResults(res.data);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUser || manualAmount <= 0 || !manualConcept.trim()) return;

    const res = await addAccountMovement({
      userId: manualUser.id || manualUser.userId,
      type: manualType,
      amount: manualAmount,
      concept: manualConcept.trim(),
      notes: manualNotes.trim() || undefined
    });

    if (res.success) {
      setManualModalOpen(false);
      setManualUser(null);
      setManualAmount(0);
      setManualConcept('');
      loadData();
    } else {
      alert(res.error || 'Error al guardar movimiento.');
    }
  };

  const debtorsCount = accounts.filter(a => a.balance < 0).length;
  const cleanCount = accounts.filter(a => a.balance >= 0).length;

  const filteredAccounts = accounts.filter(a => {
    const matchSearch = a.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.userDni && a.userDni.includes(searchTerm)) ||
      (a.userPhone && a.userPhone.includes(searchTerm));
    
    if (!matchSearch) return false;
    if (filter === 'DEBTORS') return a.balance < 0;
    if (filter === 'CLEAN') return a.balance >= 0;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-amber-500" /> Cuentas Corrientes & Fiados
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
            Control de saldo deudor de socios, consumos de cantina a cuenta y cobro de deudas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-2xl h-11 px-3 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setManualUser(null);
              setManualType('CHARGE');
              setManualAmount(0);
              setManualConcept('');
              setUserSearchQuery('');
              setUserSearchResults([]);
              setManualModalOpen(true);
            }}
            className="rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs md:text-sm h-11 px-4 shadow-md shadow-amber-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Movimiento Manual
          </Button>
        </div>
      </div>

      {/* STATS HERO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white p-5 rounded-3xl shadow-lg shadow-rose-500/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider opacity-90 block mb-1">
              📉 Deuda Total en la Calle
            </span>
            <span className="text-2xl md:text-3xl font-black">
              ${totalDebt.toLocaleString('es-AR')}
            </span>
          </div>
          <p className="text-[11px] opacity-80 mt-2 font-medium">
            Dinero pendiente de cobro de socios del club
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block mb-1">
              Socios con Deuda
            </span>
            <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {debtorsCount} socios
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 mt-2">Poseen saldo pendiente</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block mb-1">
              Cuentas al Día / A Favor
            </span>
            <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {cleanCount} socios
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 mt-2">Sin deuda pendiente</span>
        </div>

      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por socio, DNI o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs font-bold"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {[
            { id: 'DEBTORS', label: `Solo Deudores (${debtorsCount})` },
            { id: 'ALL', label: `Todos (${accounts.length})` },
            { id: 'CLEAN', label: `Al Día (${cleanCount})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE CUENTAS CORRIENTES */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400">Cargando cuentas corrientes...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">No se encontraron cuentas corrientes con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Socio / Jugador</th>
                  <th className="pb-3">Contacto</th>
                  <th className="pb-3">Estado de Cuenta</th>
                  <th className="pb-3 text-right">Saldo Actual</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredAccounts.map(account => (
                  <tr key={account.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {account.userName}
                      </p>
                      {account.userDni && (
                        <span className="text-[10px] text-slate-400">DNI: {account.userDni}</span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {account.userPhone || '-'}
                    </td>
                    <td className="py-3.5">
                      {account.balance < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Debe Dinero
                        </span>
                      ) : account.balance === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Al Día
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Saldo a Favor
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right font-black text-sm">
                      {account.balance < 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          -${Math.abs(account.balance).toLocaleString('es-AR')}
                        </span>
                      ) : account.balance === 0 ? (
                        <span className="text-slate-500">$0</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">
                          +${account.balance.toLocaleString('es-AR')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {account.balance < 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPay(account)}
                            className="rounded-xl h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm"
                          >
                            <DollarSign className="w-3.5 h-3.5 mr-1" /> Cobrar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenHistory(account.userId)}
                          className="rounded-xl h-8 px-2.5 text-slate-600 dark:text-slate-300"
                          title="Ver historial de movimientos"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Historial
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL COBRAR DEUDA */}
      {payModalOpen && payingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Registrar Cobro de Deuda
                </h3>
                <p className="text-xs text-slate-500">{payingUser.userName}</p>
              </div>
              <button 
                onClick={() => setPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPay} className="space-y-4">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex justify-between items-center">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Deuda actual del socio:</span>
                <span className="text-base font-black text-rose-600">
                  ${Math.abs(payingUser.balance).toLocaleString('es-AR')}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Monto a Cobrar ($)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="rounded-xl font-black text-lg h-11"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Método de Ingreso</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CASH', label: '💵 Efectivo (Caja)' },
                    { id: 'TRANSFER', label: '📲 Transferencia' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        payMethod === m.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Observaciones (Opcional)</Label>
                <Input
                  placeholder="Ej: Pago parcial / Pago total en recepción"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayModalOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPayment || payAmount <= 0}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                >
                  {submittingPayment ? 'Registrando...' : `Confirmar Cobro $${payAmount.toLocaleString('es-AR')}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE CUENTA CORRIENTE */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Historial de Movimientos
                </h3>
                <p className="text-xs text-slate-500">{selectedAccount?.userName || 'Socio'}</p>
              </div>
              <button 
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Cargando movimientos...</p>
              </div>
            ) : selectedAccount ? (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Saldo actual de la cuenta:</span>
                  <span className={`text-base font-black ${
                    selectedAccount.balance < 0 ? 'text-rose-600' : selectedAccount.balance === 0 ? 'text-slate-600' : 'text-blue-600'
                  }`}>
                    {selectedAccount.balance < 0
                      ? `Debe $${Math.abs(selectedAccount.balance).toLocaleString('es-AR')}`
                      : `$${selectedAccount.balance.toLocaleString('es-AR')}`}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                  {selectedAccount.movements.length === 0 ? (
                    <p className="text-center py-8 text-xs text-slate-400">
                      No hay movimientos registrados en esta cuenta corriente.
                    </p>
                  ) : (
                    selectedAccount.movements.map(m => (
                      <div
                        key={m.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            {m.type === 'CHARGE' ? (
                              <ArrowDownLeft className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            )}
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {m.concept}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {new Date(m.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`font-black text-sm block ${
                            m.type === 'CHARGE' ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {m.type === 'CHARGE' ? '-' : '+'}${m.amount.toLocaleString('es-AR')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Saldo: ${m.balanceAfter.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO MANUAL */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                Cargar Movimiento Manual
              </h3>
              <button 
                onClick={() => setManualModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Selector de Socio */}
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Socio a Modificar
                </Label>
                {manualUser ? (
                  <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                    <span className="font-bold text-xs">👤 {manualUser.name}</span>
                    <button
                      type="button"
                      onClick={() => setManualUser(null)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar por nombre o DNI..."
                      value={userSearchQuery}
                      onChange={(e) => handleManualUserSearch(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                    {userSearchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        {userSearchResults.map(u => (
                          <div
                            key={u.id}
                            onClick={() => { setManualUser(u); setUserSearchResults([]); }}
                            className="p-1.5 rounded-lg text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/50 cursor-pointer"
                          >
                            {u.name} {u.dni ? `(${u.dni})` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Movimiento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('CHARGE')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      manualType === 'CHARGE'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    📉 Cargo (Deuda)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('PAYMENT')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      manualType === 'PAYMENT'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    📈 Abono (Pago / Saldo)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Monto ($)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={manualAmount}
                  onChange={(e) => setManualAmount(Number(e.target.value) || 0)}
                  className="rounded-xl font-black text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Concepto / Motivo</Label>
                <Input
                  required
                  placeholder="Ej: Ajuste de saldo, Alquiler paleta, Abono previo"
                  value={manualConcept}
                  onChange={(e) => setManualConcept(e.target.value)}
                  className="rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualModalOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!manualUser || manualAmount <= 0 || !manualConcept.trim()}
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Guardar Movimiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
