import Link from 'next/link';
import { ArrowLeft, BarChart3, Crown, Medal, Trophy, UserRound } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/actions/user-auth';
import PublicNavbar from '@/components/PublicNavbar';
import { getReadableForeground, normalizeHexColor } from '@/lib/color';
import { rankingDisplayName, sortRankingEntries } from '@/lib/rankings';

export default async function PublicRankingPage() {
  const [settings, session] = await Promise.all([
    prisma.systemSetting.findFirst({ where: { id: 1 } }),
    getUserSession(),
  ]);
  const primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
  const secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');
  const categories = settings?.rankingsEnabled === false ? [] : await prisma.rankingCategory.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: {
      entries: {
        include: { user: { select: { id: true, name: true, lastName: true } } },
      },
    },
  });

  return (
    <div
      className={`${settings?.theme === 'dark' ? 'dark' : ''} min-h-dvh bg-slate-100 dark:bg-slate-950`}
      style={{
        '--color-primary': primaryColor,
        '--color-primary-foreground': getReadableForeground(primaryColor),
        '--color-secondary': secondaryColor,
        '--color-secondary-foreground': getReadableForeground(secondaryColor),
      } as React.CSSProperties}
    >
      <div className="mx-auto min-h-dvh max-w-5xl bg-white shadow-xl dark:bg-slate-900">
        <PublicNavbar sysSettings={settings} />
        <header className="relative overflow-hidden bg-slate-950 px-5 py-10 text-white sm:px-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--color-primary)]/20 blur-3xl" />
          <div className="relative">
            <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Volver al inicio</Link>
            <div className="flex items-start gap-4"><div className="rounded-2xl bg-[var(--color-primary)] p-3 text-[var(--color-primary-foreground)]"><BarChart3 className="h-8 w-8" /></div><div><p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--color-primary)]">Ranking oficial</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Posiciones por categoría</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Consultá puntos, partidos y rendimiento actualizado de cada categoría del club.</p></div></div>
          </div>
        </header>

        <main className="space-y-7 p-4 sm:p-8">
          {settings?.rankingsEnabled === false ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700"><BarChart3 className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-black text-slate-800 dark:text-white">El ranking está temporalmente oculto</h2><p className="mt-1 text-sm text-slate-500">Volvé a consultar más adelante.</p></div>
          ) : categories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700"><Trophy className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-black text-slate-800 dark:text-white">Todavía no hay rankings publicados</h2><p className="mt-1 text-sm text-slate-500">Las nuevas posiciones aparecerán acá cuando estén listas.</p></div>
          ) : categories.map((category) => {
            const entries = sortRankingEntries(category.entries, category.sortMode);
            return (
              <section key={category.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-slate-900 dark:text-white">{category.name}</h2>{category.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{category.description}</p>}</div><span className="w-fit rounded-full bg-[var(--color-primary)]/15 px-3 py-1 text-xs font-black text-slate-700 dark:text-slate-200">{entries.length} jugadores</span></div>
                {entries.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No hay posiciones cargadas en esta categoría.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="border-b border-slate-100 text-[11px] uppercase tracking-widest text-slate-400 dark:border-slate-800"><tr><th className="w-20 px-4 py-3 text-center">Pos.</th><th className="px-4 py-3 text-left">Jugador</th>{category.showPoints && <th className="px-4 py-3 text-center">Pts</th>}{category.showPlayed && <th className="px-4 py-3 text-center">PJ</th>}{category.showWon && <th className="px-4 py-3 text-center">PG</th>}{category.showLost && <th className="px-4 py-3 text-center">PP</th>}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{entries.map((entry, index) => {
                  const isCurrentUser = Boolean(session?.id && entry.userId === session.id);
                  return <tr key={entry.id} className={isCurrentUser ? 'bg-[var(--color-primary)]/10' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'}><td className="px-4 py-4 text-center"><span className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full font-black ${index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-orange-200 text-orange-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{index === 0 && <Crown className="absolute -top-2 h-4 w-4 text-amber-500" />}{index < 3 ? <Medal className="h-4 w-4" /> : index + 1}</span></td><td className="px-4 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"><UserRound className="h-4 w-4" /></span><span><strong className="block text-slate-900 dark:text-white">{rankingDisplayName(entry)}</strong><small className="text-slate-400">{entry.user ? 'Jugador registrado' : 'Participante del club'}{isCurrentUser ? ' · Vos' : ''}</small></span></div></td>{category.showPoints && <td className="px-4 py-4 text-center text-base font-black text-[var(--color-primary)]">{entry.points}</td>}{category.showPlayed && <td className="px-4 py-4 text-center font-semibold text-slate-600 dark:text-slate-300">{entry.matchesPlayed}</td>}{category.showWon && <td className="px-4 py-4 text-center font-bold text-emerald-600">{entry.matchesWon}</td>}{category.showLost && <td className="px-4 py-4 text-center font-bold text-red-500">{entry.matchesLost}</td>}</tr>;
                })}</tbody></table></div>}
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}
