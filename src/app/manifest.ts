export const dynamic = 'force-dynamic';

import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } })
  const appName = settings?.clubName || 'T-Padel'

  return {
    name: `${appName} App`,
    short_name: appName,
    description: `Reserva tu cancha en ${appName}`,
    start_url: '/',
    display: 'standalone',
    background_color: settings?.theme === 'dark' ? '#020617' : '#f8fafc',
    theme_color: settings?.primaryColor || '#10b981',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/globe_192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/globe_512.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}
