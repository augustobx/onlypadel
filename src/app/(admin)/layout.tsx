import AdminSidebar from "@/components/AdminSidebar";
import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getReadableForeground, normalizeHexColor } from "@/lib/color";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  const primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
  const secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');

  return (
    <div
      className={`${settings?.theme === 'dark' ? 'dark' : ''} flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950`}
      style={{
        '--color-primary': primaryColor,
        '--color-primary-foreground': getReadableForeground(primaryColor),
        '--color-secondary': secondaryColor,
        '--color-secondary-foreground': getReadableForeground(secondaryColor),
      } as React.CSSProperties}
    >
      {/* El Sidebar maneja su propia lógica responsiva (Menu hamburguesa en mobile) */}
      <AdminSidebar />

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col min-h-0 md:h-screen md:overflow-hidden">
        {/* 
          overflow-y-auto permite que esta sección scrollee independientemente del sidebar en PC.
          w-full asegura que no se desborde horizontalmente en celulares.
        */}
        <div className="flex-1 overflow-visible md:overflow-y-auto p-4 md:p-8 w-full max-w-[100vw]">
          {children}
        </div>
      </main>
    </div>
  );
}
