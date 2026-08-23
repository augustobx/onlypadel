import { getPublicTournaments } from "@/actions/public-tournaments";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Trophy, Calendar, Users, ArrowLeft, ChevronRight } from "lucide-react";

export default async function TorneosPublicPage() {
  const response = await getPublicTournaments();
  const tournaments = response.success && response.data ? response.data : [];

  const statusLabels: Record<string, { label: string; color: string }> = {
    'DRAFT': { label: 'Próximamente', color: 'bg-slate-600' },
    'REGISTRATION': { label: 'Inscripciones Abiertas', color: 'bg-emerald-500' },
    'REGISTRATION_CLOSED': { label: 'Inscripciones Cerradas', color: 'bg-amber-500' },
    'ONGOING': { label: 'En Juego', color: 'bg-red-500 animate-pulse' },
    'COMPLETED': { label: 'Finalizado', color: 'bg-blue-600' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-4 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>

        <div className="flex items-center gap-4 mb-10">
          <div className="bg-yellow-500/10 p-3 rounded-2xl">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Torneos</h1>
            <p className="text-slate-400 text-sm">Competencias del club</p>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-slate-700/50">
            <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-400">No hay torneos disponibles</h2>
            <p className="text-slate-600 mt-2">Próximamente estaremos anunciando nuevas competencias.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map(t => {
              const status = statusLabels[t.status] || statusLabels['DRAFT'];
              return (
                <Link key={t.id} href={`/torneos/${t.id}`} className="group block">
                  <div className="bg-slate-800/40 hover:bg-slate-800/70 rounded-2xl border border-slate-700/50 p-5 md:p-6 transition-all hover:border-slate-600/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors"></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`${status.color} text-white text-xs font-bold px-2.5 py-0.5 rounded-full`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{t.name}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(t.startDate), "d MMM", { locale: es })} — {format(new Date(t.endDate), "d MMM yyyy", { locale: es })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {t.categories?.length || 0} categorías
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase">Inscripción</p>
                          <p className="text-2xl font-black">${t.entryFee.toString()}</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
