import AdminSidebar from "@/components/AdminSidebar";
import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getReadableForeground, normalizeHexColor } from "@/lib/color";
import { FEATURE_KEYS, hasTenantFeature } from "@/lib/features";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  
  const [settings, logoSetting] = await Promise.all([
    prisma.systemSetting.findFirst({ where: { id: 1 } }),
    prisma.setting.findFirst({ where: { key: 'club_logo' } })
  ]);

  const featureStates = await Promise.all(FEATURE_KEYS.map(async key => [key, await hasTenantFeature(key)] as const));
  const enabledFeatures = featureStates.filter(([, enabled]) => enabled).map(([key]) => key);
  
  const theme = settings?.theme || 'light';
  const themeClass = theme === 'cyber-padel'
    ? 'dark theme-cyber-padel'
    : theme === 'sunset-clay'
    ? 'dark theme-sunset-clay'
    : theme === 'ocean-frost'
    ? 'dark theme-ocean-frost'
    : theme === 'dark'
    ? 'dark'
    : '';

  const primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
  const secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');
  const clubLogo = logoSetting?.value || settings?.splashLogo || '';
  const clubName = settings?.topbarName || settings?.clubName || 'OnlyPadel';
  const sportEmoji = settings?.sportEmoji || '🎾';

  return (
    <div
      className={`${themeClass} flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950`}
      style={{
        '--color-primary': primaryColor,
        '--color-primary-foreground': getReadableForeground(primaryColor),
        '--color-secondary': secondaryColor,
        '--color-secondary-foreground': getReadableForeground(secondaryColor),
      } as React.CSSProperties}
    >
      <AdminSidebar 
        enabledFeatures={enabledFeatures} 
        clubName={clubName}
        clubLogo={clubLogo}
        sportEmoji={sportEmoji}
      />

      <main className="flex-1 flex flex-col min-h-0 md:h-screen md:overflow-hidden">
        <div className="flex-1 overflow-visible md:overflow-y-auto p-4 md:p-8 w-full max-w-[100vw]">
          {children}
        </div>
      </main>
    </div>
  );
}
