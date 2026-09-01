import Link from 'next/link';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/actions/user-auth';
import PublicNavbar from '@/components/PublicNavbar';
import { getReadableForeground, normalizeHexColor } from '@/lib/color';
import PlayerCategoryDirectory from './PlayerCategoryDirectory';

export default async function PlayerCategoriesPage() {
  const [settings, session, levels, registeredPlayers] = await Promise.all([
    prisma.systemSetting.findFirst({ where: { id: 1 } }),
    getUserSession(),
    prisma.playerCategoryLevel.findMany({
      where: { isPublished: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        assignments: {
          where: { isPublished: true },
          include: {
            user: { select: { id: true, name: true, lastName: true, dni: true, category: true } }
          }
        }
      }
    }),
    prisma.user.findMany({
      where: { role: 'PLAYER', isActive: true, category: { not: null } },
      select: { id: true, name: true, lastName: true, dni: true, category: true }
    })
  ]);

  const primary = normalizeHexColor(settings?.primaryColor, '#10b981');
  const secondary = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');
  const publicLevels = levels.map(({ id, name, description, color }) => ({ id, name, description, color }));

  // Armar lista de jugadores combinando asignaciones directas y usuarios registrados con categoría
  const playerList: {
    id: string;
    name: string;
    note: string | null;
    isCurrentUser: boolean;
    level: { id: string; name: string; description: string | null; color: string };
  }[] = [];

  const seenUserIds = new Set<string>();

  // 1. Jugadores asignados formalmente a niveles
  for (const level of levels) {
    for (const a of level.assignments) {
      if (a.userId) seenUserIds.add(a.userId);
      const displayName = a.user 
        ? `${a.user.name || ''} ${a.user.lastName || ''}`.trim() 
        : a.externalName || 'Jugador';

      playerList.push({
        id: a.id,
        name: displayName,
        note: a.publicNote,
        isCurrentUser: Boolean(session?.id && a.userId === session.id),
        level: {
          id: level.id,
          name: level.name,
          description: level.description,
          color: level.color,
        }
      });
    }
  }

  // 2. Jugadores registrados con user.category que no tenían fila explícita en assignments
  const levelByName = new Map(levels.map(l => [l.name.toLowerCase().trim(), l]));
  for (const u of registeredPlayers) {
    if (u.id && seenUserIds.has(u.id)) continue;
    if (!u.category) continue;

    const matchedLevel = levelByName.get(u.category.toLowerCase().trim());
    if (matchedLevel) {
      seenUserIds.add(u.id);
      playerList.push({
        id: `user-${u.id}`,
        name: `${u.name || ''} ${u.lastName || ''}`.trim(),
        note: null,
        isCurrentUser: Boolean(session?.id && u.id === session.id),
        level: {
          id: matchedLevel.id,
          name: matchedLevel.name,
          description: matchedLevel.description,
          color: matchedLevel.color,
        }
      });
    }
  }

  // Ordenar alfabéticamente por nombre
  playerList.sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <div 
      className={`${settings?.theme === 'dark' ? 'dark' : ''} min-h-dvh bg-slate-100 dark:bg-slate-950 flex flex-col`} 
      style={{ 
        '--color-primary': primary, 
        '--color-primary-foreground': getReadableForeground(primary), 
        '--color-secondary': secondary, 
        '--color-secondary-foreground': getReadableForeground(secondary) 
      } as React.CSSProperties}
    >
      <div className="mx-auto min-h-dvh w-full max-w-5xl bg-slate-50 shadow-xl dark:bg-slate-950 flex flex-col flex-1">
        <PublicNavbar sysSettings={settings} />
        
        <header className="relative overflow-hidden bg-slate-950 px-5 py-8 text-white sm:px-10 border-b border-slate-800">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--color-secondary)]/20 blur-3xl" />
          <div className="relative">
            <Link href="/" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <div className="flex items-start gap-4">
              <span className="rounded-2xl bg-[var(--color-secondary)] p-3 text-[var(--color-secondary-foreground)] shrink-0 shadow-lg">
                <BadgeCheck className="h-8 w-8" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-secondary)]">Padrón Oficial de Categorías</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">¿En qué categoría juega cada jugador?</h1>
                <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-400 font-medium">
                  Consultá la categoría deportiva oficial de todos los jugadores de la comunidad del club.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 flex-1">
          {levels.length ? (
            <PlayerCategoryDirectory players={playerList} levels={publicLevels} />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
              <BadgeCheck className="mx-auto h-12 w-12 text-slate-400" />
              <h2 className="mt-4 text-lg font-black text-slate-800 dark:text-white">Todavía no hay categorías publicadas</h2>
              <p className="text-xs text-slate-500 mt-1">El club publicará las categorías próximamente.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
