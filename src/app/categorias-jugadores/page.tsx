import Link from 'next/link';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/actions/user-auth';
import PublicNavbar from '@/components/PublicNavbar';
import { getReadableForeground, normalizeHexColor } from '@/lib/color';
import PlayerCategoryDirectory from './PlayerCategoryDirectory';

export default async function PlayerCategoriesPage() {
  const [settings, session, levels] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { id: 1 } }),
    getUserSession(),
    prisma.playerCategoryLevel.findMany({ where: { isPublished: true }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }], include: { assignments: { where: { isPublished: true }, include: { user: { select: { id: true, name: true, lastName: true } } } } } }),
  ]);
  const primary = normalizeHexColor(settings?.primaryColor, '#10b981');
  const secondary = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');
  const publicLevels = levels.map(({ id, name, description, color }) => ({ id, name, description, color }));
  const players = levels.flatMap((level) => level.assignments.map((a) => ({ id: a.id, name: a.user ? `${a.user.name || ''} ${a.user.lastName || ''}`.trim() : a.externalName || 'Jugador', note: a.publicNote, isCurrentUser: Boolean(session?.id && a.userId === session.id), level: { id: level.id, name: level.name, description: level.description, color: level.color } }))).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return <div className={`${settings?.theme === 'dark' ? 'dark' : ''} min-h-dvh bg-slate-100 dark:bg-slate-950`} style={{ '--color-primary': primary, '--color-primary-foreground': getReadableForeground(primary), '--color-secondary': secondary, '--color-secondary-foreground': getReadableForeground(secondary) } as React.CSSProperties}>
    <div className="mx-auto min-h-dvh max-w-5xl bg-slate-50 shadow-xl dark:bg-slate-950"><PublicNavbar sysSettings={settings} /><header className="relative overflow-hidden bg-slate-950 px-5 py-10 text-white sm:px-10"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--color-secondary)]/20 blur-3xl" /><div className="relative"><Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Volver al inicio</Link><div className="flex items-start gap-4"><span className="rounded-2xl bg-[var(--color-secondary)] p-3 text-[var(--color-secondary-foreground)]"><BadgeCheck className="h-8 w-8" /></span><div><p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--color-secondary)]">Categorías oficiales</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">¿En qué categoría juega?</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Buscá a cualquier jugador del club y consultá su categoría deportiva actual.</p></div></div></div></header><main className="p-4 sm:p-8">{levels.length ? <PlayerCategoryDirectory players={players} levels={publicLevels} /> : <div className="rounded-3xl border border-dashed p-12 text-center"><BadgeCheck className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-black">Todavía no hay categorías publicadas</h2></div>}</main></div>
  </div>;
}
