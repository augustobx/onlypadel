'use client';

import { useState, useEffect, useRef } from 'react';
import { Megaphone, Trophy, Flame, AlertTriangle, Sparkles, Hand, ArrowRight, X, ExternalLink, Timer, RotateCcw } from 'lucide-react';

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

  // Storage key para no cansar al usuario en la misma sesión de reserva
  const storageKey = `dismissed_announcement_${(title || text || 'default').slice(0, 30)}`;

  useEffect(() => {
    if (isSimulator) return;
    try {
      if (sessionStorage.getItem(storageKey) === 'true') {
        setIsVisible(false);
      }
    } catch {}
  }, [storageKey, isSimulator]);

  // Contador regresivo para cierre automático (en modo flotante)
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
          <p className="text-xs text-slate-400 font-medium">El tablón flotante se cerró automáticamente.</p>
          <button
            type="button"
            onClick={handleResetSimulator}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold shadow-md hover:brightness-105 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar animación y contador ({initialSeconds}s)
          </button>
        </div>
      );
    }
    return null;
  }

  if (!title && !text) return null;

  // Icono según la categoría
  const normalizedBadge = (badge || 'COMUNICADO').toUpperCase();
  const getBadgeIcon = () => {
    if (normalizedBadge.includes('TORNEO') || normalizedBadge.includes('CAMPEONATO')) {
      return <Trophy className="w-3.5 h-3.5" />;
    }
    if (normalizedBadge.includes('PROMO') || normalizedBadge.includes('OFERTA') || normalizedBadge.includes('DESCUENTO')) {
      return <Flame className="w-3.5 h-3.5" />;
    }
    if (normalizedBadge.includes('AVISO') || normalizedBadge.includes('ATENCION') || normalizedBadge.includes('IMPORTANTE')) {
      return <AlertTriangle className="w-3.5 h-3.5" />;
    }
    if (normalizedBadge.includes('BIENVENID') || normalizedBadge.includes('HOLA')) {
      return <Hand className="w-3.5 h-3.5" />;
    }
    if (normalizedBadge.includes('NOVEDAD') || normalizedBadge.includes('NUEVO')) {
      return <Sparkles className="w-3.5 h-3.5" />;
    }
    return <Megaphone className="w-3.5 h-3.5" />;
  };

  // Clases según la variante visual seleccionada
  const getVariantStyles = () => {
    switch (variant) {
      case 'amber':
        return {
          wrapper: 'bg-slate-950/90 border-amber-500/40 text-amber-100 shadow-[0_0_50px_rgba(245,158,11,0.25)]',
          badge: 'bg-amber-500 text-slate-950 font-black',
          button: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25',
          title: 'text-amber-300',
          close: 'hover:bg-amber-500/20 text-amber-400',
          progress: 'bg-amber-500',
          timerBadge: 'bg-amber-500/20 border-amber-500/30 text-amber-300'
        };
      case 'emerald':
        return {
          wrapper: 'bg-slate-950/90 border-emerald-500/40 text-emerald-100 shadow-[0_0_50px_rgba(16,185,129,0.25)]',
          badge: 'bg-emerald-500 text-slate-950 font-black',
          button: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25',
          title: 'text-emerald-300',
          close: 'hover:bg-emerald-500/20 text-emerald-400',
          progress: 'bg-emerald-500',
          timerBadge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
        };
      case 'blue':
        return {
          wrapper: 'bg-slate-950/90 border-sky-500/40 text-sky-100 shadow-[0_0_50px_rgba(14,165,233,0.25)]',
          badge: 'bg-sky-500 text-slate-950 font-black',
          button: 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/25',
          title: 'text-sky-300',
          close: 'hover:bg-sky-500/20 text-sky-400',
          progress: 'bg-sky-500',
          timerBadge: 'bg-sky-500/20 border-sky-500/30 text-sky-300'
        };
      case 'purple':
        return {
          wrapper: 'bg-slate-950/90 border-purple-500/40 text-purple-100 shadow-[0_0_50px_rgba(168,85,247,0.25)]',
          badge: 'bg-purple-500 text-white font-black',
          button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25',
          title: 'text-purple-300',
          close: 'hover:bg-purple-500/20 text-purple-400',
          progress: 'bg-purple-500',
          timerBadge: 'bg-purple-500/20 border-purple-500/30 text-purple-300'
        };
      case 'theme':
      default:
        return {
          wrapper: 'bg-[var(--card,#0f172a)]/95 border-[var(--color-primary)]/40 text-[var(--foreground,#ffffff)] shadow-[0_0_50px_var(--color-primary,rgba(16,185,129,0.2))]',
          badge: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-black',
          button: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg shadow-[var(--color-primary)]/25 hover:brightness-105',
          title: 'text-[var(--foreground,#ffffff)]',
          close: 'hover:bg-[var(--color-primary)]/15 text-slate-400 hover:text-[var(--color-primary)]',
          progress: 'bg-[var(--color-primary)]',
          timerBadge: 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/25 text-[var(--color-primary)]'
        };
    }
  };

  const styles = getVariantStyles();
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / initialSeconds) * 100));

  // --- MODO FLOTANTE POST-SPLASH ---
  if (mode === 'floating') {
    return (
      <div 
        className={`${isSimulator ? 'relative w-full' : 'fixed inset-0 z-[100]'} flex items-center justify-center p-4 ${!isSimulator ? 'bg-black/65 backdrop-blur-md animate-in fade-in duration-300' : ''}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Tablón de anuncios del club"
          className={`relative w-full max-w-md rounded-[2.2rem] p-6 sm:p-7 border backdrop-blur-2xl transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-6 ${styles.wrapper} ${className}`}
        >
          {/* Header con Badge, Contador y Botón X */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] uppercase tracking-wider ${styles.badge}`}>
              {getBadgeIcon()}
              <span>{badge || 'COMUNICADO'}</span>
            </span>

            <div className="flex items-center gap-2">
              {/* Contador regresivo si está activado */}
              {autoClose && (
                <span 
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${styles.timerBadge}`}
                  title={isPaused ? 'Pausado (cursor encima)' : `Cierra en ${timeLeft}s`}
                >
                  <Timer className="w-3 h-3 animate-pulse" />
                  <span>{isPaused ? 'Pausado' : `${timeLeft}s`}</span>
                </span>
              )}

              {/* Botón X de cerrar */}
              <button
                type="button"
                onClick={handleClose}
                className={`p-1.5 rounded-full transition-colors ${styles.close}`}
                aria-label="Cerrar anuncio"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenido del Anuncio */}
          <div className="space-y-2 mb-6">
            {title && (
              <h2 className={`font-black text-lg sm:text-xl leading-snug tracking-tight ${styles.title}`}>
                {title}
              </h2>
            )}
            {text && (
              <p className="text-xs sm:text-sm leading-relaxed opacity-90 font-medium whitespace-pre-line">
                {text}
              </p>
            )}
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center gap-3 pt-2">
            {link && (
              <a
                href={link}
                target={link.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                onClick={handleClose}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 ${styles.button}`}
              >
                <span>{linkText || 'Ver más'}</span>
                {link.startsWith('http') ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </a>
            )}

            <button
              type="button"
              onClick={handleClose}
              className={`inline-flex items-center justify-center px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border border-white/10 hover:bg-white/10 text-slate-300 transition-all active:scale-95 ${!link ? 'w-full' : ''}`}
            >
              Cerrar {autoClose && timeLeft > 0 && !isPaused ? `(${timeLeft}s)` : ''}
            </button>
          </div>

          {/* Barra de progreso de cierre automático en el borde inferior */}
          {autoClose && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/10 overflow-hidden rounded-b-[2.2rem]">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${styles.progress}`}
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
      className={`relative rounded-2xl md:rounded-3xl border p-4 sm:p-5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${styles.wrapper} ${className}`}
    >
      {!isSimulator && (
        <button
          type="button"
          onClick={handleClose}
          className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${styles.close}`}
          aria-label="Cerrar anuncio"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center gap-2 mb-2 pr-6">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${styles.badge}`}>
          {getBadgeIcon()}
          <span>{badge || 'COMUNICADO'}</span>
        </span>
      </div>

      <div className="space-y-1.5">
        {title && (
          <h3 className={`font-black text-sm sm:text-base leading-tight ${styles.title}`}>
            {title}
          </h3>
        )}
        {text && (
          <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-medium whitespace-pre-line">
            {text}
          </p>
        )}
      </div>

      {link && (
        <div className="pt-3 flex items-center justify-start">
          <a
            href={link}
            target={link.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${styles.button}`}
          >
            <span>{linkText || 'Ver más'}</span>
            {link.startsWith('http') ? <ExternalLink className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </a>
        </div>
      )}
    </aside>
  );
}
