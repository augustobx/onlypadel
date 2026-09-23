import { prisma } from "@/lib/prisma";
import { hasTenantFeature } from "@/lib/features";
import { getUserSession } from "@/actions/user-auth";
import { redirect } from "next/navigation";
import CommunityNav from "@/components/community/CommunityNav";
import { getSettings } from "@/actions/settings";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">🏓</span>
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Comunidad
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {session.name} {session.lastName}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {(session.name || "?")[0].toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom navigation */}
      <CommunityNav />
    </div>
  );
}
