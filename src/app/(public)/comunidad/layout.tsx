import { prisma } from "@/lib/prisma";
import { hasTenantFeature } from "@/lib/features";
import { getUserSession } from "@/actions/user-auth";
import { redirect } from "next/navigation";
import CommunityNav from "@/components/community/CommunityNav";
import { getSettings } from "@/actions/settings";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-black text-xs transition-all active:scale-95 shadow-sm group"
              title="Volver a la sección de reservas de canchas"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Sacar Turno</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <Link href="/comunidad" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-lg">🏓</span>
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent font-black text-sm sm:text-base tracking-tight">
                Comunidad
              </span>
            </Link>
          </div>

          <Link
            href="/perfil"
            className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Ver mi perfil"
          >
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline">
              {session.name}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-violet-500/20">
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
