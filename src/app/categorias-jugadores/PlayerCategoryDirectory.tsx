'use client';

import { useMemo, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';

type Player = { id: string; name: string; note: string | null; isCurrentUser: boolean; level: { id: string; name: string; description: string | null; color: string } };

export default function PlayerCategoryDirectory({ players, levels }: { players: Player[]; levels: Player['level'][] }) {
  const [query, setQuery] = useState('');
  const [levelId, setLevelId] = useState('');
  const filtered = useMemo(() => players.filter((p) => (!levelId || p.level.id === levelId) && (!query.trim() || `${p.name} ${p.level.name}`.toLowerCase().includes(query.trim().toLowerCase()))), [players, query, levelId]);
  return <>
    <div className="sticky top-2 z-10 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 dark:bg-slate-800"><Search className="h-5 w-5 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o categoría..." className="min-h-12 w-full bg-transparent outline-none" />{query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X className="h-4 w-4" /></button>}</label><select value={levelId} onChange={(e) => setLevelId(e.target.value)} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold dark:border-slate-700 dark:bg-slate-800"><option value="">Todas las categorías</option>{levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
      <p className="mt-3 px-1 text-xs font-bold text-slate-400">{filtered.length} {filtered.length === 1 ? 'jugador encontrado' : 'jugadores encontrados'}</p>
    </div>
    {filtered.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{filtered.map((p) => <article key={p.id} className={`flex items-center gap-4 rounded-3xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${p.isCurrentUser ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-slate-200 dark:border-slate-700'}`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${p.level.color}20`, color: p.level.color }}><UserRound className="h-6 w-6" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-black text-slate-900 dark:text-white">{p.name}</h2>{p.isCurrentUser && <small className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 font-black text-[var(--color-primary-foreground)]">Vos</small>}</div>{p.note && <p className="mt-1 truncate text-xs text-slate-400">{p.note}</p>}</div><span className="shrink-0 rounded-full px-3 py-1.5 text-sm font-black text-white shadow-sm" style={{ backgroundColor: p.level.color }}>{p.level.name}</span></article>)}</div> : <div className="mt-5 rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700"><Search className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-black text-slate-700 dark:text-white">No encontramos coincidencias</h2><p className="text-sm text-slate-400">Probá con otro nombre o quitá el filtro de categoría.</p></div>}
  </>;
}
