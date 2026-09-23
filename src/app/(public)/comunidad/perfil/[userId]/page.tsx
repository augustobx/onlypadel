import { getPublicProfile } from "@/actions/community-profile";
import { getUserSession } from "@/actions/user-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Calendar,
  Clock,
  Target,
  Newspaper,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const POSITION_LABELS: Record<string, string> = {
  DRIVE: "Drive",
  REVES: "Revés",
  AMBOS: "Ambos lados",
};

const DAY_LABELS: Record<string, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getPublicProfile(userId);
  const name = profile
    ? `${profile.name || ""} ${profile.lastName || ""}`.trim()
    : "Jugador";
  return { title: `${name} — Comunidad` };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getUserSession();
  if (!session) redirect("/login-usuario");

  const { userId } = await params;
  const profile = await getPublicProfile(userId);

  if (!profile) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
          Perfil no disponible
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Este jugador tiene su perfil privado o no existe.
        </p>
        <Link
          href="/comunidad/jugadores"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
      </div>
    );
  }

  const fullName = `${profile.name || ""} ${profile.lastName || ""}`.trim();
  const initial = (profile.name || "?")[0].toUpperCase();
  const days = Array.isArray(profile.availableDays)
    ? (profile.availableDays as string[])
    : [];
  const isOwnProfile = session.id === profile.id;
  const memberSince = formatDistanceToNow(new Date(profile.createdAt), {
    addSuffix: false,
    locale: es,
  });

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link
        href="/comunidad/jugadores"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a jugadores
      </Link>

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] relative">
          {profile.lookingForPartner && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1">
              🏓 Busca compañero
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-10 mb-4 flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-2xl font-black shadow-xl border-4 border-white dark:border-slate-900">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={fullName}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="flex-1 min-w-0 mb-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                {fullName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {profile.categoryLevel && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${profile.categoryLevel.color}20`,
                      color: profile.categoryLevel.color,
                    }}
                  >
                    {profile.categoryLevel.name}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Miembro hace {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats/Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {profile.preferredPosition && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Posición
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {POSITION_LABELS[profile.preferredPosition] ||
                    profile.preferredPosition}
                </span>
              </div>
            )}

            {profile.availableTimeSlot && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Horario
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {profile.availableTimeSlot}
                </span>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Newspaper className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Publicaciones
                </span>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {profile.postsCount}
              </span>
            </div>
          </div>

          {/* Available days */}
          {days.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Días disponibles
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {days.map((day) => (
                  <span
                    key={day}
                    className="px-3 py-1 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] text-xs font-semibold"
                  >
                    {DAY_LABELS[day] || day}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          {!isOwnProfile && (
            <Link
              href={`/comunidad/chat?to=${profile.id}`}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:brightness-105 text-white text-sm font-bold shadow-lg shadow-[var(--color-primary)]/20 transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar mensaje
            </Link>
          )}

          {isOwnProfile && (
            <Link
              href="/perfil"
              className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold transition-all active:scale-[0.98]"
            >
              Editar mi perfil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
