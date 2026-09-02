'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, BarChart3, CalendarSearch, Trophy, User } from 'lucide-react';

type PublicNavbarSettings = {
  topbarName?: string | null;
  sportEmoji?: string | null;
  clubLogo?: string | null;
  splashLogo?: string | null;
  tournamentsEnabled?: boolean;
  rankingsEnabled?: boolean;
  usersModuleEnabled?: boolean;
  playerCategoriesEnabled?: boolean;
};

export default function PublicNavbar({ sysSettings }: { sysSettings?: PublicNavbarSettings | null }) {
  const topbarTitle = sysSettings?.topbarName || "OnlyPadel";
  const logo = sysSettings?.clubLogo || sysSettings?.splashLogo || "";
  const hasLogoImage = /^(https?:\/\/|\/|data:image\/)/i.test(logo);

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 md:rounded-t-[2.5rem] relative z-20">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              {hasLogoImage ? (
                <Image src={logo} alt={topbarTitle} width={30} height={30} unoptimized className="w-7 h-7 object-contain rounded-lg p-0.5 group-hover:scale-105 transition-transform" />
              ) : (
                <span className="text-xl group-hover:scale-110 transition-transform">{sysSettings?.sportEmoji || "🎾"}</span>
              )}
              <span className="font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                {topbarTitle}
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {sysSettings?.playerCategoriesEnabled !== false && <Link
              href="/categorias-jugadores"
              className="flex items-center gap-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-3 py-1.5 text-xs sm:text-sm font-bold text-sky-800 dark:text-sky-300 transition-all hover:bg-sky-100 dark:hover:bg-sky-900/60 active:scale-95"
            >
              <BadgeCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="hidden md:inline">Categorías</span>
            </Link>}
            {sysSettings?.rankingsEnabled !== false && (
              <Link
                href="/ranking"
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95"
              >
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Ranking</span>
              </Link>
            )}
            {sysSettings?.tournamentsEnabled && (
              <Link
                href="/torneos"
                className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 transition-all hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95"
              >
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Torneos</span>
              </Link>
            )}
            {sysSettings?.usersModuleEnabled && (
              <Link
                href="/perfil"
                className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-3 py-1.5 text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-95"
              >
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Perfil</span>
              </Link>
            )}
            <Link
              href="/mis-turnos"
              className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
            >
              <CalendarSearch className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">Buscar</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
