'use client';

import { useState } from 'react';
import { BadgeCheck, Edit3, Plus, Search, Trash2, UserPlus, Users, RefreshCw } from 'lucide-react';
import { deletePlayerCategoryAssignment, deletePlayerCategoryLevel, savePlayerCategoryAssignment, savePlayerCategoryLevel, syncAllRegisteredUsersCategories } from '@/actions/player-categories';

type UserOption = { id: string; name: string | null; lastName: string | null; dni: string | null; phone: string | null; category: string | null };
type Assignment = { id: string; levelId: string; userId: string | null; externalName: string | null; externalPhone: string | null; publicNote: string | null; isPublished: boolean; user: Omit<UserOption, 'category'> | null };
type Level = { id: string; name: string; description: string | null; color: string; displayOrder: number; isPublished: boolean; assignments: Assignment[] };
const blankLevel = { id: '', name: '', description: '', color: '#10b981', displayOrder: 0, isPublished: true };
const blankPlayer = { id: '', levelId: '', mode: 'user', userId: '', externalName: '', externalPhone: '', publicNote: '', isPublished: true };

export default function PlayerCategoriesAdmin({ initialLevels, users }: { initialLevels: Level[]; users: UserOption[] }) {
  const [level, setLevel] = useState(blankLevel);
  const [player, setPlayer] = useState(blankPlayer);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const act = async (fn: () => Promise<{ success: boolean; error?: string }>, reset?: () => void) => { 
    setBusy(true); 
    setMessage(''); 
    const result = await fn(); 
    setBusy(false); 
    setMessage(result.success ? 'Cambios guardados correctamente.' : result.error || 'No se pudo completar la acción.'); 
    if (result.success) { 
      reset?.(); 
      window.location.reload(); 
    } 
  };

  const handleSyncAll = () => {
    act(() => syncAllRegisteredUsersCategories());
  };

  const rows = initialLevels.flatMap((l) => l.assignments.map((a) => ({ ...a, level: l }))).filter((a) => `${a.user?.name || ''} ${a.user?.lastName || ''} ${a.externalName || ''} ${a.level.name}`.toLowerCase().includes(query.toLowerCase()));
  const editPlayer = (a: Assignment) => setPlayer({ id: a.id, levelId: a.levelId, mode: a.userId ? 'user' : 'external', userId: a.userId || '', externalName: a.externalName || '', externalPhone: a.externalPhone || '', publicNote: a.publicNote || '', isPublished: a.isPublished });

  return (
    <div className="space-y-7 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[var(--color-primary)]">Padrón deportivo oficial</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Categorías de Jugadores</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Gestioná y retroalimentá la categoría de cada jugador registrado para su perfil público y padrón.
          </p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm self-start sm:self-auto"
          title="Sincroniza los usuarios con categoría cargada para que aparezcan en el padrón"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          Sincronizar Usuarios
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm flex items-center justify-between">
          <span>{message}</span>
        </div>
      )}

      {/* SECCIÓN CATEGORÍAS / NIVELES */}
      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <form className="h-fit space-y-4 rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm" onSubmit={(e) => { e.preventDefault(); act(() => savePlayerCategoryLevel({ ...level, id: level.id || undefined, displayOrder: Number(level.displayOrder) }), () => setLevel(blankLevel)); }}>
          <div className="flex items-center gap-2">
            <BadgeCheck className="text-[var(--color-primary)] w-5 h-5" />
            <h2 className="font-black text-slate-900 dark:text-white">{level.id ? 'Editar categoría' : 'Nueva categoría'}</h2>
          </div>
          <input required placeholder="Ej: 6ta, 5ta, 4ta, 3ra" value={level.name} onChange={(e) => setLevel({ ...level, name: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold" />
          <textarea placeholder="Descripción opcional (se muestra en el perfil y padrón)" value={level.description || ''} onChange={(e) => setLevel({ ...level, description: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Color Distintivo
              <input type="color" value={level.color} onChange={(e) => setLevel({ ...level, color: e.target.value })} className="mt-1 h-10 w-full rounded-xl border cursor-pointer" />
            </label>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Orden
              <input type="number" min="0" value={level.displayOrder} onChange={(e) => setLevel({ ...level, displayOrder: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-bold" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={level.isPublished} onChange={(e) => setLevel({ ...level, isPublished: e.target.checked })} className="rounded" /> 
            Visible públicamente en padrón
          </label>
          <div className="flex gap-2">
            <button disabled={busy} className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-black text-[var(--color-primary-foreground)] hover:opacity-95 transition-opacity text-sm flex items-center justify-center">
              <Plus className="mr-1 inline h-4 w-4" /> Guardar Nivel
            </button>
            {level.id && (
              <button type="button" onClick={() => setLevel(blankLevel)} className="rounded-xl border px-4 text-xs font-bold hover:bg-slate-50">
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialLevels.map((l) => (
            <article key={l.id} className="rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="mb-4 h-2 rounded-full shadow-sm" style={{ backgroundColor: l.color }} />
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{l.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{l.assignments.length} jugadores · {l.isPublished ? 'Pública' : 'Oculta'}</p>
                  </div>
                  <span className="font-black text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">#{l.displayOrder}</span>
                </div>
                <p className="my-3 text-xs text-slate-500 dark:text-slate-400 min-h-8 leading-relaxed">
                  {l.description || 'Sin descripción cargada.'}
                </p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setLevel({ id: l.id, name: l.name, description: l.description || '', color: l.color, displayOrder: l.displayOrder, isPublished: l.isPublished })} className="rounded-lg border p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" aria-label="Editar">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => confirm(`¿Eliminar ${l.name}?`) && act(() => deletePlayerCategoryLevel(l.id))} className="rounded-lg border p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECCIÓN ASIGNACIÓN DE JUGADORES */}
      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form className="h-fit space-y-4 rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm" onSubmit={(e) => { e.preventDefault(); act(() => savePlayerCategoryAssignment({ id: player.id || undefined, levelId: player.levelId, userId: player.mode === 'user' ? player.userId : null, externalName: player.mode === 'external' ? player.externalName : null, externalPhone: player.mode === 'external' ? player.externalPhone : null, publicNote: player.publicNote, isPublished: player.isPublished }), () => setPlayer(blankPlayer)); }}>
          <div className="flex items-center gap-2">
            <UserPlus className="text-[var(--color-primary)] w-5 h-5" />
            <h2 className="font-black text-slate-900 dark:text-white">{player.id ? 'Editar jugador en padrón' : 'Asignar jugador al padrón'}</h2>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Categoría a asignar</label>
            <select required value={player.levelId} onChange={(e) => setPlayer({ ...player, levelId: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold">
              <option value="">Seleccionar categoría oficial...</option>
              {initialLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button type="button" disabled={Boolean(player.id)} onClick={() => setPlayer({ ...player, mode: 'user' })} className={`rounded-lg py-2 text-xs font-bold transition-all ${player.mode === 'user' ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Usuario Registrado</button>
            <button type="button" disabled={Boolean(player.id)} onClick={() => setPlayer({ ...player, mode: 'external' })} className={`rounded-lg py-2 text-xs font-bold transition-all ${player.mode === 'external' ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>No Registrado (Externo)</button>
          </div>

          {player.mode === 'user' ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Jugador Registrado</label>
              <select required value={player.userId} onChange={(e) => setPlayer({ ...player, userId: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-medium">
                <option value="">Seleccionar usuario del club...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.name || ''} ${u.lastName || ''}`.trim()} {u.dni ? `· DNI ${u.dni}` : ''} {u.category ? `[${u.category}]` : '[Sin Cat]'}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid gap-2.5">
              <input required placeholder="Nombre y Apellido" value={player.externalName} onChange={(e) => setPlayer({ ...player, externalName: e.target.value })} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs" />
              <input placeholder="Teléfono de contacto (opcional)" value={player.externalPhone} onChange={(e) => setPlayer({ ...player, externalPhone: e.target.value })} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Nota pública (opcional)</label>
            <textarea placeholder="Ej: Categoría provisoria, evaluado por profesor..." value={player.publicNote} onChange={(e) => setPlayer({ ...player, publicNote: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs" rows={2} />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={player.isPublished} onChange={(e) => setPlayer({ ...player, isPublished: e.target.checked })} className="rounded" /> 
            Mostrar en la consulta pública de categorías
          </label>
          
          <div className="flex gap-2">
            <button disabled={busy || !initialLevels.length} className="flex-1 rounded-xl bg-slate-900 hover:bg-black text-white px-4 py-3 font-black text-sm transition-all shadow-sm">
              Guardar en Padrón
            </button>
            {player.id && (
              <button type="button" onClick={() => setPlayer(blankPlayer)} className="rounded-xl border px-4 text-xs font-bold hover:bg-slate-50">
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="overflow-hidden rounded-3xl border bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 p-4">
            <Search className="h-5 w-5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jugador o categoría..." className="w-full outline-none bg-transparent text-sm font-medium" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-4">Jugador</th>
                  <th className="p-4">Categoría Oficial</th>
                  <th className="p-4">Visibilidad</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <strong className="text-slate-900 dark:text-white font-bold">{a.user ? `${a.user.name || ''} ${a.user.lastName || ''}`.trim() : a.externalName}</strong>
                      <small className="block text-slate-400 text-xs">
                        {a.user ? `Usuario registrado ${a.user.dni ? `· DNI ${a.user.dni}` : ''}` : `Externo${a.externalPhone ? ` · ${a.externalPhone}` : ''}`}
                        {a.publicNote && <span className="block text-amber-600 dark:text-amber-400 mt-0.5">Note: {a.publicNote}</span>}
                      </small>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full px-3 py-1 font-black text-xs text-white shadow-sm" style={{ backgroundColor: a.level.color }}>
                        {a.level.name}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      {a.isPublished ? <span className="text-emerald-600 dark:text-emerald-400">Público</span> : <span className="text-slate-400">Oculto</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => editPlayer(a)} className="mr-2 rounded-lg border p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Editar">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => confirm('¿Quitar a este jugador del padrón?') && act(() => deletePlayerCategoryAssignment(a.id))} className="rounded-lg border p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-400">
                      <Users className="mx-auto mb-2 w-8 h-8 opacity-40" />
                      No hay jugadores para mostrar con ese filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
