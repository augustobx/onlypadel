'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCategory, deleteCategory, renameCategory, generateKnockoutBracket, generateKnockoutFromZones, autoScheduleKnockout } from '@/actions/tournament-engine';
import { updateTournamentStatus } from '@/actions/tournaments';
import TournamentMesaControl from './TournamentMesaControl';
import TournamentTeamsModal from './TournamentTeamsModal';
import TournamentZonesGeneratorModal from './TournamentZonesGeneratorModal';
import TournamentBracketView from './TournamentBracketView';
import { Trash2, Zap, Users, Settings, LayoutGrid, Trophy, PlayCircle, MonitorPlay, Bot, Edit2, Check, X, Clock } from 'lucide-react';
import type { TournamentView } from '@/lib/tournaments/types';

export default function TournamentManager({ tournament }: { tournament: TournamentView }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'equipos' | 'zonas' | 'llaves' | 'mesa'>('config');
  
  // #9 — Edit category name
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  const handleStatusChange = async (newStatus: string) => {
    setLoading('status');
    const result = await updateTournamentStatus(tournament.id, newStatus);
    setFeedback(result.success ? 'Estado actualizado correctamente.' : result.error || 'No se pudo cambiar el estado.');
    setLoading(null);
    router.refresh();
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setLoading('create_cat');
    await createCategory(tournament.id, newCatName.trim(), null, tournament.format);
    setNewCatName('');
    setLoading(null);
    router.refresh();
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('¿Eliminar esta categoría y todos sus datos?')) return;
    setLoading(catId);
    await deleteCategory(catId);
    setLoading(null);
    router.refresh();
  };

  // #9 — Rename category
  const handleRenameCategory = async (catId: string) => {
    if (!editCatName.trim()) return;
    setLoading(`rename_${catId}`);
    await renameCategory(catId, editCatName.trim());
    setEditingCat(null);
    setEditCatName('');
    setLoading(null);
    router.refresh();
  };

  const handleGenerateBracket = async (categoryId: string) => {
    if (!confirm('¿Generar cuadro vacío? Si ya existe uno, se eliminará y se creará de nuevo aleatoriamente.')) return;
    setLoading(categoryId);
    const res = await generateKnockoutBracket(categoryId);
    if (res.success) {
      setFeedback(res.message || 'Cuadro generado correctamente.');
    } else {
      setFeedback(res.error || 'Error al generar cuadro.');
    }
    setLoading(null);
    router.refresh();
  };

  const handleGenerateFromZones = async (categoryId: string) => {
    if (!confirm('¿Generar cuadro desde zonas? Se tomarán los 1ros y 2dos de cada zona para armar el cuadro automáticamente.')) return;
    setLoading(`zones_${categoryId}`);
    const res = await generateKnockoutFromZones(categoryId);
    if (res.success) {
      setFeedback(res.message || 'Cuadro generado desde zonas correctamente.');
    } else {
      setFeedback(res.error || 'Error al generar cuadro desde zonas.');
    }
    setLoading(null);
    router.refresh();
  };

  const handleAutoSchedule = async (categoryId: string) => {
    if (!confirm('¿Programar automáticamente el cuadro usando la disponibilidad real de las canchas?')) return;
    setLoading(`schedule_${categoryId}`);
    const result = await autoScheduleKnockout(categoryId);
    setFeedback(result.success ? result.message || 'Cronograma generado.' : result.error || 'No se pudo generar el cronograma.');
    setLoading(null);
    router.refresh();
  };

  const statusLabels: Record<string, string> = {
    'DRAFT': '📝 Borrador',
    'REGISTRATION': '📋 Inscripciones Abiertas',
    'ONGOING': '🔴 En Curso (Jugando)',
    'COMPLETED': '✅ Finalizado',
  };

  const tabs = [
    { id: 'config', label: 'Configuración', icon: <Settings className="w-4 h-4 mr-2" /> },
    { id: 'equipos', label: 'Equipos', icon: <Users className="w-4 h-4 mr-2" /> },
    { id: 'zonas', label: 'Zonas', icon: <LayoutGrid className="w-4 h-4 mr-2" /> },
    { id: 'llaves', label: 'Llaves (Cuadro)', icon: <Trophy className="w-4 h-4 mr-2" /> },
    { id: 'mesa', label: 'Mesa de Control', icon: <PlayCircle className="w-4 h-4 mr-2" /> },
  ] as const;

  return (
    <div className="space-y-6">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex overflow-x-auto hide-scrollbar gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <Link href="/tv" target="_blank">
          <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400 whitespace-nowrap">
            <MonitorPlay className="w-4 h-4 mr-2" /> Pantalla TV
          </Button>
        </Link>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-bold flex justify-between items-center shadow-sm">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-500 hover:text-emerald-700 bg-emerald-100 dark:bg-emerald-800/50 rounded-full w-6 h-6 flex items-center justify-center">✕</button>
        </div>
      )}

      {/* TAB CONTENT: CONFIG */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Categorías del Torneo</CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.categories.length === 0 ? (
                <p className="text-slate-500 py-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl">No hay categorías. Creá una para empezar.</p>
              ) : (
                <div className="space-y-3">
                  {tournament.categories.map((cat) => (
                    <div key={cat.id} className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        {editingCat === cat.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editCatName}
                              onChange={e => setEditCatName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleRenameCategory(cat.id)}
                              className="h-8 text-sm max-w-xs"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600" onClick={() => handleRenameCategory(cat.id)} disabled={loading === `rename_${cat.id}`}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400" onClick={() => { setEditingCat(null); setEditCatName(''); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            {cat.name} <Badge variant="secondary" className="text-xs">{cat.format || tournament.format}</Badge>
                            <button 
                              className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                              onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); }}
                              title="Renombrar categoría"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </h3>
                        )}
                        <p className="text-sm text-slate-500 mt-1">
                          {cat.teams?.length || 0} parejas inscriptas
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat.id)} disabled={loading === cat.id} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 p-5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Añadir nueva categoría</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Ej: 5ta Libre, 7ma Masculina, Mixto..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                    className="bg-white dark:bg-slate-900 shadow-sm"
                  />
                  <Button onClick={handleCreateCategory} disabled={loading === 'create_cat' || !newCatName.trim()} className="whitespace-nowrap shadow-sm">
                    {loading === 'create_cat' ? 'Añadiendo...' : 'Agregar Categoría'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Estado y Publicación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={tournament.status === key ? 'default' : 'outline'}
                      className={
                        tournament.status === key
                          ? key === 'REGISTRATION' ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : key === 'ONGOING' ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : ''
                          : ''
                      }
                      onClick={() => handleStatusChange(key)}
                      disabled={loading === 'status'}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Detalles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Formato</span>
                  <Badge variant="outline">{tournament.format}</Badge>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Cupo Máximo</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{tournament.maxTeams || 'Sin límite'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Inscripción</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">${tournament.entryFee?.toString() || '0'}</span>
                </div>
                {tournament.requireDeposit && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Seña (MercadoPago)</span>
                    <span className="font-bold text-amber-600">${tournament.depositAmount?.toString() || '0'}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EQUIPOS */}
      {activeTab === 'equipos' && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Gestión de Inscriptos por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournament.categories.map((cat) => (
              <div key={cat.id} className="p-5 border rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm hover:border-emerald-500/30 transition-colors">
                <div>
                  <h3 className="font-black text-xl text-slate-800 dark:text-white">{cat.name}</h3>
                  <p className="text-slate-500 mt-1 font-medium">{cat.teams?.length || 0} parejas anotadas</p>
                </div>
                <TournamentTeamsModal category={cat} tournamentId={tournament.id} />
              </div>
            ))}
            {tournament.categories.length === 0 && <p className="text-slate-500 py-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl">Crea una categoría primero.</p>}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: ZONAS (#16 — Mostrar partidos de zona) */}
      {activeTab === 'zonas' && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Zonas y Grupos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournament.categories.map((cat) => {
              const hasZones = cat.groups && cat.groups.length > 0;
              return (
                <div key={cat.id} className="p-6 border rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-black text-xl text-slate-800 dark:text-white">{cat.name}</h3>
                      <p className="text-slate-500 text-sm">{hasZones ? `${cat.groups.length} zonas generadas` : 'Sin zonas generadas'}</p>
                    </div>
                    <TournamentZonesGeneratorModal category={cat} tournamentStartDate={new Date(tournament.startDate)} />
                  </div>
                  
                  {hasZones && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {cat.groups.map((g) => {
                        // Filtrar partidos de este grupo
                        const groupMatches = cat.matches?.filter((m) => m.groupId === g.id)
                          ?.sort((a, b) => {
                            if (a.startTime && b.startTime) return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                            return a.matchOrder - b.matchOrder;
                          }) || [];

                        return (
                          <div key={g.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">{g.name}</h4>
                            
                            {/* Tabla de posiciones */}
                            <div className="space-y-2 mb-4">
                              {g.teams.map((gt, i: number) => (
                                <div key={gt.id} className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{i+1}. {gt.team.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">{gt.matchesPlayed}PJ {gt.matchesWon}G {gt.matchesLost}P</span>
                                    <Badge variant="secondary" className="font-mono">{gt.points || 0} pts</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* #16 — Partidos del grupo */}
                            {groupMatches.length > 0 && (
                              <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Partidos</p>
                                {groupMatches.map((m) => (
                                  <div key={m.id} className={`flex items-center text-xs rounded-lg px-2 py-1.5 ${
                                    m.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-900/10' :
                                    m.status === 'IN_PROGRESS' ? 'bg-red-50 dark:bg-red-900/10' :
                                    'bg-slate-50 dark:bg-slate-900/30'
                                  }`}>
                                    {m.startTime && (
                                      <span className="text-slate-400 font-mono w-12 shrink-0 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {new Date(m.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                    <span className={`flex-1 truncate ${m.winnerId === m.team1Id && m.winnerId ? 'font-bold text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                                      {m.team1?.name || '?'}
                                    </span>
                                    <span className="text-slate-400 mx-1 shrink-0">vs</span>
                                    <span className={`flex-1 truncate text-right ${m.winnerId === m.team2Id && m.winnerId ? 'font-bold text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                                      {m.team2?.name || '?'}
                                    </span>
                                    {m.status === 'COMPLETED' && (
                                      <span className="ml-2 font-mono text-slate-500 shrink-0">{m.scoreTeam1} - {m.scoreTeam2}</span>
                                    )}
                                    {m.status === 'IN_PROGRESS' && (
                                      <span className="ml-2 text-red-500 font-bold shrink-0">🔴</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {tournament.categories.length === 0 && <p className="text-slate-500 py-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl">Crea una categoría primero.</p>}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: LLAVES */}
      {activeTab === 'llaves' && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Cuadro Eliminatorio (Llaves)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {tournament.categories.map((cat) => (
              <div key={cat.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-900 p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" /> {cat.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="default" 
                      onClick={() => handleGenerateFromZones(cat.id)}
                      disabled={loading === `zones_${cat.id}` || !cat.groups?.length}
                      className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      Auto-Generar desde Zonas
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleGenerateBracket(cat.id)}
                      disabled={loading === cat.id}
                      className="bg-white dark:bg-slate-800"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Generar Cuadro Vacío
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAutoSchedule(cat.id)}
                      disabled={loading === `schedule_${cat.id}` || !cat.matches?.some((match) => !match.groupId)}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Programar canchas automáticamente
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 overflow-x-auto bg-slate-50/50 dark:bg-slate-950">
                  <TournamentBracketView category={cat} />
                </div>
              </div>
            ))}
            {tournament.categories.length === 0 && <p className="text-slate-500 py-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl">Crea una categoría primero.</p>}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: MESA DE CONTROL */}
      {activeTab === 'mesa' && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-t-xl mb-4">
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-500" /> Mesa de Control — Partidos en Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TournamentMesaControl tournament={tournament} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
