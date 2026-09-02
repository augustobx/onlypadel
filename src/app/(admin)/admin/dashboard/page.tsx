import { getDashboardStats, getTodaySnapshot } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, DollarSign, Trophy, MapPin, Clock, ArrowRight, Plus, 
  Calendar as CalendarIcon, CheckCircle2, AlertCircle, XCircle, LayoutGrid,
  Sparkles, Repeat, Settings, CreditCard, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [statsRes, snapshotRes] = await Promise.all([
    getDashboardStats(),
    getTodaySnapshot()
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    todayBookings: 0, activeCourts: 0, pendingRevenue: 0, activeTournaments: 0
  };

  const todayBookings = snapshotRes.success && snapshotRes.data ? snapshotRes.data : [];

  // Formateo de fecha actual
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' };
  const formattedDate = today.toLocaleDateString('es-AR', dateOptions);
  
  // Saludo dinámico
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none font-bold"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado</Badge>;
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none font-bold"><AlertCircle className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'FIXED':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-none font-bold"><Repeat className="w-3 h-3 mr-1" /> Abono Fijo</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none font-bold"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="font-bold">{status}</Badge>;
    }
  };

  return (
    <div className="p-2 md:p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      <AutoRefresh intervalMs={30000} />
      
      {/* HEADER & SALUDO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-[var(--color-primary)] mb-3 backdrop-blur-sm border border-white/5">
            <Sparkles className="w-3.5 h-3.5" /> Panel de Control Operativo
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            {greeting}, Administrador 👋
          </h1>
          <p className="text-slate-400 font-medium mt-1 text-sm md:text-base capitalize">
            {formattedDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 relative z-10">
          <Link 
            href="/admin/calendar?view=day" 
            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all shadow-md flex items-center gap-2"
          >
            <CalendarIcon className="w-4 h-4" /> Calendario Hoy
          </Link>
          <Link 
            href="/admin/calendar?view=week" 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <CalendarDays className="w-4 h-4" /> Semana
          </Link>
          <Link 
            href="/admin/calendar?view=month" 
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <LayoutGrid className="w-4 h-4" /> Mes
          </Link>
        </div>
      </div>

      {/* QUICK STATS (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* KPI 1 */}
        <Card className="border-slate-200 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden relative group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reservas de Hoy</CardTitle>
            <div className="p-2.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 rounded-2xl">
              <CalendarDays className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.todayBookings}</div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Operación en vivo
            </p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border-slate-200 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden relative group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Canchas Habilitadas</CardTitle>
            <div className="p-2.5 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 rounded-2xl">
              <MapPin className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.activeCourts}</div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">Disponibles en el sistema</p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border-slate-200 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden relative group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monto por Cobrar</CardTitle>
            <div className="p-2.5 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 rounded-2xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">${Number(stats.pendingRevenue).toLocaleString('es-AR')}</div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">Turnos pendientes de hoy</p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border-slate-200 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden relative group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Torneos Activos</CardTitle>
            <div className="p-2.5 bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-400 rounded-2xl">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.activeTournaments}</div>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1">Competiciones en curso</p>
          </CardContent>
        </Card>
      </div>

      {/* ACCESOS DIRECTOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link 
          href="/admin/calendar?view=week" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[var(--color-primary)] flex items-center gap-3 transition-all group shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Ver Semana</p>
            <p className="text-[10px] text-slate-400">Parrilla 7 días</p>
          </div>
        </Link>

        <Link 
          href="/admin/abonos" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 flex items-center gap-3 transition-all group shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Abonos Fijos</p>
            <p className="text-[10px] text-slate-400">Turnos fijos club</p>
          </div>
        </Link>

        <Link 
          href="/admin/expenses" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 flex items-center gap-3 transition-all group shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Gastos & Caja</p>
            <p className="text-[10px] text-slate-400">Control de finanzas</p>
          </div>
        </Link>

        <Link 
          href="/admin/settings" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 flex items-center gap-3 transition-all group shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Configuración</p>
            <p className="text-[10px] text-slate-400">Temas, logo y PWA</p>
          </div>
        </Link>
      </div>

      {/* AGENDA DEL DÍA */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between p-5">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <LayoutGrid className="w-5 h-5 text-[var(--color-primary)]" /> Agenda de Turnos de Hoy
          </CardTitle>
          <Link href="/admin/calendar?view=day" className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 group">
            Ver cuadrícula completa <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[120px] font-bold text-xs text-slate-500 uppercase">Horario</TableHead>
                  <TableHead className="font-bold text-xs text-slate-500 uppercase">Cancha</TableHead>
                  <TableHead className="font-bold text-xs text-slate-500 uppercase">Cliente / Jugador</TableHead>
                  <TableHead className="text-right font-bold text-xs text-slate-500 uppercase">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayBookings.map((booking) => (
                  <TableRow key={booking.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800/80">
                    <TableCell className="font-bold text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {booking.startTime.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        {booking.court.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300 font-medium text-xs">
                      {booking.user?.name || booking.user?.email || booking.description || 'Cliente de Local'}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(booking.status)}
                    </TableCell>
                  </TableRow>
                ))}

                {todayBookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-xs text-slate-500">No hay reservas programadas para el resto del día.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}