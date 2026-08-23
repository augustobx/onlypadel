'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Check, Edit3, Eye, EyeOff, Plus, Settings2, Trash2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteRankingCategory, deleteRankingEntry, saveRankingCategory, saveRankingEntry } from '@/actions/rankings';
import { rankingDisplayName, sortRankingEntries } from '@/lib/rankings';

type RegisteredUser = {
  id: string;
  name: string | null;
  lastName: string | null;
  dni: string | null;
  phone: string | null;
  category: string | null;
  isActive: boolean;
};

type RankingEntryData = {
  id: string;
  categoryId: string;
  userId: string | null;
  user: { id: string; name: string | null; lastName: string | null; dni: string | null; phone: string | null } | null;
  externalName: string | null;
  externalPhone: string | null;
  manualPosition: number;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type RankingCategoryData = {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  displayOrder: number;
  sortMode: 'POINTS' | 'MANUAL';
  showPoints: boolean;
  showPlayed: boolean;
  showWon: boolean;
  showLost: boolean;
  createdAt: string;
  updatedAt: string;
  entries: RankingEntryData[];
};

type CategoryFormState = {
  name: string;
  description: string;
  isPublished: boolean;
  displayOrder: number;
  sortMode: 'POINTS' | 'MANUAL';
  showPoints: boolean;
  showPlayed: boolean;
  showWon: boolean;
  showLost: boolean;
};

const emptyCategory: CategoryFormState = {
  name: '', description: '', isPublished: true, displayOrder: 0, sortMode: 'POINTS' as const,
  showPoints: true, showPlayed: true, showWon: true, showLost: true,
};

const emptyEntry = {
  mode: 'registered' as 'registered' | 'external', userId: '', externalName: '', externalPhone: '',
  manualPosition: 0, points: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0, notes: '',
};

export default function RankingsAdmin({ initialCategories, users, rankingsEnabled }: {
  initialCategories: RankingCategoryData[];
  users: RegisteredUser[];
  rankingsEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [selectedId, setSelectedId] = useState(initialCategories[0]?.id || '');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategory);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selected = initialCategories.find((category) => category.id === selectedId) || initialCategories[0];
  const orderedEntries = useMemo(() => selected ? sortRankingEntries(selected.entries, selected.sortMode) : [], [selected]);

  const run = async (task: () => Promise<{ success: boolean; error?: string }>, successText: string, after?: () => void) => {
    setFeedback(null);
    setIsPending(true);
    try {
      const result = await task();
      if (!result.success) {
        setFeedback({ type: 'error', text: result.error || 'No se pudo completar la operación.' });
        return;
      }
      setFeedback({ type: 'success', text: successText });
      after?.();
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ ...emptyCategory, displayOrder: initialCategories.length });
    setCategoryOpen(true);
  };

  const openEditCategory = (category: RankingCategoryData) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      isPublished: category.isPublished,
      displayOrder: category.displayOrder,
      sortMode: category.sortMode,
      showPoints: category.showPoints,
      showPlayed: category.showPlayed,
      showWon: category.showWon,
      showLost: category.showLost,
    });
    setCategoryOpen(true);
  };

  const openNewEntry = () => {
    setEditingEntryId(null);
    setEntryForm(emptyEntry);
    setEntryOpen(true);
  };

  const openEditEntry = (entry: RankingEntryData) => {
    setEditingEntryId(entry.id);
    setEntryForm({
      mode: entry.userId ? 'registered' : 'external',
      userId: entry.userId || '',
      externalName: entry.externalName || '',
      externalPhone: entry.externalPhone || '',
      manualPosition: entry.manualPosition,
      points: entry.points,
      matchesPlayed: entry.matchesPlayed,
      matchesWon: entry.matchesWon,
      matchesLost: entry.matchesLost,
      notes: entry.notes || '',
    });
    setEntryOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-primary)]"><BarChart3 className="h-5 w-5" /> Competencia</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Rankings por categoría</h1>
          <p className="mt-1 text-sm text-slate-500">Gestioná jugadores registrados, participantes externos, estadísticas y visibilidad pública.</p>
        </div>
        <Button onClick={openNewCategory} className="min-h-11 bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"><Plus className="mr-2 h-4 w-4" /> Nueva categoría</Button>
      </div>

      <div className={`flex items-center gap-3 rounded-2xl border p-4 ${rankingsEnabled ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}`}>
        {rankingsEnabled ? <Eye className="h-5 w-5 text-emerald-600" /> : <EyeOff className="h-5 w-5 text-amber-600" />}
        <div><p className="text-sm font-black text-slate-900 dark:text-white">Módulo público {rankingsEnabled ? 'activo' : 'desactivado'}</p><p className="text-xs text-slate-500">Se controla desde Configuración → Módulos.</p></div>
      </div>

      {feedback && <div role="status" className={`rounded-xl border p-3 text-sm font-bold ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{feedback.text}</div>}

      {initialCategories.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><BarChart3 className="h-14 w-14 text-slate-300" /><h2 className="mt-4 text-xl font-black">Todavía no hay categorías</h2><p className="mt-1 max-w-md text-sm text-slate-500">Creá la primera categoría y después agregá jugadores registrados o personas externas.</p><Button onClick={openNewCategory} className="mt-5"><Plus className="mr-2 h-4 w-4" /> Crear categoría</Button></CardContent></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit lg:sticky lg:top-0">
            <CardHeader><CardTitle className="text-base">Categorías</CardTitle><CardDescription>{initialCategories.length} configuradas</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {initialCategories.map((category) => (
                <button key={category.id} onClick={() => setSelectedId(category.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${selected?.id === category.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                  <span className="min-w-0"><strong className="block truncate text-sm text-slate-900 dark:text-white">{category.name}</strong><small className="text-slate-500">{category.entries.length} personas</small></span>
                  {category.isPublished ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                </button>
              ))}
            </CardContent>
          </Card>

          {selected && <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><CardTitle>{selected.name}</CardTitle><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${selected.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selected.isPublished ? 'Publicado' : 'Oculto'}</span><span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">Orden {selected.sortMode === 'POINTS' ? 'automático' : 'manual'}</span></div><CardDescription className="mt-2">{selected.description || 'Sin descripción pública.'}</CardDescription></div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEditCategory(selected)}><Settings2 className="mr-1.5 h-4 w-4" /> Configurar</Button><Button variant="outline" size="sm" onClick={() => { if (window.confirm(`¿Eliminar ${selected.name} y todas sus posiciones?`)) run(() => deleteRankingCategory(selected.id), 'Categoría eliminada.', () => setSelectedId('')); }} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-[var(--color-primary)]" /> Tabla de posiciones</CardTitle><CardDescription>Las posiciones públicas se calculan según la configuración de esta categoría.</CardDescription></div><Button onClick={openNewEntry} disabled={isPending}><UserPlus className="mr-2 h-4 w-4" /> Agregar persona</Button></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th className="p-3 text-center">Pos.</th><th className="p-3">Jugador</th><th className="p-3 text-center">Pts</th><th className="p-3 text-center">PJ</th><th className="p-3 text-center">PG</th><th className="p-3 text-center">PP</th><th className="p-3 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {orderedEntries.map((entry, index) => <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="p-3 text-center"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-black ${index < 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>{index + 1}</span></td><td className="p-3"><strong className="block text-slate-900 dark:text-white">{rankingDisplayName(entry)}</strong><span className="text-xs text-slate-500">{entry.user ? `Registrado${entry.user.dni ? ` · DNI ${entry.user.dni}` : ''}` : `Externo${entry.externalPhone ? ` · ${entry.externalPhone}` : ''}`}</span></td><td className="p-3 text-center font-black">{entry.points}</td><td className="p-3 text-center">{entry.matchesPlayed}</td><td className="p-3 text-center text-emerald-600">{entry.matchesWon}</td><td className="p-3 text-center text-red-500">{entry.matchesLost}</td><td className="p-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => openEditEntry(entry)} aria-label={`Editar ${rankingDisplayName(entry)}`}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" className="text-red-600" onClick={() => { if (window.confirm(`¿Quitar a ${rankingDisplayName(entry)} del ranking?`)) run(() => deleteRankingEntry(entry.id), 'Persona eliminada del ranking.'); }} aria-label={`Eliminar ${rankingDisplayName(entry)}`}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}
                      {orderedEntries.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-500">No hay personas cargadas en esta categoría.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>}
        </div>
      )}

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editingCategoryId ? 'Configurar categoría' : 'Nueva categoría'}</DialogTitle><DialogDescription>Definí la visibilidad, el orden y las estadísticas que verá el público.</DialogDescription></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); run(() => saveRankingCategory({ id: editingCategoryId || undefined, ...categoryForm }), editingCategoryId ? 'Categoría actualizada.' : 'Categoría creada.', () => setCategoryOpen(false)); }} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="ranking-category-name">Nombre</Label><Input id="ranking-category-name" required minLength={2} value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Ej: 6ta Masculina" /></div>
            <div className="space-y-1.5"><Label htmlFor="ranking-category-description">Descripción pública</Label><textarea id="ranking-category-description" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700" placeholder="Temporada, reglas o aclaraciones…" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="ranking-sort-mode">Orden de posiciones</Label><select id="ranking-sort-mode" value={categoryForm.sortMode} onChange={(event) => setCategoryForm({ ...categoryForm, sortMode: event.target.value as 'POINTS' | 'MANUAL' })} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="POINTS">Automático por puntos</option><option value="MANUAL">Posición manual</option></select></div><div className="space-y-1.5"><Label htmlFor="ranking-display-order">Orden de categoría</Label><Input id="ranking-display-order" type="number" min={0} value={categoryForm.displayOrder} onChange={(event) => setCategoryForm({ ...categoryForm, displayOrder: Number(event.target.value) })} /></div></div>
            <label className="flex items-center justify-between rounded-xl border p-3"><span><strong className="block text-sm">Publicar categoría</strong><small className="text-slate-500">Visible para visitantes y usuarios.</small></span><input type="checkbox" checked={categoryForm.isPublished} onChange={(event) => setCategoryForm({ ...categoryForm, isPublished: event.target.checked })} className="h-5 w-5" /></label>
            <fieldset className="rounded-xl border p-3"><legend className="px-1 text-xs font-black uppercase text-slate-500">Columnas públicas</legend><div className="grid grid-cols-2 gap-3 pt-2">{([['showPoints','Puntos'],['showPlayed','Jugados'],['showWon','Ganados'],['showLost','Perdidos']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={categoryForm[key]} onChange={(event) => setCategoryForm({ ...categoryForm, [key]: event.target.checked })} /> {label}</label>)}</div></fieldset>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setCategoryOpen(false)}>Cancelar</Button><Button type="submit" disabled={isPending}>{isPending ? 'Guardando…' : 'Guardar categoría'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingEntryId ? 'Editar posición' : 'Agregar al ranking'}</DialogTitle><DialogDescription>Podés elegir una cuenta registrada o cargar una persona que todavía no usa la app.</DialogDescription></DialogHeader>
          {selected && <form onSubmit={(event) => { event.preventDefault(); run(() => saveRankingEntry({ id: editingEntryId || undefined, categoryId: selected.id, userId: entryForm.mode === 'registered' ? entryForm.userId : null, externalName: entryForm.mode === 'external' ? entryForm.externalName : null, externalPhone: entryForm.mode === 'external' ? entryForm.externalPhone : null, manualPosition: entryForm.manualPosition, points: entryForm.points, matchesPlayed: entryForm.matchesPlayed, matchesWon: entryForm.matchesWon, matchesLost: entryForm.matchesLost, notes: entryForm.notes }), editingEntryId ? 'Posición actualizada.' : 'Persona agregada al ranking.', () => setEntryOpen(false)); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"><button type="button" disabled={Boolean(editingEntryId)} onClick={() => setEntryForm({ ...entryForm, mode: 'registered' })} className={`rounded-lg px-3 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70 ${entryForm.mode === 'registered' ? 'bg-white shadow dark:bg-slate-900' : 'text-slate-500'}`}>Usuario registrado</button><button type="button" disabled={Boolean(editingEntryId)} onClick={() => setEntryForm({ ...entryForm, mode: 'external' })} className={`rounded-lg px-3 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70 ${entryForm.mode === 'external' ? 'bg-white shadow dark:bg-slate-900' : 'text-slate-500'}`}>Persona externa</button></div>
            {entryForm.mode === 'registered' ? <div className="space-y-1.5"><Label htmlFor="ranking-user">Jugador registrado</Label><select id="ranking-user" required value={entryForm.userId} onChange={(event) => setEntryForm({ ...entryForm, userId: event.target.value })} disabled={Boolean(editingEntryId)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Seleccionar jugador…</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} {user.lastName} · DNI {user.dni || 'sin DNI'}{!user.isActive ? ' (suspendido)' : ''}</option>)}</select></div> : <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="ranking-external-name">Nombre completo</Label><Input id="ranking-external-name" required minLength={2} value={entryForm.externalName} onChange={(event) => setEntryForm({ ...entryForm, externalName: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor="ranking-external-phone">Teléfono opcional</Label><Input id="ranking-external-phone" type="tel" value={entryForm.externalPhone} onChange={(event) => setEntryForm({ ...entryForm, externalPhone: event.target.value })} /></div></div>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><div className="space-y-1"><Label htmlFor="rank-position">Posición manual</Label><Input id="rank-position" type="number" min={0} value={entryForm.manualPosition} onChange={(event) => setEntryForm({ ...entryForm, manualPosition: Number(event.target.value) })} /></div><div className="space-y-1"><Label htmlFor="rank-points">Puntos</Label><Input id="rank-points" type="number" value={entryForm.points} onChange={(event) => setEntryForm({ ...entryForm, points: Number(event.target.value) })} /></div><div className="space-y-1"><Label htmlFor="rank-played">Jugados</Label><Input id="rank-played" type="number" min={0} value={entryForm.matchesPlayed} onChange={(event) => setEntryForm({ ...entryForm, matchesPlayed: Number(event.target.value) })} /></div><div className="space-y-1"><Label htmlFor="rank-won">Ganados</Label><Input id="rank-won" type="number" min={0} value={entryForm.matchesWon} onChange={(event) => setEntryForm({ ...entryForm, matchesWon: Number(event.target.value) })} /></div><div className="space-y-1"><Label htmlFor="rank-lost">Perdidos</Label><Input id="rank-lost" type="number" min={0} value={entryForm.matchesLost} onChange={(event) => setEntryForm({ ...entryForm, matchesLost: Number(event.target.value) })} /></div></div>
            <div className="space-y-1.5"><Label htmlFor="ranking-notes">Notas internas</Label><textarea id="ranking-notes" rows={2} value={entryForm.notes} onChange={(event) => setEntryForm({ ...entryForm, notes: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700" /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button><Button type="submit" disabled={isPending || (entryForm.mode === 'registered' ? !entryForm.userId : entryForm.externalName.trim().length < 2)}>{isPending ? 'Guardando…' : <><Check className="mr-2 h-4 w-4" /> Guardar posición</>}</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
