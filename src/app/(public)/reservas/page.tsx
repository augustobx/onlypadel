export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import BookingFlow from '@/components/BookingFlow';
import BookingFlowChat from '@/components/BookingFlowChat';
import PublicNavbar from '@/components/PublicNavbar';
import { getUserSession } from '@/actions/user-auth';
import { getPublicTournaments } from '@/actions/public-tournaments';
import { getReadableForeground, normalizeHexColor } from '@/lib/color';
import Link from 'next/link';
import { Trophy, ChevronRight } from 'lucide-react';

export default async function ReservasPage() {
  const [courts, settings, session, pubReq] = await Promise.all([
    prisma.court.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.systemSetting.findFirst({ where: { id: 1 } }),
    getUserSession(),
    getPublicTournaments(),
  ]);
  const activeTournament = pubReq.data?.find(t => t.status !== 'COMPLETED');
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  const theme = settings?.theme || 'light';
  const appLayout = settings?.appLayout || 'classic';
  const primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
  const secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');

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

        {/* BANNER DE TORNEO ACTIVO (Posición superior integrada) */}
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
