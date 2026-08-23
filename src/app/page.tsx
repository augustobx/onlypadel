import { getPublicCourts } from "@/actions/public-bookings";
import { getSettings } from "@/actions/settings";
import { getPublicTournaments } from "@/actions/public-tournaments";
import BookingFlow from "@/components/BookingFlow";
import BookingFlowChat from "@/components/BookingFlowChat";
import PublicNavbar from "@/components/PublicNavbar";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { cookies } from "next/headers";
import UserWelcomeSplash from "@/components/UserWelcomeSplash";
import { getUserSession } from "@/actions/user-auth";
import { getReadableForeground, normalizeHexColor } from "@/lib/color";

export default async function HomePage() {
    const pubReq = await getPublicTournaments();
    // Mostrar burbuja para cualquier torneo publicado que no esté terminado
    const activeTournament = pubReq.data?.find(t => t.status !== 'COMPLETED');

    const courtsRes = await getPublicCourts();
    const courts = courtsRes?.success && courtsRes?.data ? courtsRes.data : [];

    const settings = await getSettings();
    const theme = settings?.theme || 'light';
    const appLayout = settings?.appLayout || 'classic';

    const isReservationsEnabled = settings?.reservationsEnabled ?? true;
    const isWhatsappReservations = settings?.whatsappReservations ?? true;
    const usersModuleEnabled = settings?.usersModuleEnabled ?? false;
    
    const session = await getUserSession();
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
    const secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');

    if (usersModuleEnabled) {
        const cookieStore = await cookies();
        const hasSession = !!session;
        const hasSkipped = cookieStore.get("tpadel_skip_registration");

        if (!hasSession && !hasSkipped) {
            return <UserWelcomeSplash />;
        }
    }

    if (!isReservationsEnabled) {
        // NUEVA LÓGICA: Prioriza apiPhone, si está vacío usa contactPhone
        const phoneToUse = settings?.apiPhone || settings?.contactPhone || "";
        const phone = phoneToUse.replace(/\D/g, '');
        const waLink = `https://wa.me/${phone}?text=Hola,%20quiero%20reservar%20un%20turno.`;

        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
                <div className={`max-w-md w-full rounded-3xl shadow-xl p-8 text-center border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <h1 className="text-2xl font-black mb-2">Reservas Pausadas</h1>
                    <p className={`mb-8 font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
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
            className={`${theme} min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col md:h-dvh md:items-center md:overflow-hidden md:py-8`}
            style={{ 
                '--color-primary': primaryColor,
                '--color-primary-foreground': getReadableForeground(primaryColor),
                '--color-secondary': secondaryColor,
                '--color-secondary-foreground': getReadableForeground(secondaryColor),
            } as React.CSSProperties}
        >
            <div className="relative flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-white dark:bg-slate-900 md:h-[calc(100dvh-4rem)] md:max-h-[820px] md:min-h-0 md:rounded-[2.5rem] md:border md:border-slate-200 md:shadow-2xl dark:border-slate-800">
                <PublicNavbar sysSettings={settings} />
                {appLayout === 'chat' ? (
                  <BookingFlowChat courts={courts} sysSettings={settings} session={session} today={today} />
                ) : (
                  <BookingFlow courts={courts} sysSettings={settings} session={session} today={today} />
                )}
                
                {/* BURBUJA DE TORNEO ACTIVO */}
                {settings?.tournamentsEnabled && activeTournament && (
                  <div className="absolute bottom-[110px] left-0 right-0 flex justify-center z-50 pointer-events-none">
                    <Link href={`/torneos/${activeTournament.id}`} className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-105 transition-all flex items-center gap-3 ring-4 ring-yellow-500/30 pointer-events-auto">
                      <Trophy className="w-5 h-5 animate-bounce text-yellow-100" />
                      <span className="font-bold text-sm tracking-wide">{activeTournament.status === 'ONGOING' ? '¡Torneo en Juego!' : 'Torneo Disponible'}</span>
                    </Link>
                  </div>
                )}
            </div>
        </div>
    );
}
