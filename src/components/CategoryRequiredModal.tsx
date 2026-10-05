'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, CheckCircle2, ShieldAlert, Loader2, Sparkles } from 'lucide-react';
import { updateUserCategory, getUserSession } from '@/actions/user-auth';
import { CATEGORY_LABELS, VALID_CATEGORIES } from '@/lib/tournaments/category-rules';

export default function CategoryRequiredModal({ initialSession }: { initialSession?: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('8va');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si viene session inicial, revisamos directamente
    if (initialSession) {
      if (initialSession.id && !initialSession.category) {
        setIsOpen(true);
      }
      return;
    }

    // Si no vino, verificamos con getUserSession()
    void (async () => {
      try {
        const sess = await getUserSession();
        if (sess && !sess.category) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Category check error:', err);
      }
    })();
  }, [initialSession]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selectedCategory) {
      setError('Por favor selecciona una categoría.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await updateUserCategory(selectedCategory);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } else {
      setError(res.error || 'No se pudo guardar la categoría.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header con icono y aviso */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Requerimiento Obligatorio
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Para continuar debes colocar tu categoría
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            El club ahora gestiona torneos y turnos con control estricto de nivel. Selecciona tu categoría oficial de juego para seguir disfrutando de OnlyPadel.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 text-center flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Opciones de Categoría */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {VALID_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm ring-2 ring-amber-500/40 font-black'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-base">{cat}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                </div>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {CATEGORY_LABELS[cat]?.split('(')[1]?.replace(')', '') || 'Oficial'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Info adicional */}
        <p className="text-[11px] text-slate-400 text-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
          ⚠️ Si te equivocas podrás solicitar el cambio a la administración del club en recepción.
        </p>

        {/* Botón Guardar */}
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !selectedCategory}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Guardar y Continuar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
