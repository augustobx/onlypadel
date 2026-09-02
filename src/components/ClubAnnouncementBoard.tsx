'use client';

import { useState, useEffect } from 'react';
import { 
  Megaphone, Trophy, Flame, AlertTriangle, Sparkles, Hand, 
  ArrowRight, X, ExternalLink, Timer, RotateCcw, CheckCircle2, ChevronRight
} from 'lucide-react';

export interface ClubAnnouncementProps {
  active?: boolean;
  badge?: string | null;
  title?: string | null;
  text?: string | null;
  link?: string | null;
  linkText?: string | null;
  variant?: 'theme' | 'amber' | 'emerald' | 'blue' | 'purple' | string | null;
  mode?: 'floating' | 'inline';
  duration?: number; // en segundos (ej: 5)
  autoClose?: boolean;
  className?: string;
  isSimulator?: boolean;
  onClose?: () => void;
}

export default function ClubAnnouncementBoard({
  active = true,
  badge = 'COMUNICADO',
  title = '',
  text = '',
  link = '',
  linkText = 'Ver más',
  variant = 'theme',
  mode = 'floating',
  duration = 5,
  autoClose = true,
  className = '',
  isSimulator = false,
  onClose,
}: ClubAnnouncementProps) {
  const initialSeconds = Math.max(1, duration || 5);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Storage key para recordar descarte en sesión
  const storageKey = `dismissed_announcement_${(title || text || 'default').slice(0, 30)}`;

  useEffect(() => {
    if (isSimulator) return;
    try {
      if (sessionStorage.getItem(storageKey) === 'true') {
        setIsVisible(false);
      }
    } catch {}
  }, [storageKey, isSimulator]);

  // Contador regresivo
  useEffect(() => {
    if (!isVisible || !active) return;
    if (mode !== 'floating' || !autoClose || isPaused) return;

    if (timeLeft <= 0) {
      handleClose();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, active, mode, autoClose, isPaused, timeLeft]);

  const handleClose = () => {
    setIsVisible(false);
    if (!isSimulator) {
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch {}
    }
    if (onClose) onClose();
  };

  const handleResetSimulator = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeLeft(initialSeconds);
    setIsVisible(true);
    setIsPaused(false);
  };

  if (!active || !isVisible) {
    if (isSimulator) {
      return (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-700 rounded-3xl bg-slate-900/50 text-center space-y-3">
          <p className="text-xs text-slate-400 font-medium">El tablón se cerró automáticamente.</p>
          <button
            type="button"
            onClick={handleResetSimulator}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold shadow-md hover:brightness-105 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar simulación ({initialSeconds}s)
          </button>
        </div>
      );
    }
    return null;
  }

  if (!title && !text) return null;

  // Icono y visuales según la categoría
  const normalizedBadge = (badge || 'COMUNICADO').toUpperCase();
  const getCategoryDetails = () => {
    if (normalizedBadge.includes('TORNEO') || normalizedBadge.includes('CAMPEONATO')) {
      return {
        icon: <Trophy className="w-4 h-4 text-amber-400" />,
        headerBg: 'from-amber-500/20 via-orange-500/10 to-transparent',
        accentBorder: 'border-amber-500/40',
        badgeBg: 'bg-amber-500 text-slate-950 font-black',
        glow: 'shadow-[0_0_40px_rgba(245,158,11,0.25)]'
      };
    }
    if (normalizedBadge.includes('PROMO') || normalizedBadge.includes('OFERTA') || normalizedBadge.includes('DESCUENTO')) {
      return {
        icon: <Flame className="w-4 h-4 text-orange-400" />,
        headerBg: 'from-orange-500/20 via-rose-500/10 to-transparent',
        accentBorder: 'border-orange-500/40',
        badgeBg: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black',
        glow: 'shadow-[0_0_40px_rgba(249,115,22,0.25)]'
      };
    }
    if (normalizedBadge.includes('AVISO') || normalizedBadge.includes('ATENCION') || normalizedBadge.includes('IMPORTANTE')) {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        headerBg: 'from-amber-500/20 via-yellow-500/10 to-transparent',
        accentBorder: 'border-amber-500/40',
        badgeBg: 'bg-amber-400 text-slate-950 font-black',
        glow: 'shadow-[0_0_40px_rgba(251,191,36,0.25)]'
      };
    }
    if (normalizedBadge.includes('BIENVENID') || normalizedBadge.includes('HOLA')) {
      return {
        icon: <Hand className="w-4 h-4 text-emerald-400" />,
        headerBg: 'from-emerald-500/20 via-cyan-500/10 to-transparent',
        accentBorder: 'border-emerald-500/40',
        badgeBg: 'bg-emerald-500 text-slate-950 font-black',
        glow: 'shadow-[0_0_40px_rgba(16,185,129,0.25)]'
      };
    }
    if (normalizedBadge.includes('NOVEDAD') || normalizedBadge.includes('NUEVO')) {
      return {
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        headerBg: 'from-cyan-500/20 via-blue-500/10 to-transparent',
        accentBorder: 'border-cyan-500/40',
        badgeBg: 'bg-cyan-500 text-slate-950 font-black',
        glow: 'shadow-[0_0_40px_rgba(6,182,212,0.25)]'
      };
    }
    return {
      icon: <Megaphone className="w-4 h-4 text-[var(--color-primary)]" />,
      headerBg: 'from-[var(--color-primary)]/20 via-[var(--color-primary)]/5 to-transparent',
      accentBorder: 'border-[var(--color-primary)]/40',
      badgeBg: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-black',
      glow: 'shadow-[0_0_40px_var(--color-primary,rgba(16,185,129,0.25))]'
    };
  };

  const cat = getCategoryDetails();
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / initialSeconds) * 100));

  // Formateador de texto enriquecido (divide viñetas o párrafos)
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const isBulletList = lines.length > 1 && lines.some(l => l.startsWith('-') || l.startsWith('•') || l.startsWith('*'));

  // --- MODO FLOTANTE POST-SPLASH (BILLBOARD SPORTS PRO) ---
  if (mode === 'floating') {
    return (
      <div 
        className={`${isSimulator ? 'relative w-full' : 'fixed inset-0 z-[100]'} flex items-center justify-center p-3 sm:p-5 ${!isSimulator ? 'bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300' : ''}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Tablón de anuncios del club"
          className={`relative w-full max-w-lg rounded-3xl overflow-hidden border bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-[#06090e]/98 text-white backdrop-blur-2xl transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-6 ${cat.accentBorder} ${cat.glow} ${className}`}
        >
          {/* Top Banner Marquee / Mesh Glow */}
          <div className={`px-5 py-4 bg-gradient-to-r ${cat.headerBg} border-b border-white/10 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md shadow-inner flex items-center justify-center">
                {cat.icon}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${cat.badgeBg} shadow-sm`}>
                <span>{badge || 'COMUNICADO'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Temporizador deportivo */}
              {autoClose && (
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/10 border border-white/15 text-slate-200 shadow-sm"
                  title={isPaused ? 'Lectura pausada' : `Cierra en ${timeLeft} segundos`}
                >
                  <Timer className="w-3.5 h-3.5 text-[var(--color-primary)] animate-pulse" />
                  <span>{isPaused ? 'Pausado' : `${timeLeft}s`}</span>
                </div>
              )}

              {/* Botón X con anillo glassmorphism */}
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
                aria-label="Cerrar anuncio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo Billboard */}
          <div className="p-6 sm:p-7 space-y-4">
            {/* Título Principal */}
            {title && (
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug drop-shadow">
                {title}
              </h2>
            )}

            {/* Contenido formateado en tarjeta de lectura */}
            {text && (
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                {isBulletList ? (
                  <ul className="space-y-2">
                    {lines.map((line, idx) => {
                      const clean = line.replace(/^[-•*]\s*/, '');
                      return (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-[var(--color-primary)] font-black text-sm mt-0.5">✦</span>
                          <span>{clean}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="whitespace-pre-line leading-relaxed">
                    {text}
                  </p>
                )}
              </div>
            )}

            {/* Acciones principales */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {link && (
                <a
                  href={link}
                  target={link.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={handleClose}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--color-primary)] hover:brightness-110 text-[var(--color-primary-foreground)] font-black text-sm shadow-xl shadow-[var(--color-primary)]/25 transition-all active:scale-95"
                >
                  <span>{linkText || 'Ver más'}</span>
                  {link.startsWith('http') ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </a>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 font-bold text-xs sm:text-sm transition-all active:scale-95"
              >
                Continuar a turnos {autoClose && timeLeft > 0 && !isPaused ? `(${timeLeft}s)` : ''}
              </button>
            </div>
          </div>

          {/* Barra de progreso de cierre */}
          {autoClose && (
            <div className="w-full h-1 bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-[var(--color-primary)] transition-all duration-1000 ease-linear shadow-[0_0_10px_var(--color-primary)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MODO INLINE (en feed) ---
  return (
    <aside 
      aria-label="Tablón de anuncios del club" 
      className={`relative rounded-3xl border p-5 bg-slate-900/95 text-white shadow-xl ${cat.accentBorder} ${className}`}
    >
      {!isSimulator && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-white"
          aria-label="Cerrar anuncio"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center gap-2 mb-2 pr-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${cat.badgeBg}`}>
          {cat.icon}
          <span>{badge || 'COMUNICADO'}</span>
        </span>
      </div>

      {title && (
        <h3 className="font-black text-base leading-tight text-white mb-2">
          {title}
        </h3>
      )}

      <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
        <p className="whitespace-pre-line">{text}</p>
      </div>

      {link && (
        <div className="pt-3">
          <a
            href={link}
            target={link.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold"
          >
            <span>{linkText || 'Ver más'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </aside>
  );
}
