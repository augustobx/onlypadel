'use client';

import { useState, useEffect, useRef } from 'react';
import { registerTeam, searchRegisteredUsers } from '@/actions/public-tournaments';
import { createTournamentPaymentPreference } from '@/actions/payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Search, CalendarClock, UserPlus, Check, X, ShieldCheck, UserCheck } from 'lucide-react';
import Link from 'next/link';
import type { TournamentGroupView, TournamentMatchView } from '@/lib/tournaments/types';

type PlayerSearchResult = { id: string; name: string | null; lastName: string | null; dni?: string | null; phone?: string | null };
type PlayerSession = PlayerSearchResult & { phone: string | null; email?: string | null; dni?: string | null };

type Props = {
  tournamentId: string;
  categories: { id: string; name: string; teamCount: number; groups?: TournamentGroupView[]; matches?: TournamentMatchView[] }[];
  requireDeposit: boolean;
  session: PlayerSession;
};

export default function TournamentRegistrationForm({ tournamentId, categories, requireDeposit, session }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    categoryId: categories.length === 1 ? categories[0].id : '',
    teamName: '',
    player1Name: session?.name || '',
    player1LastName: session?.lastName || '',
    player1Dni: session?.dni || '',
    player1Phone: session?.phone || '',
    player2Name: '',
    player2LastName: '',
    player2Dni: '',
    player2Phone: '',
    player2UserId: '',
  });

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedP2User, setSelectedP2User] = useState<PlayerSearchResult | null>(null);
  const playersRef = useRef<HTMLDivElement>(null);

  const [p2SearchQuery, setP2SearchQuery] = useState('');
  const [p2SearchResults, setP2SearchResults] = useState<PlayerSearchResult[]>([]);
  const [isSearchingP2, setIsSearchingP2] = useState(false);
  const [showP2Dropdown, setShowP2Dropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (p2SearchQuery.trim().length >= 2 && showP2Dropdown) {
        setIsSearchingP2(true);
        const res = await searchRegisteredUsers(p2SearchQuery);
        if (res.success && res.data) {
          setP2SearchResults(res.data);
        }
        setIsSearchingP2(false);
      } else {
        setP2SearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [p2SearchQuery, showP2Dropdown]);

  const handleSelectRegisteredUser = (user: PlayerSearchResult) => {
    setSelectedP2User(user);
    setFormData(prev => ({
      ...prev,
      player2Name: user.name || '',
      player2LastName: user.lastName || '',
      player2Dni: user.dni || '',
      player2Phone: user.phone || '',
      player2UserId: user.id,
    }));
    setP2SearchQuery('');
    setShowP2Dropdown(false);
  };

  const handleClearSelectedP2 = () => {
    setSelectedP2User(null);
    setFormData(prev => ({
      ...prev,
      player2Name: '',
      player2LastName: '',
      player2Dni: '',
      player2Phone: '',
      player2UserId: '',
    }));
    setP2SearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      setError('Seleccioná una categoría');
      return;
    }

    const selectedCatObj = categories.find(c => c.id === formData.categoryId);
    const hasZones = selectedCatObj?.groups && selectedCatObj.groups.length > 0;

    if (hasZones && !selectedTeamId) {
      setError('Seleccioná una plaza en alguna de las zonas');
      return;
    }

    if (!formData.player1Name || !formData.player1Phone) {
      setError('Completá los datos del Jugador 1');
      return;
    }

    if (!selectedP2User && (!formData.player2Name || !formData.player2Phone)) {
      setError('Completá los datos del Jugador 2 (Nombre y Teléfono son requeridos)');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      teamId: hasZones ? selectedTeamId : undefined
    };

    const result = await registerTeam(tournamentId, formData.categoryId, payload);

    if (result.success && result.teamId) {
      if (requireDeposit) {
        const payRes = await createTournamentPaymentPreference(result.teamId);
        if (payRes.success && payRes.init_point) {
          window.location.href = payRes.init_point;
          return;
        }
        setError(payRes.error || 'La pareja quedó inscripta, pero no se pudo iniciar el pago. Contactá al club.');
        setLoading(false);
        return;
      }
      setSuccess(true);
    } else {
      setError(result.error || 'Error al inscribir');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center py-8 animate-in zoom-in-95 duration-300">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
        <h2 className="text-3xl font-black mb-3">¡Inscripción Exitosa!</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
          Tu pareja fue registrada correctamente en el torneo. Los jugadores no registrados ya fueron dados de alta en el sistema.
        </p>
        <Link href={`/torneos/${tournamentId}`}>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5 px-8 font-bold">
            Ver Cuadro del Torneo
          </Button>
        </Link>
      </div>
    );
  }

  const selectedCatObj = categories.find(c => c.id === formData.categoryId);
  const hasZones = selectedCatObj?.groups && selectedCatObj.groups.length > 0;

  // Encontrar la plaza seleccionada para el resumen
  let selectedPlazaSummary = null;
  if (hasZones && selectedTeamId) {
    for (const g of selectedCatObj.groups!) {
      const plaza = g.teams.find((t) => t.team.id === selectedTeamId);
      if (plaza) {
        const matches = selectedCatObj.matches!.filter((m) => m.team1Id === selectedTeamId || m.team2Id === selectedTeamId);
        selectedPlazaSummary = {
          zoneName: g.name,
          plazaName: plaza.team.name,
          firstMatch: matches.length > 0 && matches[0].startTime ? new Date(matches[0].startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null
        };
        break;
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SELECTOR DE CATEGORÍA */}
      <div className="space-y-2">
        <Label className="text-slate-300 font-bold">Categoría</Label>
        <select
          value={formData.categoryId}
          onChange={e => { setFormData({ ...formData, categoryId: e.target.value }); setSelectedTeamId(''); }}
          className="w-full h-12 rounded-xl border border-slate-600 bg-slate-700/50 px-4 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium"
          required
        >
          <option value="">Seleccionar categoría...</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.teamCount} inscriptos)</option>
          ))}
        </select>
      </div>

      {/* SELECTOR DE ZONAS Y PLAZAS */}
      {hasZones && selectedCatObj && (
        <div className="space-y-4">
          <Label className="text-slate-300 text-lg font-black">Elegí tu Zona y Plaza de Juego</Label>
          <div className="grid grid-cols-1 gap-5">
            {selectedCatObj.groups!.map(group => {
              const sortedTeams = [...group.teams].sort((a, b) => {
                const mA = selectedCatObj.matches!.filter((m) => m.team1Id === a.team.id || m.team2Id === a.team.id);
                const mB = selectedCatObj.matches!.filter((m) => m.team1Id === b.team.id || m.team2Id === b.team.id);
                const tA = mA[0]?.startTime ? new Date(mA[0].startTime).getTime() : 0;
                const tB = mB[0]?.startTime ? new Date(mB[0].startTime).getTime() : 0;
                return tA - tB;
              });

              return (
                <div key={group.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-lg">
                  <h4 className="text-xl font-black text-emerald-400 mb-4">{group.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sortedTeams.map((gt) => {
                      const t = gt.team;
                      const isLibre = t.player1?.phone === 'DUMMY_PLAZA';
                      const matches = selectedCatObj.matches!.filter((m) => m.team1Id === t.id || m.team2Id === t.id);

                      return (
                        <div 
                          key={t.id} 
                          className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                            selectedTeamId === t.id 
                            ? 'bg-emerald-900/30 border-emerald-500 shadow-emerald-500/20 shadow-lg scale-[1.02]' 
                            : isLibre 
                              ? 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800' 
                              : 'bg-slate-900/50 border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <p className={`font-bold text-lg ${isLibre ? 'text-white' : 'text-slate-500 line-through'}`}>{t.name}</p>
                            {!isLibre && (
                              <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-md uppercase tracking-wider">Ocupada</span>
                            )}
                            {isLibre && selectedTeamId === t.id && (
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md uppercase tracking-wider">Tu Elección</span>
                            )}
                          </div>
                          
                          {isLibre && matches.length > 0 && (
                            <div className="space-y-1.5 mb-4">
                              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" /> Horarios de Partidos:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {matches.filter((m) => m.startTime).map((m, i: number) => (
                                  <span key={i} className="text-[11px] bg-slate-800 border border-slate-600 px-2 py-1 rounded-md text-slate-300 shadow-sm">
                                    <span className="text-emerald-400 font-bold mr-1">P{i+1}:</span> 
                                    {new Date(m.startTime!).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {isLibre && (
                            <Button
                              type="button"
                              variant={selectedTeamId === t.id ? 'default' : 'secondary'}
                              className={`w-full font-bold ${
                                selectedTeamId === t.id 
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                              }`}
                              onClick={() => {
                                setSelectedTeamId(t.id);
                                setTimeout(() => playersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
                              }}
                            >
                              {selectedTeamId === t.id ? 'Plaza Seleccionada ✓' : 'Elegir esta Plaza'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANCLA PARA SCROLL Y RESUMEN */}
      <div ref={playersRef} className="pt-4 space-y-6">
        {selectedPlazaSummary && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p>
              Elegiste jugar en <strong>{selectedPlazaSummary.zoneName} ({selectedPlazaSummary.plazaName})</strong>. 
              {selectedPlazaSummary.firstMatch && ` Tu primer partido será a las ${selectedPlazaSummary.firstMatch}. `}
              Completá los datos de la pareja a continuación.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-slate-300 font-bold">Nombre de la Pareja <span className="text-slate-500 text-xs font-normal">(Opcional)</span></Label>
          <Input
            placeholder="Ej: González / Pérez"
            value={formData.teamName}
            onChange={e => setFormData({ ...formData, teamName: e.target.value })}
            className="rounded-xl h-12 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        {/* JUGADORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* JUGADOR 1 */}
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="font-black text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Jugador 1 (Vos)
              </h3>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-md font-bold">
                Sesión Activa
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-bold">Nombre</Label>
                <Input required value={formData.player1Name} onChange={e => setFormData({ ...formData, player1Name: e.target.value })} className="rounded-xl h-10 bg-slate-700/50 border-slate-600 text-white text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-bold">Apellido</Label>
                <Input value={formData.player1LastName} onChange={e => setFormData({ ...formData, player1LastName: e.target.value })} className="rounded-xl h-10 bg-slate-700/50 border-slate-600 text-white text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-bold">DNI</Label>
                <Input value={formData.player1Dni} onChange={e => setFormData({ ...formData, player1Dni: e.target.value })} className="rounded-xl h-10 bg-slate-700/50 border-slate-600 text-white text-sm" placeholder="Sin puntos" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-bold">WhatsApp</Label>
                <Input required type="tel" placeholder="3329..." value={formData.player1Phone} onChange={e => setFormData({ ...formData, player1Phone: e.target.value })} className="rounded-xl h-10 bg-slate-700/50 border-slate-600 text-white text-sm" />
              </div>
            </div>
          </div>

          {/* JUGADOR 2 */}
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="font-black text-blue-400 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Jugador 2 (Compañero)
              </h3>
              {selectedP2User ? (
                <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-md font-bold">
                  Registrado
                </span>
              ) : (
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-md font-bold">
                  Alta Automática
                </span>
              )}
            </div>

            {/* SELECCIÓN RÁPIDA O BÚSQUEDA */}
            {selectedP2User ? (
              <div className="bg-blue-950/30 border border-blue-800/60 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-blue-400" />
                    {selectedP2User.name} {selectedP2User.lastName}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedP2User.dni ? `DNI: ${selectedP2User.dni}` : ''} {selectedP2User.phone ? `• Tel: ${selectedP2User.phone}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedP2}
                  className="text-xs text-slate-400 hover:text-red-400 bg-slate-800 p-1.5 rounded-lg transition-colors"
                  title="Cambiar compañero"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5 relative">
                  <Label className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400" /> 
                    Buscar jugador existente en el sistema
                  </Label>
                  <Input 
                    value={p2SearchQuery} 
                    onChange={e => {
                      setP2SearchQuery(e.target.value);
                      setShowP2Dropdown(true);
                    }}
                    onFocus={() => { if (p2SearchQuery.length >= 2) setShowP2Dropdown(true); }}
                    className="rounded-xl h-10 bg-slate-700/50 border-slate-600 text-white text-sm placeholder:text-slate-500" 
                    placeholder="Escribí nombre, apellido o DNI para buscar..."
                  />
                  {showP2Dropdown && (p2SearchResults.length > 0 || isSearchingP2) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {isSearchingP2 ? (
                        <div className="p-3 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                          <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> Buscando en la base de datos...
                        </div>
                      ) : (
                        p2SearchResults.map(user => (
                          <button
                            key={user.id}
                            type="button"
                            className="w-full text-left px-3.5 py-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                            onClick={() => handleSelectRegisteredUser(user)}
                          >
                            <div className="font-bold text-white text-sm">{user.name} {user.lastName}</div>
                            <div className="text-slate-400 text-xs flex gap-2">
                              {user.dni && <span>DNI: {user.dni}</span>}
                              {user.phone && <span>Tel: {user.phone}</span>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* FORMULARIO DE CARGA DIRECTA */}
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 space-y-2.5">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    Si no está registrado, completá sus datos y se creará su usuario:
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-[11px] font-bold">Nombre</Label>
                      <Input 
                        required 
                        value={formData.player2Name} 
                        onChange={e => setFormData({ ...formData, player2Name: e.target.value })} 
                        className="rounded-lg h-9 bg-slate-700/50 border-slate-600 text-white text-xs" 
                        placeholder="Ej: Marcos"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-[11px] font-bold">Apellido</Label>
                      <Input 
                        value={formData.player2LastName} 
                        onChange={e => setFormData({ ...formData, player2LastName: e.target.value })} 
                        className="rounded-lg h-9 bg-slate-700/50 border-slate-600 text-white text-xs" 
                        placeholder="Ej: Rossi"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-[11px] font-bold">DNI</Label>
                      <Input 
                        value={formData.player2Dni} 
                        onChange={e => setFormData({ ...formData, player2Dni: e.target.value })} 
                        className="rounded-lg h-9 bg-slate-700/50 border-slate-600 text-white text-xs" 
                        placeholder="DNI del jugador"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-300 text-[11px] font-bold">WhatsApp</Label>
                      <Input 
                        required 
                        type="tel" 
                        value={formData.player2Phone} 
                        onChange={e => setFormData({ ...formData, player2Phone: e.target.value })} 
                        className="rounded-lg h-9 bg-slate-700/50 border-slate-600 text-white text-xs placeholder:text-slate-500" 
                        placeholder="3329..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 font-medium text-sm">
          ⚠️ {error}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={loading} 
        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black py-6 rounded-xl text-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
      >
        {loading ? 'Procesando inscripción...' : requireDeposit ? 'Inscribir Pareja y Pagar Seña' : 'Confirmar Inscripción'}
      </Button>
    </form>
  );
}
