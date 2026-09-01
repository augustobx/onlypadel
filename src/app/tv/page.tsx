'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTournamentDetails, getPublicTournaments } from '@/actions/public-tournaments';
import { Trophy, Wifi, Clock } from 'lucide-react';
import type { TournamentMatchView, TournamentView } from '@/lib/tournaments/types';

export default function TvModePage() {
  const [tournament, setTournament] = useState<TournamentView | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  // Reloj en vivo
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const pubReq = await getPublicTournaments();
      const active = pubReq.data?.find((t) => t.status === 'ONGOING') ||
                     pubReq.data?.find((t) => t.status === 'REGISTRATION') ||
                     pubReq.data?.[0];

      if (active) {
        const detailReq = await getTournamentDetails(active.id);
        if (detailReq.success && detailReq.data) {
          setTournament(detailReq.data);
          setLastUpdate(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (e) {
      console.error('TV Mode fetch error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void fetchData(), 0);
    const interval = setInterval(fetchData, 30000); // Refresh cada 30s
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [fetchData]);

  // Calcular slides disponibles
  const getSlides = useCallback(() => {
    if (!tournament) return [];
    const slides: string[] = [];

    const allMatches: TournamentMatchView[] = tournament.categories?.flatMap((c) =>
      c.matches?.map((m) => ({ ...m, categoryName: c.name })) || []
    ) || [];

    const live = allMatches.filter((m) => m.status === 'IN_PROGRESS');
    const completed = allMatches.filter((m) => m.status === 'COMPLETED' && m.scoreTeam1 !== 'BYE');
    const scheduled = allMatches.filter((m) => m.status === 'SCHEDULED' && m.team1Id && m.team2Id);

    if (live.length > 0) slides.push('live');
    slides.push('bracket');
    if (scheduled.length > 0) slides.push('upcoming');
    if (completed.length > 0) slides.push('results');

    return slides.length > 0 ? slides : ['bracket'];
  }, [tournament]);

  // Auto-rotate slides
  useEffect(() => {
    if (!tournament) return;
    const slides = getSlides();
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % slides.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [tournament, getSlides]);

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <Trophy className="w-24 h-24 text-yellow-500 animate-pulse mb-6" />
        <p className="text-2xl text-slate-500 font-bold">Cargando torneo...</p>
      </div>
    );
  }

  // ============================================================
  // NO TOURNAMENT
  // ============================================================
  if (!tournament) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <Trophy className="w-32 h-32 text-slate-800 mb-8" />
        <h1 className="text-5xl font-black text-slate-700 text-center">No hay torneos activos</h1>
        <p className="text-2xl text-slate-800 mt-4">Los torneos aparecerán aquí cuando estén publicados</p>
      </div>
    );
  }

  // ============================================================
  // DATA PROCESSING
  // ============================================================
  const allMatches: TournamentMatchView[] = tournament.categories?.flatMap((c) =>
    c.matches?.map((m) => ({ ...m, categoryName: c.name })) || []
  ) || [];

  const liveMatches = allMatches.filter((m) => m.status === 'IN_PROGRESS');
  const completedMatches = allMatches.filter((m) => m.status === 'COMPLETED' && m.scoreTeam1 !== 'BYE' && m.scoreTeam2 !== 'BYE');
  const scheduledMatches = allMatches.filter((m) => m.status === 'SCHEDULED' && m.team1Id && m.team2Id);

  const slides = getSlides();
  const currentSlide = slides[slideIndex % slides.length] || 'bracket';

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none">
      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 px-8 py-5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-5">
          <div className="bg-yellow-500/10 p-3 rounded-2xl">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-none">{tournament.name}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {tournament.categories?.map((c) => c.name).join(' • ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {liveMatches.length > 0 && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 px-5 py-2.5 rounded-2xl">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-red-400 font-black text-lg tracking-wider">EN VIVO</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-4xl font-black tabular-nums text-white">{clock}</p>
            <p className="text-xs text-slate-600 flex items-center gap-1 justify-end">
              <Wifi className="w-3 h-3" /> Actualizado: {lastUpdate}
            </p>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* SLIDE INDICATORS */}
      {/* ============================================================ */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 py-3 bg-slate-900/50">
          {slides.map((s, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === slideIndex % slides.length ? 'w-12 bg-blue-500' : 'w-4 bg-slate-700'}`} />
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* CONTENT */}
      {/* ============================================================ */}
      <main className="flex-1 overflow-hidden p-6 md:p-10">
        {/* LIVE MATCHES */}
        {currentSlide === 'live' && (
          <div className="h-full flex flex-col" key="live">
            <h2 className="text-3xl font-black text-red-400 mb-8 uppercase tracking-widest text-center flex items-center justify-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              Partidos en Curso
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 content-center">
              {liveMatches.map((m) => (
                <div key={m.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-l-4 border-red-500 rounded-3xl p-8 shadow-2xl shadow-red-500/5">
                  <p className="text-slate-400 font-bold text-lg mb-6 uppercase tracking-wider">{m.categoryName} — {m.roundName || `Ronda ${m.round}`}</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-700/30 rounded-2xl px-6 py-5">
                      <span className="text-3xl font-black">{m.team1?.name || 'TBD'}</span>
                      <span className="text-4xl font-black text-yellow-400 tabular-nums">{m.scoreTeam1 || '0'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-700/30 rounded-2xl px-6 py-5">
                      <span className="text-3xl font-black">{m.team2?.name || 'TBD'}</span>
                      <span className="text-4xl font-black text-yellow-400 tabular-nums">{m.scoreTeam2 || '0'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRACKET / CUADRO */}
        {currentSlide === 'bracket' && (
          <div className="h-full flex flex-col" key="bracket">
            <h2 className="text-3xl font-black text-blue-400 mb-8 uppercase tracking-widest text-center">Cuadro del Torneo</h2>
            <div className="flex-1 overflow-x-auto">
              {tournament.categories?.map((cat) => {
                if (!cat.matches?.length) return null;
                const bracketMatches = cat.matches.filter((m) => !m.groupId);
                const rounds = [...new Set(bracketMatches.map((m) => m.round))].sort((a, b) => a - b);

                return (
                  <div key={cat.id} className="mb-10">
                    <h3 className="text-xl font-bold text-yellow-400 mb-6 text-center">{cat.name}</h3>
                    <div className="flex gap-8 justify-center min-w-max px-4">
                      {rounds.map((round) => {
                        const roundMatches = bracketMatches
                          .filter((m) => m.round === round)
                          .sort((a, b) => a.matchOrder - b.matchOrder);
                        const roundName = roundMatches[0]?.roundName || `Ronda ${round}`;

                        return (
                          <div key={round} className="flex flex-col min-w-[280px]" style={{ justifyContent: 'space-around' }}>
                            <h4 className="text-center font-bold text-sm text-slate-500 mb-4 uppercase tracking-wider">{roundName}</h4>
                            <div className="flex flex-col justify-around flex-1 gap-6">
                              {roundMatches.map((m) => {
                                const isBye = m.scoreTeam1 === 'BYE' || m.scoreTeam2 === 'BYE';
                                if (isBye) return null;

                                const isLive = m.status === 'IN_PROGRESS';
                                const isDone = m.status === 'COMPLETED';

                                return (
                                  <div key={m.id} className={`rounded-xl overflow-hidden border ${isLive ? 'border-red-500/60 shadow-lg shadow-red-500/10' : isDone ? 'border-emerald-500/30' : 'border-slate-700/50'}`}>
                                    {isLive && <div className="h-1 bg-red-500 animate-pulse" />}
                                    <div className={`flex justify-between items-center px-4 py-3 border-b border-slate-700/30 ${m.winnerId === m.team1Id && m.winnerId ? 'bg-emerald-500/10' : 'bg-slate-800/60'}`}>
                                      <span className={`text-base font-semibold truncate ${m.winnerId === m.team1Id && m.winnerId ? 'text-emerald-400' : m.team1Id ? 'text-white' : 'text-slate-600'}`}>
                                        {m.team1?.name || 'TBD'}
                                      </span>
                                      <span className="font-mono font-bold text-lg tabular-nums ml-3">{m.scoreTeam1 ?? '-'}</span>
                                    </div>
                                    <div className={`flex justify-between items-center px-4 py-3 ${m.winnerId === m.team2Id && m.winnerId ? 'bg-emerald-500/10' : 'bg-slate-800/60'}`}>
                                      <span className={`text-base font-semibold truncate ${m.winnerId === m.team2Id && m.winnerId ? 'text-emerald-400' : m.team2Id ? 'text-white' : 'text-slate-600'}`}>
                                        {m.team2?.name || 'TBD'}
                                      </span>
                                      <span className="font-mono font-bold text-lg tabular-nums ml-3">{m.scoreTeam2 ?? '-'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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

        {/* UPCOMING MATCHES */}
        {currentSlide === 'upcoming' && (
          <div className="h-full flex flex-col" key="upcoming">
            <h2 className="text-3xl font-black text-purple-400 mb-8 uppercase tracking-widest text-center">Próximos Cruces</h2>
            <div className="flex-1 flex flex-col justify-center gap-5 max-w-4xl mx-auto w-full">
              {scheduledMatches.slice(0, 6).map((m) => (
                <div key={m.id} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 flex items-center border border-slate-700/50">
                  <span className="flex-1 text-2xl font-bold text-right truncate pr-6">{m.team1?.name || 'TBD'}</span>
                  <span className="text-slate-600 font-black text-3xl px-6 shrink-0">VS</span>
                  <span className="flex-1 text-2xl font-bold truncate pl-6">{m.team2?.name || 'TBD'}</span>
                  <span className="ml-6 bg-purple-500/15 text-purple-400 px-4 py-2 rounded-xl font-bold text-sm shrink-0">{m.categoryName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {currentSlide === 'results' && (
          <div className="h-full flex flex-col" key="results">
            <h2 className="text-3xl font-black text-emerald-400 mb-8 uppercase tracking-widest text-center">Últimos Resultados</h2>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 content-center max-w-5xl mx-auto w-full">
              {completedMatches.slice(-8).map((m) => (
                <div key={m.id} className="bg-slate-800/50 rounded-2xl p-5 flex items-center justify-between border border-slate-700/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${m.winnerId === m.team1Id ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {m.winnerId === m.team1Id ? '🏆' : ''} {m.team1?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-lg font-bold ${m.winnerId === m.team2Id ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {m.winnerId === m.team2Id ? '🏆' : ''} {m.team2?.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-yellow-400 font-mono font-bold text-lg">{m.scoreTeam1}</p>
                    <p className="text-yellow-400 font-mono font-bold text-lg">{m.scoreTeam2}</p>
                  </div>
                  <div className="ml-4 shrink-0">
                    <span className="text-xs text-slate-600 uppercase">{m.categoryName}</span>
                    <p className="text-xs text-slate-700">{m.roundName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <footer className="bg-slate-900/80 border-t border-slate-800 px-8 py-3 flex items-center justify-between shrink-0">
        <p className="text-slate-600 font-bold text-sm">OnlyPadel</p>
        <div className="flex items-center gap-3 text-slate-700 text-xs">
          <Clock className="w-3 h-3" />
          <span>Auto-refresh cada 30s</span>
        </div>
      </footer>
    </div>
  );
}
