export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import BookingFlow from '@/components/BookingFlow';

export default async function ReservasPage() {
  const [courts, settings] = await Promise.all([
    prisma.court.findMany({ where: { isActive: true } }),
    prisma.systemSetting.findUnique({ where: { id: 1 } }),
  ]);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  return (
    <div className="min-h-screen p-8 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reserva tu Cancha</h1>
          <p className="text-slate-500 mt-2">Selecciona la cancha y el horario que prefieras.</p>
        </div>

        <BookingFlow courts={courts} sysSettings={settings} today={today} />
      </div>
    </div>
  );
}
