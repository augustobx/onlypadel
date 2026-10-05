'use client';

import { useState, useEffect } from 'react';
import { 
  Megaphone, Trophy, Flame, AlertTriangle, Sparkles, Hand, 
  ArrowRight, X, ExternalLink, Timer, RotateCcw, ChevronRight
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
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-700/60 rounded-3xl bg-[var(--card)]/40 text-center space-y-3">
          <p className="text-xs text-[var(--muted-foreground)] font-medium">El tablón se cerró automáticamente.</p>
          <button
            type="button"
            onClick={handleResetSimulator}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-black shadow-md hover:brightness-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar vista previa ({initialSeconds}s)
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
        icon: <Trophy className="w-4 h-4 text-amber-500" />,
        badgeLabel: badge || 'TORNEO',
      };
    }
    if (normalizedBadge.includes('PROMO') || normalizedBadge.includes('OFERTA') || normalizedBadge.includes('DESCUENTO')) {
      return {
        icon: <Flame className="w-4 h-4 text-orange-500" />,
        badgeLabel: badge || 'PROMO',
      };
    }
    if (normalizedBadge.includes('AVISO') || normalizedBadge.includes('ATENCION') || normalizedBadge.includes('IMPORTANTE')) {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        badgeLabel: badge || 'AVISO',
      };
    }
    if (normalizedBadge.includes('BIENVENID') || normalizedBadge.includes('HOLA')) {
      return {
        icon: <Hand className="w-4 h-4 text-[var(--color-primary)]" />,
        badgeLabel: badge || 'BIENVENIDA',
      };
    }
    if (normalizedBadge.includes('NOVEDAD') || normalizedBadge.includes('NUEVO')) {
      return {
        icon: <Sparkles className="w-4 h-4 text-[var(--color-secondary,#00e5ff)]" />,
        badgeLabel: badge || 'NOVEDAD',
      };
    }
    return {
      icon: <Megaphone className="w-4 h-4 text-[var(--color-primary)]" />,
      badgeLabel: badge || 'COMUNICADO',
    };
  };

  const cat = getCategoryDetails();
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / initialSeconds) * 100));

  // Formateador de texto enriquecido (divide viñetas o párrafos)
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const isBulletList = lines.length > 1 && lines.some(l => l.startsWith('-') || l.startsWith('•') || l.startsWith('*'));

  // --- MODO FLOTANTE POST-SPLASH (HIGH-END MODERN GLASS CARD) ---
  if (mode === 'floating') {
    return (
      <div 
        className={`${isSimulator ? 'relative w-full' : 'fixed inset-0 z-[100]'} flex items-center justify-center p-3.5 sm:p-6 ${!isSimulator ? 'bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300' : ''}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Tablón de novedades del club"
          className={`relative w-full max-w-lg rounded-[28px] overflow-hidden border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-2xl backdrop-blur-2xl transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-5 ${className}`}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 30px -5px var(--color-primary, #10b981)1a',
          }}
        >
          {/* Top Header con diseño sutil y coherente al tema */}
          <div className="px-5 py-4 bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-secondary,#00e5ff)]/5 to-transparent border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/20 shadow-xs flex items-center justify-center">
                {cat.icon}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/25">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-primary)]"></span>
                </span>
                <span>{cat.badgeLabel}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Temporizador deportivo */}
              {autoClose && (
                <div 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[var(--muted)]/80 border border-[var(--border)] text-[var(--foreground)] shadow-xs"
                  title={isPaused ? 'Lectura pausada al pasar el cursor' : `Cierra en ${timeLeft} segundos`}
                >
                  <Timer className="w-3.5 h-3.5 text-[var(--color-primary)] animate-pulse" />
                  <span>{isPaused ? 'Pausado' : `${timeLeft}s`}</span>
                </div>
              )}

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-[var(--muted)] hover:bg-[var(--border)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all active:scale-95"
                aria-label="Cerrar anuncio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo del Tablón */}
          <div className="p-6 sm:p-7 space-y-4">
            {/* Título Principal */}
            {title && (
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)] leading-snug">
                {title}
              </h2>
            )}

            {/* Contenido formateado con los colores del theme */}
            {text && (
              <div className="rounded-2xl bg-[var(--muted)]/40 border border-[var(--border)]/70 p-4 sm:p-5 text-[var(--foreground)]/90 text-xs sm:text-sm leading-relaxed font-medium">
                {isBulletList ? (
                  <ul className="space-y-2.5">
                    {lines.map((line, idx) => {
                      const clean = line.replace(/^[-•*]\s*/, '');
                      return (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-[var(--color-primary)] font-black text-sm mt-0.5 shrink-0">✦</span>
                          <span className="text-[var(--foreground)]/90">{clean}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="whitespace-pre-line leading-relaxed text-[var(--foreground)]/90">
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
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--color-primary)] hover:brightness-105 text-[var(--color-primary-foreground)] font-black text-sm shadow-xl shadow-[var(--color-primary)]/20 transition-all active:scale-95"
                >
                  <span>{linkText || 'Ver más'}</span>
                  {link.startsWith('http') ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </a>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center px-5 py-3.5 rounded-2xl bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] font-bold text-xs sm:text-sm transition-all active:scale-95"
              >
                Continuar a turnos {autoClose && timeLeft > 0 && !isPaused ? `(${timeLeft}s)` : ''}
              </button>
            </div>
          </div>

          {/* Barra de progreso de cierre */}
          {autoClose && (
            <div className="w-full h-1 bg-[var(--border)]/40 overflow-hidden">
              <div 
                className="h-full bg-[var(--color-primary)] transition-all duration-1000 ease-linear shadow-[0_0_8px_var(--color-primary)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MODO INLINE (en feed o embebido) ---
  return (
    <aside 
      aria-label="Tablón de anuncios del club" 
      className={`relative rounded-3xl border border-[var(--border)] p-5 bg-[var(--card)] text-[var(--card-foreground)] shadow-lg backdrop-blur-xl ${className}`}
    >
      {!isSimulator && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--muted)]/50 hover:bg-[var(--muted)] transition-all"
          aria-label="Cerrar anuncio"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center gap-2 mb-2 pr-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/25">
          {cat.icon}
          <span>{cat.badgeLabel}</span>
        </span>
      </div>

      {title && (
        <h3 className="font-black text-base leading-tight text-[var(--foreground)] mb-2">
          {title}
        </h3>
      )}

      <div className="text-xs sm:text-sm text-[var(--foreground)]/80 leading-relaxed font-medium">
        <p className="whitespace-pre-line">{text}</p>
      </div>

      {link && (
        <div className="pt-3">
          <a
            href={link}
            target={link.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-black shadow-md hover:brightness-105 transition-all"
          >
            <span>{linkText || 'Ver más'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </aside>
  );
}
