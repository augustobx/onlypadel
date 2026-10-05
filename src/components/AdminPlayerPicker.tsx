'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, UserCheck, X, Loader2, Trophy, Phone, IdCard, Sparkles, Check } from 'lucide-react';
import { searchAdminPlayers, registerPlayerFromAdmin } from '@/actions/admin-calendar';
import { VALID_CATEGORIES, CATEGORY_LABELS } from '@/lib/tournaments/category-rules';

export interface AdminPlayer {
  id: string;
  name: string;
  lastName?: string | null;
  phone?: string | null;
  dni?: string | null;
  category?: string | null;
}

interface AdminPlayerPickerProps {
  selectedPlayer: AdminPlayer | null;
  onSelect: (player: AdminPlayer | null) => void;
  required?: boolean;
}

export default function AdminPlayerPicker({ selectedPlayer, onSelect, required = true }: AdminPlayerPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Modal para registrar nuevo cliente
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDni, setNewDni] = useState('');
  const [newCategory, setNewCategory] = useState<string>('8va');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchAdminPlayers(query);
      if (res.success && res.data) {
        setResults(res.data as AdminPlayer[]);
        setIsDropdownOpen(true);
      }
      setIsSearching(false);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (player: AdminPlayer) => {
    onSelect(player);
    setIsDropdownOpen(false);
    setQuery('');
  };

  const handleOpenRegister = () => {
    // Si la query parece un nombre o teléfono, auto-completamos
    if (/^\d+$/.test(query)) {
      setNewPhone(query);
      setNewName('');
    } else {
      setNewName(query);
      setNewPhone('');
    }
    setNewLastName('');
    setNewDni('');
    setNewCategory('8va');
    setRegisterError('');
    setIsDropdownOpen(false);
    setIsRegisterOpen(true);
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newCategory) {
      setRegisterError('Nombre, WhatsApp y Categoría son campos obligatorios.');
      return;
    }

    setIsSubmittingNew(true);
    setRegisterError('');

    const res = await registerPlayerFromAdmin({
      name: newName.trim(),
      lastName: newLastName.trim() || undefined,
      phone: newPhone.trim(),
      dni: newDni.trim() || undefined,
      category: newCategory,
    });

    if (res.success && res.data) {
      onSelect(res.data as AdminPlayer);
      setIsRegisterOpen(false);
    } else {
      setRegisterError(res.error || 'No se pudo crear el cliente.');
    }
    setIsSubmittingNew(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span>👤 Cliente / Jugador</span>
          {required && <span className="text-red-500 font-black">*</span>}
        </label>
        {!selectedPlayer && (
          <button
            type="button"
            onClick={handleOpenRegister}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline"
          >
            <UserPlus className="w-3.5 h-3.5" /> + Registrar Nuevo
          </button>
        )}
      </div>

      {selectedPlayer ? (
        // Card del jugador seleccionado
        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              {selectedPlayer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {selectedPlayer.name} {selectedPlayer.lastName || ''}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  🏆 {selectedPlayer.category || '8va'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedPlayer.phone && <span>📱 {selectedPlayer.phone}</span>}
                {selectedPlayer.dni && <span>🪪 DNI {selectedPlayer.dni}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors ml-2 shrink-0"
            title="Cambiar cliente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Buscador de jugadores
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Nombre, DNI o WhatsApp..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setIsDropdownOpen(true);
              }}
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
            )}
          </div>

          {/* Menú desplegable de resultados */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-1">
              {results.length > 0 ? (
                <>
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                            {p.name} {p.lastName || ''}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            {p.category || '8va'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {p.phone && <span>📱 {p.phone}</span>}
                          {p.dni && <span>🪪 {p.dni}</span>}
                        </div>
                      </div>
                      <Check className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleOpenRegister}
                      className="w-full py-2 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> ¿No está en la lista? Registrar como nuevo
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-slate-400 font-medium">No se encontró ningún jugador con ese criterio.</p>
                  <button
                    type="button"
                    onClick={handleOpenRegister}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Registrar nuevo cliente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal para Registrar Nuevo Cliente */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Registrar Nuevo Cliente</h4>
                  <p className="text-[11px] text-slate-400">Crea la cuenta del jugador para el sistema y App</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {registerError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 text-center">
                ⚠️ {registerError}
              </div>
            )}

            <form onSubmit={handleCreatePlayer} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: Marcos"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Apellido</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Ej: Pérez"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-500" /> WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Ej: 341 555 1234"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <IdCard className="w-3 h-3 text-slate-400" /> DNI
                  </label>
                  <input
                    type="text"
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="Sin puntos"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Categoría Obligatoria */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" /> Categoría Oficial *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  required
                >
                  {VALID_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nota de Clave 12345678 */}
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300">
                🔑 Se creará automáticamente la cuenta con la clave inicial <strong>12345678</strong> para que el jugador ingrese a la App.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Crear y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
