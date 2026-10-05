'use client';

import { useState } from 'react';
import { Trophy, Award, LayoutGrid, Calendar, Share2, Check, Sparkles, Medal } from 'lucide-react';
import type { TournamentChampionInfo } from '@/lib/tournaments/champions';

export default function TournamentChampionHero({
  champions,
  tournamentName,
}: {
  champions: TournamentChampionInfo[];
  tournamentName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);

  if (!champions || champions.length === 0) return null;

  const current = champions[selectedCategoryIdx] || champions[0];
  const champTeam = current.champion;
  const runnerTeam = current.runnerUp;

  const scrollTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleShare = () => {
    const shareText = `🏆 ¡Felicitaciones a los Campeones de OnlyPadel!\n🥇 ${champTeam.name || 'Campeones'} se consagraron campeones de ${current.categoryName} en ${tournamentName}.\n\nMirá todo el cuadro y las estadísticas en:\n${window.location.href}`;

    if (navigator.share) {
      navigator.share({
        title: `🏆 Campeones: ${tournamentName}`,
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/60 via-slate-950 to-slate-900 p-6 md:p-10 shadow-2xl shadow-amber-500/10 mb-10 backdrop-blur-xl">
      {/* Luces de fondo y auras decorativas */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-yellow-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />

      {/* Selector de categoría si hay más de una finalizada */}
      {champions.length > 1 && (
        <div className="relative z-10 flex flex-wrap gap-2 mb-6 justify-center">
          {champions.map((c, idx) => (
            <button
              key={c.categoryId}
              onClick={() => setSelectedCategoryIdx(idx)}
              className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                idx === selectedCategoryIdx
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🏆 {c.categoryName}
            </button>
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        {/* Badge superior animado */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase shadow-inner">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>¡TORNEO FINALIZADO — CUADRO DE HONOR!</span>
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        {/* Copa Gigante y Título */}
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-yellow-400/30 blur-2xl rounded-full" />
            <div className="relative bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-5 rounded-3xl shadow-xl shadow-yellow-500/20 border-2 border-yellow-300/60 transform hover:scale-105 transition-transform duration-300">
              <Trophy className="w-16 h-16 md:w-20 md:h-20 text-slate-950 drop-shadow-md" />
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-tight">
            ¡CAMPEONES DEL TORNEO!
          </h2>
          <p className="text-sm md:text-base font-bold text-amber-300/80 uppercase tracking-widest mt-1">
            Categoría {current.categoryName}
          </p>
        </div>

        {/* Tarjeta de la Pareja Campeona */}
        <div className="w-full max-w-2xl bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-950 border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative">
          <div className="flex flex-col items-center space-y-4">
            <span className="bg-amber-400 text-slate-950 font-black text-xs md:text-sm px-4 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <Medal className="w-4 h-4" /> 1° Puesto — Campeones
            </span>

            {/* Nombre de la pareja */}
            <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight text-center">
              {champTeam.name || 'Pareja Campeona'}
            </h3>

            {/* Nombres de los jugadores si están disponibles */}
            {(champTeam.player1?.name || champTeam.player2?.name) && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm md:text-base text-amber-200/90 font-medium">
                {champTeam.player1?.name && (
                  <span className="bg-slate-800/80 px-3 py-1 rounded-xl border border-amber-400/20">
                    🎾 {champTeam.player1.name} {champTeam.player1.lastName || ''}
                  </span>
                )}
                <span className="text-amber-400 font-bold">•</span>
                {champTeam.player2?.name && (
                  <span className="bg-slate-800/80 px-3 py-1 rounded-xl border border-amber-400/20">
                    🎾 {champTeam.player2.name} {champTeam.player2.lastName || ''}
                  </span>
                )}
              </div>
            )}

            {/* Resultado de la final */}
            {current.scoreChampion && (
              <div className="inline-flex items-center gap-3 bg-slate-950/80 border border-amber-500/30 px-5 py-2 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold">Resultado de la Gran Final:</span>
                <span className="font-mono text-base md:text-lg font-black text-amber-400">
                  {current.scoreChampion}
                  {current.scoreRunnerUp && current.scoreRunnerUp !== '-' ? ` - ${current.scoreRunnerUp}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Subcampeones (2° Puesto) */}
          {runnerTeam && (
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                  🥈 Subcampeones
                </span>
                <span className="font-bold text-slate-200">{runnerTeam.name}</span>
              </div>
              <span className="text-slate-500 text-xs">Gran campaña y finalistas del torneo</span>
            </div>
          )}
        </div>

        {/* BOTONES INTERACTIVOS: VER ZONAS, LLAVES Y DEMÁS JUGADAS */}
        <div className="w-full max-w-2xl pt-2">
          <p className="text-xs text-slate-400 font-semibold mb-3">
            Explorá todas las fases y partidos del torneo:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => scrollTo('zonas-section')}
              className="flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-2xl border border-slate-700/60 shadow-md transition-all active:scale-95 text-xs md:text-sm"
            >
              <LayoutGrid className="w-4 h-4 text-emerald-400" />
              <span>Ver Zonas</span>
            </button>

            <button
              onClick={() => scrollTo('cuadro-section')}
              className="flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-2xl border border-slate-700/60 shadow-md transition-all active:scale-95 text-xs md:text-sm"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Ver Cuadro</span>
            </button>

            <button
              onClick={() => scrollTo('partidos-section')}
              className="flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-2xl border border-slate-700/60 shadow-md transition-all active:scale-95 text-xs md:text-sm"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Todos los Partidos</span>
            </button>
          </div>

          <div className="flex justify-center mt-4">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-4 py-2 rounded-xl transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Texto y enlace copiado!' : 'Compartir Cuadro de Campeones'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
