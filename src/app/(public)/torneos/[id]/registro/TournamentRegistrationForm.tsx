'use client';

import { useState, useEffect, useRef } from 'react';
import { registerTeam, searchRegisteredUsers } from '@/actions/public-tournaments';
import { createTournamentPaymentPreference } from '@/actions/payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Search, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import type { TournamentGroupView, TournamentMatchView } from '@/lib/tournaments/types';

type PlayerSearchResult = { id: string; name: string | null; lastName: string | null };
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
    player1Name: session?.name ? `${session.name} ${session.lastName || ''}`.trim() : '',
    player1Phone: session?.phone || '',
    player2Name: '',
    player2Phone: '',
    player2UserId: '',
  });

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const playersRef = useRef<HTMLDivElement>(null);

  const [p2SearchQuery, setP2SearchQuery] = useState('');
  const [p2SearchResults, setP2SearchResults] = useState<PlayerSearchResult[]>([]);
  const [isSearchingP2, setIsSearchingP2] = useState(false);
  const [showP2Dropdown, setShowP2Dropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (p2SearchQuery.length >= 2 && showP2Dropdown) {
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
      <div className="text-center py-8">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
        <h2 className="text-3xl font-black mb-3">¡Inscripción Exitosa!</h2>
        <p className="text-slate-400 mb-8">Tu pareja fue registrada correctamente. Nos contactaremos a la brevedad.</p>
        <Link href={`/torneos`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-5 px-8">Volver a Torneos</Button>
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
        <Label className="text-slate-300">Categoría</Label>
        <select
          value={formData.categoryId}
          onChange={e => { setFormData({ ...formData, categoryId: e.target.value }); setSelectedTeamId(''); }}
          className="w-full h-12 rounded-xl border border-slate-600 bg-slate-700/50 px-4 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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
          <Label className="text-slate-300 text-lg">Elegí tu Zona y Plaza de Juego</Label>
          <div className="grid grid-cols-1 gap-5">
            {selectedCatObj.groups!.map(group => {
              // Ordenar equipos por horario del primer partido
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
      <div ref={playersRef} className="pt-4">
        {selectedPlazaSummary && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-sm mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p>
              Elegiste jugar en <strong>{selectedPlazaSummary.zoneName} ({selectedPlazaSummary.plazaName})</strong>. 
              {selectedPlazaSummary.firstMatch && ` Tu primer partido será a las ${selectedPlazaSummary.firstMatch}. `}
              Ahora completá los datos de los jugadores.
            </p>
          </div>
        )}

        <div className="space-y-2 mb-6">
          <Label className="text-slate-300">Nombre de la Pareja <span className="text-slate-600">(opcional)</span></Label>
          <Input
            placeholder="Ej: Los Galácticos"
            value={formData.teamName}
            onChange={e => setFormData({ ...formData, teamName: e.target.value })}
            className="rounded-xl h-12 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        {/* JUGADORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold text-emerald-400 border-b border-slate-700/50 pb-2">Jugador 1</h3>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Nombre y Apellido</Label>
              <Input required value={formData.player1Name} onChange={e => setFormData({ ...formData, player1Name: e.target.value })} className="rounded-xl h-11 bg-slate-700/50 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Teléfono WhatsApp</Label>
              <Input required type="tel" placeholder="1155667788" value={formData.player1Phone} onChange={e => setFormData({ ...formData, player1Phone: e.target.value })} className="rounded-xl h-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-blue-400 border-b border-slate-700/50 pb-2">Jugador 2</h3>
            <div className="space-y-2 relative">
              <Label className="text-slate-300 text-sm flex items-center gap-2">
                <Search className="w-3 h-3 text-slate-400" /> 
                Buscar por Nombre o Apellido
              </Label>
              <Input 
                required 
                value={formData.player2Name} 
                onChange={e => {
                  setFormData({ ...formData, player2Name: e.target.value, player2UserId: '' });
                  setP2SearchQuery(e.target.value);
                  setShowP2Dropdown(true);
                }}
                onFocus={() => { if(formData.player2Name.length >= 2) setShowP2Dropdown(true); }}
                onBlur={() => setTimeout(() => setShowP2Dropdown(false), 200)}
                className="rounded-xl h-11 bg-slate-700/50 border-slate-600 text-white" 
                placeholder="Ej: Juan Perez"
              />
              {showP2Dropdown && (p2SearchResults.length > 0 || isSearchingP2) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                  {isSearchingP2 ? (
                    <div className="p-4 text-sm text-slate-400 text-center flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> Buscando...
                    </div>
                  ) : (
                    p2SearchResults.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            player2Name: `${user.name} ${user.lastName || ''}`.trim(),
                            player2Phone: '',
                            player2UserId: user.id,
                          });
                          setP2SearchQuery('');
                          setShowP2Dropdown(false);
                        }}
                      >
                        <div className="font-bold text-white text-sm">{user.name} {user.lastName}</div>
                        <div className="text-slate-400 text-xs">Jugador registrado</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Teléfono WhatsApp</Label>
              <Input required={!formData.player2UserId} disabled={Boolean(formData.player2UserId)} type="tel" placeholder={formData.player2UserId ? 'Datos protegidos' : '1155667788'} value={formData.player2Phone} onChange={e => setFormData({ ...formData, player2Phone: e.target.value, player2UserId: '' })} className="rounded-xl h-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 font-medium text-sm">{error}</div>}

      <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-6 rounded-xl text-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
        {loading ? 'Procesando...' : requireDeposit ? 'Inscribirme y Pagar Seña' : 'Confirmar Inscripción'}
      </Button>
    </form>
  );
}
