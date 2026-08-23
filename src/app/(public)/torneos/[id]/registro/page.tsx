import { getTournamentDetails } from "@/actions/public-tournaments";
import Link from "next/link";
import { ArrowLeft, Trophy, Lock } from "lucide-react";
import TournamentRegistrationForm from "./TournamentRegistrationForm";
import { getUserSession } from "@/actions/user-auth";

export default async function TournamentRegistrationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const response = await getTournamentDetails(params.id);
  const tournament = response.success && response.data ? response.data : null;
  const session = await getUserSession();

  if (!tournament || tournament.categories.length === 0 || tournament.status !== 'REGISTRATION') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <Trophy className="w-16 h-16 text-amber-500 mb-6" />
        <h1 className="text-2xl font-bold text-slate-300">
          {tournament?.status === 'REGISTRATION_CLOSED' ? 'Inscripciones Cerradas' : 'Torneo no disponible para inscripción'}
        </h1>
        <p className="text-slate-400 mt-2 max-w-sm">
          {tournament?.status === 'REGISTRATION_CLOSED'
            ? 'Las inscripciones para este torneo se encuentran cerradas. El club está organizando las zonas y llaves.'
            : 'Las inscripciones no están habilitadas en este momento.'}
        </p>
        <Link href={`/torneos/${tournament?.id || ''}`} className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
          ← Volver al Torneo
        </Link>
      </div>
    );
  }

  // Si no está logueado, bloquear inscripción
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <Lock className="w-16 h-16 text-blue-500 mb-6" />
        <h1 className="text-3xl font-black mb-4">Acceso Restringido</h1>
        <p className="text-slate-400 mb-8 max-w-sm">Para inscribirte en el torneo &ldquo;{tournament.name}&rdquo; necesitás iniciar sesión con tu cuenta de jugador.</p>
        <Link href="/login-usuario" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/30">
          Iniciar Sesión
        </Link>
        <Link href={`/torneos/${tournament.id}`} className="mt-6 text-slate-500 hover:text-slate-300">← Volver al torneo</Link>
      </div>
    );
  }

  const categories = tournament.categories.map((c) => ({
    id: c.id,
    name: c.name,
    teamCount: c.teams?.length || 0,
    groups: c.groups,
    matches: c.matches,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/torneos/${tournament.id}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver al Torneo
        </Link>

        <div className="bg-slate-800/50 rounded-3xl p-6 md:p-10 border border-slate-700/50 backdrop-blur-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">{tournament.name}</h1>
            <p className="text-slate-400">Hola <strong>{session.name}</strong>, completá los datos de tu pareja para inscribirte.</p>
            {tournament.requireDeposit && Number(tournament.depositAmount) > 0 && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
                💰 Este torneo requiere una seña de <strong>${tournament.depositAmount.toString()}</strong> vía Mercado Pago para confirmar la inscripción.
              </div>
            )}
          </div>

          <TournamentRegistrationForm
            tournamentId={tournament.id}
            categories={categories}
            requireDeposit={tournament.requireDeposit && Number(tournament.depositAmount) > 0}
            session={session}
          />
        </div>
      </div>
    </div>
  );
}
