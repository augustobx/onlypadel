'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Trophy, Flame, AlertTriangle, Sparkles, Hand, ArrowRight, X, ExternalLink } from 'lucide-react';

export interface ClubAnnouncementProps {
  active?: boolean;
  badge?: string | null;
  title?: string | null;
  text?: string | null;
  link?: string | null;
  linkText?: string | null;
  variant?: 'theme' | 'amber' | 'emerald' | 'blue' | 'purple' | string | null;
  className?: string;
  isSimulator?: boolean;
}

export default function ClubAnnouncementBoard({
  active = true,
  badge = 'COMUNICADO',
  title = '',
  text = '',
  link = '',
  linkText = 'Ver más',
  variant = 'theme',
  className = '',
  isSimulator = false,
}: ClubAnnouncementProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Generar clave única para recordar descarte en sesión
  const storageKey = `dismissed_announcement_${(title || text || 'default').slice(0, 30)}`;

  useEffect(() => {
    if (isSimulator) return;
    try {
      if (sessionStorage.getItem(storageKey) === 'true') {
        setIsDismissed(true);
      }
    } catch {}
  }, [storageKey, isSimulator]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (!isSimulator) {
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch {}
    }
  };

  if (!active || (isDismissed && !isSimulator)) return null;
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

  // Clases según la variante
  const getVariantStyles = () => {
    switch (variant) {
      case 'amber':
        return {
          wrapper: 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30 text-amber-950 dark:text-amber-100 shadow-amber-500/5',
          badge: 'bg-amber-500 text-slate-950 font-black',
          button: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20',
          title: 'text-amber-900 dark:text-amber-200',
          close: 'hover:bg-amber-500/20 text-amber-700 dark:text-amber-300'
        };
      case 'emerald':
        return {
          wrapper: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-emerald-500/5',
          badge: 'bg-emerald-500 text-slate-950 font-black',
          button: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20',
          title: 'text-emerald-900 dark:text-emerald-200',
          close: 'hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
        };
      case 'blue':
        return {
          wrapper: 'bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent border-sky-500/30 text-sky-950 dark:text-sky-100 shadow-sky-500/5',
          badge: 'bg-sky-500 text-slate-950 font-black',
          button: 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20',
          title: 'text-sky-900 dark:text-sky-200',
          close: 'hover:bg-sky-500/20 text-sky-700 dark:text-sky-300'
        };
      case 'purple':
        return {
          wrapper: 'bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent border-purple-500/30 text-purple-950 dark:text-purple-100 shadow-purple-500/5',
          badge: 'bg-purple-500 text-white font-black',
          button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/20',
          title: 'text-purple-900 dark:text-purple-200',
          close: 'hover:bg-purple-500/20 text-purple-700 dark:text-purple-300'
        };
      case 'theme':
      default:
        return {
          wrapper: 'bg-[var(--card,#ffffff)]/90 dark:bg-[var(--card,#0f172a)]/95 border-[var(--color-primary)]/30 text-[var(--foreground,#0f172a)] shadow-lg shadow-[var(--color-primary)]/10 backdrop-blur-md',
          badge: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-black',
          button: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-md shadow-[var(--color-primary)]/25 hover:brightness-105',
          title: 'text-[var(--foreground,#0f172a)]',
          close: 'hover:bg-[var(--color-primary)]/15 text-slate-400 hover:text-[var(--color-primary)]'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <aside aria-label="Tablón de anuncios del club" className={`relative rounded-2xl md:rounded-3xl border p-4 sm:p-5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${styles.wrapper} ${className}`}>
      
      {/* Botón de descartar */}
      {!isSimulator && (
        <button
          type="button"
          onClick={handleDismiss}
          className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${styles.close}`}
          aria-label="Cerrar anuncio"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Cabecera con Badge */}
      <div className="flex items-center gap-2 mb-2 pr-6">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${styles.badge}`}>
          {getBadgeIcon()}
          <span>{badge || 'COMUNICADO'}</span>
        </span>
      </div>

      {/* Contenido */}
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

      {/* Botón de Acción Opcional */}
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
