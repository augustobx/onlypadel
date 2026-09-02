export const dynamic = 'force-dynamic';

import { getPublicCourts } from "@/actions/public-bookings";
import { getSettings } from "@/actions/settings";
import { getPublicTournaments } from "@/actions/public-tournaments";
import BookingFlow from "@/components/BookingFlow";
import BookingFlowChat from "@/components/BookingFlowChat";
import PublicNavbar from "@/components/PublicNavbar";
import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { cookies } from "next/headers";
import UserWelcomeSplash from "@/components/UserWelcomeSplash";
import { getUserSession } from "@/actions/user-auth";
import { getReadableForeground, normalizeHexColor } from "@/lib/color";
import { isPlatformRequest, resolveTenantContext, TenantResolutionError } from "@/lib/tenant-context";
import { notFound, redirect } from "next/navigation";

export default async function HomePage() {
    if (await isPlatformRequest()) {
        return (
            <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
                <div className="max-w-3xl text-center">
                    <p className="text-emerald-400 font-black tracking-[0.3em] text-sm">ONLYPADEL</p>
                    <h1 className="text-5xl md:text-7xl font-black mt-5">Tu club, completamente online.</h1>
                    <p className="text-slate-400 text-lg md:text-xl mt-6">Reservas, socios, torneos, rankings y operación diaria en una plataforma SaaS segura para cada club.</p>
                    <Link href="/superadmin/login" className="inline-block mt-9 rounded-2xl bg-emerald-500 px-7 py-4 font-black text-slate-950">Acceso de plataforma</Link>
                </div>
            </main>
        );
    }
    try {
        await resolveTenantContext();
    } catch (error) {
        if (error instanceof TenantResolutionError && error.message === 'TENANT_SUSPENDED') redirect('/suspendido');
        notFound();
    }
    const pubReq = await getPublicTournaments();
    const activeTournament = pubReq.data?.find(t => t.status !== 'COMPLETED');

    const courtsRes = await getPublicCourts();
    const courts = courtsRes?.success && courtsRes?.data ? courtsRes.data : [];

    const settings = await getSettings();
    const theme = settings?.theme || 'light';
    const themeClass = theme === 'cyber-padel'
        ? 'dark theme-cyber-padel'
        : theme === 'sunset-clay'
        ? 'dark theme-sunset-clay'
        : theme === 'ocean-frost'
        ? 'dark theme-ocean-frost'
        : theme === 'dark'
        ? 'dark'
        : '';
    const appLayout = settings?.appLayout || 'classic';

    const isReservationsEnabled = settings?.reservationsEnabled ?? true;
    const isWhatsappReservations = settings?.whatsappReservations ?? true;
    const usersModuleEnabled = settings?.usersModuleEnabled ?? false;
    
    const session = await getUserSession();
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());

    let primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
    let secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');

    if (theme === 'cyber-padel') {
        primaryColor = '#10b981';
        secondaryColor = '#00e5ff';
    } else if (theme === 'sunset-clay') {
        primaryColor = '#ea580c';
        secondaryColor = '#f59e0b';
    } else if (theme === 'ocean-frost') {
        primaryColor = '#0284c7';
        secondaryColor = '#06b6d4';
    }

    if (usersModuleEnabled) {
        const cookieStore = await cookies();
        const hasSession = !!session;
        const hasSkipped = cookieStore.get("onlypadel_skip_registration");

        if (!hasSession && !hasSkipped) {
            return (
                <div data-theme={theme} className={themeClass}>
                    <UserWelcomeSplash />
                </div>
            );
        }
    }

    if (!isReservationsEnabled) {
        const phoneToUse = settings?.apiPhone || settings?.contactPhone || "";
        const phone = phoneToUse.replace(/\D/g, '');
        const waLink = `https://wa.me/${phone}?text=Hola,%20quiero%20reservar%20un%20turno.`;

        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${themeClass || (theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100')}`}>
                <div className={`max-w-md w-full rounded-3xl shadow-xl p-8 text-center border ${theme === 'dark' || themeClass.includes('dark') ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <h1 className="text-2xl font-black mb-2">Reservas Pausadas</h1>
                    <p className={`mb-8 font-medium ${theme === 'dark' || themeClass.includes('dark') ? 'text-slate-400' : 'text-slate-500'}`}>
                        El sistema automático de turnos se encuentra desactivado momentáneamente.
                    </p>

                    {isWhatsappReservations && phone && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                            <button className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                Reservar por WhatsApp
                            </button>
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div 
            data-theme={theme}
            className={`${themeClass} min-h-dvh bg-[var(--background,#f8fafc)] text-[var(--foreground,#0f172a)] flex flex-col md:h-dvh md:items-center md:overflow-hidden md:py-8 transition-colors duration-300`}
            style={{ 
                '--color-primary': primaryColor,
                '--color-primary-foreground': getReadableForeground(primaryColor),
                '--color-secondary': secondaryColor,
                '--color-secondary-foreground': getReadableForeground(secondaryColor),
            } as React.CSSProperties}
        >
            <div className="relative flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-[var(--card,#ffffff)] text-[var(--card-foreground,#0f172a)] md:h-[calc(100dvh-4rem)] md:max-h-[820px] md:min-h-0 md:rounded-[2.5rem] md:border md:border-[var(--border,#e2e8f0)] md:shadow-2xl transition-colors duration-300">
                <PublicNavbar sysSettings={settings} />
                {settings?.tournamentsEnabled && activeTournament && (
                  <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-4 py-2 text-white shadow-sm z-30 shrink-0 border-b border-amber-600/30">
                    <Link href={`/torneos/${activeTournament.id}`} className="flex items-center justify-between gap-2 hover:opacity-95 transition-opacity">
                      <div className="flex items-center gap-2 min-w-0">
                        <Trophy className="w-4 h-4 text-yellow-100 animate-bounce shrink-0" />
                        <span className="text-xs font-black tracking-wide truncate">
                          {activeTournament.status === 'ONGOING' ? '¡Torneo en Juego!' : '¡Torneo Disponible!'} {activeTournament.name}
                        </span>
                      </div>
                      <span className="bg-black/20 hover:bg-black/30 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 flex items-center gap-1 transition-colors">
                        Ver <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                )}
                {appLayout === 'chat' ? (
                  <BookingFlowChat courts={courts} sysSettings={settings} session={session} today={today} />
                ) : (
                  <BookingFlow courts={courts} sysSettings={settings} session={session} today={today} />
                )}
            </div>
        </div>
    );
}
