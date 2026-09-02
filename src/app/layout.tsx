export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import '@/app/globals.css';
import ConnectivityStatus from '@/components/ConnectivityStatus';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OnlyPadel - Gestión integral de clubes",
  description: "Plataforma SaaS para reservas, socios, canchas, rankings y torneos de pádel.",
  manifest: "/manifest.json",
};

import { prisma } from '@/lib/prisma';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeClass = '';
  let themeName = 'light';
  try {
    const settings = await prisma.systemSetting.findFirst({ where: { id: 1 }, select: { theme: true } });
    if (settings?.theme) {
      themeName = settings.theme;
      if (['cyber-padel', 'sunset-clay', 'ocean-frost'].includes(settings.theme)) {
        themeClass = `dark theme-${settings.theme}`;
      } else if (settings.theme === 'dark') {
        themeClass = 'dark';
      }
    }
  } catch {}

  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-theme={themeName}
      className={`${geistSans.variable} ${geistMono.variable} ${themeClass} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background,#f8fafc)] text-[var(--foreground,#0f172a)]">
        <ConnectivityStatus />
        {children}
      </body>
    </html>
  );
}
