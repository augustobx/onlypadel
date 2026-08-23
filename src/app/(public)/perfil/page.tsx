import { getUserSession, logoutUser } from "@/actions/user-auth";
import { getSettings } from "@/actions/settings";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicNavbar from "@/components/PublicNavbar";
import { Trophy, CalendarDays, LogOut, Medal, CalendarClock, Phone, IdCard, ChevronRight, Swords, Clock, BadgeCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { getReadableForeground, normalizeHexColor } from "@/lib/color";

export default async function PerfilPage() {
    const session = await getUserSession();
    if (!session) {
        redirect("/login-usuario");
    }

    const settings = await getSettings();
    const theme = settings?.theme || 'light';
    const primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
    const secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');

    // Cargar asignación de categoría oficial del jugador
    const [categoryAssignment, userCategoryLevel, bookings, teams] = await Promise.all([
        prisma.playerCategoryAssignment.findFirst({
            where: { userId: session.id },
            include: { level: true }
        }),
        session.category ? prisma.playerCategoryLevel.findFirst({
            where: { name: session.category }
        }) : null,
        prisma.booking.findMany({
            where: { user: { dni: session.dni } },
            orderBy: { startTime: 'desc' },
            include: { court: true },
            take: 20
        }),
        prisma.tournamentTeam.findMany({
            where: { 
                OR: [
                    { player1: { dni: session.dni } },
                    { player2: { dni: session.dni } }
                ]
            },
            include: {
                player1: true,
                player2: true,
                category: { include: { tournament: true } }
            }
        })
    ]);

    const officialCategoryName = categoryAssignment?.level?.name || session.category || null;
    const categoryColor = categoryAssignment?.level?.color || userCategoryLevel?.color || primaryColor;
    const categoryDescription = categoryAssignment?.level?.description || userCategoryLevel?.description || null;
    const categoryNote = categoryAssignment?.publicNote || null;

    const teamIds = teams.map(t => t.id);
    const tournamentMatches = await prisma.tournamentMatch.findMany({
        where: {
            OR: [
                { team1Id: { in: teamIds } },
                { team2Id: { in: teamIds } }
            ],
            startTime: { not: null }
        },
        include: {
            team1: true,
            team2: true,
            court: true,
            category: { include: { tournament: true } }
        },
        orderBy: { startTime: 'asc' }
    });

    const now = new Date();
    const upcomingMatches = tournamentMatches.filter(m => m.startTime && new Date(m.startTime) >= now);
    const playedBookingsCount = bookings.filter(b => b.status === 'CONFIRMED' && b.endTime < now).length;
    const activeBookingsCount = bookings.filter(b => (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.endTime >= now).length;

    // Iniciales para el avatar
    const initials = `${(session.name || '').charAt(0)}${(session.lastName || '').charAt(0)}`.toUpperCase() || 'TP';

    return (
        <div 
            className={`${theme} min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:items-center md:py-8`}
            style={{ 
                '--color-primary': primaryColor,
                '--color-primary-foreground': getReadableForeground(primaryColor),
                '--color-secondary': secondaryColor,
                '--color-secondary-foreground': getReadableForeground(secondaryColor),
            } as React.CSSProperties}
        >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen md:min-h-0 md:rounded-[2.5rem] md:shadow-2xl md:border md:border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col">
                <PublicNavbar sysSettings={settings} />
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    
                    {/* TARJETA HERO DEL JUGADOR */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl border border-slate-700/60">
                        <div className="absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-[var(--color-primary)]/20 blur-3xl" />
                        <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-[var(--color-secondary)]/20 blur-3xl" />
                        
                        <div className="relative z-10">
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center font-black text-xl text-[var(--color-primary-foreground)] shadow-lg ring-2 ring-white/20 shrink-0">
                                        {initials}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white leading-tight tracking-tight">
                                            {session.name} {session.lastName}
                                        </h2>
                                        <div className="flex items-center gap-1.5 mt-1 text-slate-300 text-xs font-semibold">
                                            <IdCard className="w-3.5 h-3.5 text-slate-400" />
                                            <span>DNI {session.dni}</span>
                                        </div>
                                    </div>
                                </div>
                                <form action={logoutUser}>
                                    <button 
                                        type="submit" 
                                        aria-label="Cerrar sesión"
                                        className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs font-bold bg-red-950/60 hover:bg-red-900/60 border border-red-800/50 px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
                                    >
                                        <LogOut className="w-3.5 h-3.5" /> Salir
                                    </button>
                                </form>
                            </div>

                            {/* BADGES DEL PERFIL */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
                                <span 
                                    className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl shadow-sm text-white"
                                    style={{ backgroundColor: categoryColor }}
                                >
                                    <Medal className="w-3.5 h-3.5" /> Categoría: {officialCategoryName || 'Sin Categoría'}
                                </span>
                                {session.phone && (
                                    <span className="inline-flex items-center gap-1.5 bg-slate-800/90 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-xl border border-slate-700/70">
                                        <Phone className="w-3 h-3 text-slate-400" /> {session.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TARJETA DE CATEGORÍA OFICIAL DEPORTIVA */}
                    <div className="bg-slate-50 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <BadgeCheck className="w-5 h-5" style={{ color: categoryColor }} />
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    Nivel Deportivo Oficial
                                </h3>
                            </div>
                            <span 
                                className="px-2.5 py-0.5 rounded-full text-xs font-black text-white shadow-sm"
                                style={{ backgroundColor: categoryColor }}
                            >
                                {officialCategoryName || 'Sin Asignar'}
                            </span>
                        </div>

                        {categoryDescription && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">
                                {categoryDescription}
                            </p>
                        )}

                        {categoryNote && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 mb-2 font-medium">
                                📌 {categoryNote}
                            </p>
                        )}

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">¿Querés ver el padrón general?</span>
                            <Link 
                                href="/categorias-jugadores" 
                                className="font-bold text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
                            >
                                Ver Categorías <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>

                    {/* CONTADORES RÁPIDOS */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center shadow-sm">
                            <span className="block text-2xl font-black text-[var(--color-primary)] leading-tight">{activeBookingsCount}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Turnos Activos</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center shadow-sm">
                            <span className="block text-2xl font-black text-[var(--color-secondary)] leading-tight">{teams.length}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Torneos</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center shadow-sm">
                            <span className="block text-2xl font-black text-amber-500 leading-tight">{playedBookingsCount}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Jugados</span>
                        </div>
                    </div>

                    {/* SECCIÓN 1: PRÓXIMOS PARTIDOS DE TORNEO */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                <CalendarClock className="w-5 h-5 text-emerald-500" /> Próximos Partidos
                            </h3>
                            {upcomingMatches.length > 0 && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                                    {upcomingMatches.length} en agenda
                                </span>
                            )}
                        </div>

                        {tournamentMatches.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl text-center border border-slate-200/80 dark:border-slate-700/60">
                                <Swords className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    No tienes partidos de torneo programados con horario.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tournamentMatches.map((m: any) => {
                                    const matchDate = new Date(m.startTime);
                                    const isPast = matchDate < now;
                                    return (
                                        <div 
                                            key={m.id} 
                                            className={`p-4 rounded-2xl border transition-all ${
                                                isPast 
                                                    ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75' 
                                                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-sm ring-1 ring-emerald-500/10'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2.5">
                                                <div>
                                                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                                                        {m.category.tournament.name}
                                                    </span>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                        Categoría {m.category.name}
                                                    </h4>
                                                </div>
                                                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                                    {m.roundName || 'Fase de Grupos'}
                                                </span>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                <span className="truncate max-w-[45%]">{m.team1?.name || 'Pareja 1'}</span>
                                                <span className="text-[10px] font-black text-slate-400 px-1.5">VS</span>
                                                <span className="truncate max-w-[45%] text-right">{m.team2?.name || 'Pareja 2'}</span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                                    {matchDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} • 
                                                    {matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                                                </span>
                                                {m.court && (
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                        {m.court.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN 2: MIS TORNEOS */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                <Trophy className="w-5 h-5 text-amber-500" /> Mis Torneos
                            </h3>
                        </div>

                        {teams.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl text-center border border-slate-200/80 dark:border-slate-700/60">
                                <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Aún no te has inscripto en torneos.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {teams.map(team => {
                                    const partner = team.player1?.dni === session.dni ? team.player2 : team.player1;
                                    return (
                                        <Link 
                                            key={team.id} 
                                            href={`/torneos/${team.category.tournamentId}`} 
                                            className="group block bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[var(--color-primary)] transition-all shadow-sm active:scale-[0.99]"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-[var(--color-primary)] transition-colors">
                                                    {team.category.tournament.name}
                                                </h4>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[var(--color-primary)] transition-colors" />
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    Categoría {team.category.name}
                                                </span>
                                                {partner && (
                                                    <span className="text-[11px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                                                        Compañero: {partner.name} {partner.lastName}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN 3: MI HISTORIAL DE TURNOS */}
                    <div className="space-y-3 pb-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                <CalendarDays className="w-5 h-5 text-blue-500" /> Mis Turnos
                            </h3>
                            <Link href="/mis-turnos" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                Buscar por teléfono
                            </Link>
                        </div>

                        {bookings.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl text-center border border-slate-200/80 dark:border-slate-700/60">
                                <CalendarDays className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    No tienes turnos registrados con tu DNI.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {bookings.map(booking => {
                                    const bookingDate = new Date(booking.startTime);
                                    const isPlayed = booking.endTime < now && booking.status === 'CONFIRMED';
                                    
                                    return (
                                        <div 
                                            key={booking.id} 
                                            className={`p-4 rounded-2xl border transition-all ${
                                                isPlayed 
                                                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70' 
                                                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                        {booking.court.name}
                                                    </h4>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                        {booking.court.surface || 'Padel'}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                                    isPlayed ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                                                    booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                                    booking.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                }`}>
                                                    {isPlayed ? 'JUGADO' : 
                                                     booking.status === 'CONFIRMED' ? 'CONFIRMADO' : 
                                                     booking.status === 'PENDING' ? 'PENDIENTE PAGO' : 'CANCELADO'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                    {bookingDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} • 
                                                    {bookingDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                                                </span>
                                                {Number(booking.totalAmount) > 0 && (
                                                    <span className="font-black text-slate-900 dark:text-white">
                                                        ${Number(booking.totalAmount)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
