import { prisma } from "@/lib/prisma";
import { hasTenantFeature } from "@/lib/features";
import { getUserSession } from "@/actions/user-auth";
import { redirect } from "next/navigation";
import CommunityNav from "@/components/community/CommunityNav";
import { getSettings } from "@/actions/settings";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getThemeColors, getReadableForeground } from "@/lib/color";

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sysSettings = await getSettings();

  if (!sysSettings?.communityEnabled) {
    redirect("/");
  }

  // Require authenticated user
  const session = await getUserSession();
  if (!session) {
    redirect("/login-usuario?redirect=/comunidad");
  }

  let unreadNotificationsCount = 0;
  try {
    unreadNotificationsCount = await prisma.communityNotification.count({
      where: { userId: session.id, isRead: false },
    });
  } catch (e) {
    // Non-critical count
  }

  const theme = sysSettings?.theme || 'light';
  const themeData = getThemeColors(theme, sysSettings?.primaryColor, sysSettings?.secondaryColor);
  const themeClass = themeData.themeClass;
  const primaryColor = themeData.primary;
  const secondaryColor = themeData.secondary;

  return (
    <div
      data-theme={themeData.themeName}
      className={`${themeClass} min-h-screen bg-[var(--background,#f8fafc)] text-[var(--foreground,#0f172a)] flex flex-col transition-colors duration-300`}
      style={{
        '--color-primary': primaryColor,
        '--color-primary-foreground': getReadableForeground(primaryColor),
        '--color-secondary': secondaryColor,
        '--color-secondary-foreground': getReadableForeground(secondaryColor),
      } as React.CSSProperties}
    >
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-[var(--card)]/90 backdrop-blur-xl border-b border-[var(--border)] shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/15 hover:bg-[var(--color-primary)]/25 text-[var(--color-primary)] border border-[var(--color-primary)]/30 font-black text-xs transition-all active:scale-95 shadow-sm group"
              title="Volver a la sección de reservas de canchas"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--color-primary)] group-hover:-translate-x-0.5 transition-transform" />
              <span>Sacar Turno</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <Link href="/comunidad" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-lg">🏓</span>
              <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent font-black text-sm sm:text-base tracking-tight">
                Comunidad
              </span>
            </Link>
          </div>

          <Link
            href="/perfil"
            className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-[var(--muted)]/60 transition-colors"
            title="Ver mi perfil"
          >
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline">
              {session.name}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-[var(--color-primary)]/25">
              {(session.name || "?")[0].toUpperCase()}
            </div>
          </Link>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <CommunityNav unreadNotifications={unreadNotificationsCount} />
    </div>
  );
}
