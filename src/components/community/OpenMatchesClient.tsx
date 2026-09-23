"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  MessageCircle,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import type { OpenMatchCardData } from "@/actions/community-matches";
import {
  joinOpenMatch,
  leaveOpenMatch,
  cancelOpenMatch,
  createManualOpenMatch,
} from "@/actions/community-matches";
import type { PreferredPosition } from "@prisma/client";

export default function OpenMatchesClient({
  initialMatches,
  currentUserId,
}: {
  initialMatches: OpenMatchCardData[];
  currentUserId: string | null;
}) {
  const [matches, setMatches] = useState<OpenMatchCardData[]>(initialMatches);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();

  // Estado para el modal de creación manual
  const [formCourt, setFormCourt] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formStartTime, setFormStartTime] = useState("19:00");
  const [formEndTime, setFormEndTime] = useState("20:30");
  const [formSlots, setFormSlots] = useState<number>(1);
  const [formLevel, setFormLevel] = useState("");
  const [formPosition, setFormPosition] = useState<PreferredPosition | "">("");
  const [formDescription, setFormDescription] = useState("");

  const handleJoin = (matchId: string) => {
    if (!currentUserId) {
      router.push("/login-usuario");
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const res = await joinOpenMatch(matchId);
      if (res.success) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  hasJoined: true,
                  slotsNeeded: Math.max(0, m.slotsNeeded - 1),
                  status: m.slotsNeeded <= 1 ? "FULL" : m.status,
                }
              : m
          )
        );
        router.refresh();
      } else {
        setActionError(res.error || "No se pudo unir al turno.");
      }
    });
  };

  const handleLeave = (matchId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await leaveOpenMatch(matchId);
      if (res.success) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  hasJoined: false,
                  slotsNeeded: m.slotsNeeded + 1,
                  status: "OPEN",
                }
              : m
          )
        );
        router.refresh();
      } else {
        setActionError(res.error || "Error al abandonar el turno.");
      }
    });
  };

  const handleCancel = (matchId: string) => {
    if (!confirm("¿Deseas cancelar esta convocatoria?")) return;
    setActionError(null);
    startTransition(async () => {
      const res = await cancelOpenMatch(matchId);
      if (res.success) {
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
        router.refresh();
      } else {
        setActionError(res.error || "No se pudo cancelar el turno.");
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      router.push("/login-usuario");
      return;
    }

    startTransition(async () => {
      const res = await createManualOpenMatch({
        courtName: formCourt.trim() || "Cancha del Club",
        dateStr: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        slotsNeeded: formSlots,
        level: formLevel.trim() || undefined,
        positionNeeded: (formPosition as PreferredPosition) || undefined,
        description: formDescription.trim() || undefined,
      });

      if (res.success) {
        setShowCreateModal(false);
        router.refresh();
      } else {
        setActionError(res.error || "Error al crear la convocatoria.");
      }
    });
  };

  // Filtrado de turnos
  const filteredMatches = matches.filter((m) => {
    if (filterLevel !== "ALL" && m.level && !m.level.includes(filterLevel)) {
      return false;
    }
    if (filterDate === "TODAY") {
      const todayStr = new Date().toISOString().split("T")[0];
      const matchStr = new Date(m.date).toISOString().split("T")[0];
      if (todayStr !== matchStr) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Banner Superior & CTA */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg shadow-[var(--color-primary)]/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                Turnos Armados
              </span>
              <span className="text-xs text-white/85">
                {filteredMatches.length} convocatoria{filteredMatches.length !== 1 ? "s" : ""}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight">
              ¿Te falta uno para el partido? 🎾
            </h2>
            <p className="text-xs text-white/80 max-w-md mt-0.5">
              Convocatorias para partidos ya reservados en el club. Anotate o coordiná directamente con el organizador.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-black backdrop-blur-md border border-white/25 active:scale-95 transition-all shadow-sm"
              title="Ir al calendario para reservar una cancha"
            >
              <CalendarDays className="w-4 h-4 text-white" />
              <span>Sacar Turno</span>
            </Link>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[var(--color-primary)] text-xs font-black shadow-md hover:bg-white/95 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-[var(--color-primary)]" />
              Convocar Jugadores
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {actionError && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm text-xs">
        <span className="text-slate-400 font-semibold px-2">Filtros:</span>

        {/* Filtro Fecha */}
        <button
          onClick={() => setFilterDate("ALL")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            filterDate === "ALL"
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          Todos los días
        </button>
        <button
          onClick={() => setFilterDate("TODAY")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            filterDate === "TODAY"
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          }`}
        >
          Solo Hoy
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* Filtro Nivel */}
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-violet-500 outline-none"
        >
          <option value="ALL">Cualquier Categoría</option>
          <option value="7ma">7ma Categoría</option>
          <option value="6ta">6ta Categoría</option>
          <option value="5ta">5ta Categoría</option>
          <option value="4ta">4ta Categoría</option>
          <option value="3ra">3ra Categoría</option>
          <option value="Principiante">Principiante</option>
        </select>
      </div>

      {/* Lista de Turnos */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-3xl">
            🎾
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            No hay convocatorias activas
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            ¿Tenés un turno reservado y te falta gente para jugar? Publicalo en segundos, o reservá una cancha en el club.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <CalendarDays className="w-4 h-4" />
              Sacar Turno en el Club
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-md hover:bg-violet-700 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Crear convocatoria
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMatches.map((match) => {
            const matchDate = new Date(match.date);
            const dateStr = matchDate.toLocaleDateString("es-AR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const isFull = match.status === "FULL" || match.slotsNeeded === 0;
            const organizerName = `${match.creator.name || ""} ${
              match.creator.lastName || ""
            }`.trim() || "Organizador";

            return (
              <div
                key={match.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                  isFull
                    ? "border-slate-200 dark:border-slate-800 opacity-80"
                    : "border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/15 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Encabezado: Fecha, Cancha y Badge de Vacantes */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                        <CalendarDays className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="capitalize">{dateStr}</span>
                        <span className="text-slate-400">•</span>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {match.startTime} - {match.endTime} hs
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        <span className="font-semibold">{match.courtName}</span>
                      </div>
                    </div>

                    {/* Badge de Vacantes */}
                    {isFull ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        Completo
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
                        ¡Falta {match.slotsNeeded}!
                      </span>
                    )}
                  </div>

                  {/* Etiquetas: Nivel & Posición */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {match.level && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                        {match.level}
                      </span>
                    )}
                    {match.positionNeeded && (
                      <span className="px-2 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold border border-[var(--color-primary)]/25">
                        Posición: {match.positionNeeded}
                      </span>
                    )}
                  </div>

                  {/* Descripción / Mensaje del Host */}
                  {match.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-3">
                      &quot;{match.description}&quot;
                    </p>
                  )}

                  {/* Organizador y Jugadores anotados */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {match.creator.avatarUrl ? (
                          <div className="w-6 h-6 rounded-full overflow-hidden relative">
                            <Image
                              src={match.creator.avatarUrl}
                              alt={organizerName}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-violet-500 text-white font-bold flex items-center justify-center text-[10px]">
                            {(match.creator.name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            {organizerName}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            (Host)
                          </span>
                        </div>
                      </div>

                      {match.creator.category && (
                        <span className="text-[10px] font-bold text-slate-500">
                          Cat. {match.creator.category}
                        </span>
                      )}
                    </div>

                    {/* Jugadores que ya se sumaron */}
                    {match.players.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Sumados:
                        </span>
                        {match.players.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {p.user.name || "Jugador"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {match.isCreator ? (
                    <button
                      onClick={() => handleCancel(match.id)}
                      disabled={isPending}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                    >
                      Cancelar mi convocatoria
                    </button>
                  ) : match.hasJoined ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/comunidad/chat?to=${match.creator.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:brightness-110 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat con Host
                      </Link>
                      <button
                        onClick={() => handleLeave(match.id)}
                        disabled={isPending}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                      >
                        Darme de baja
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={`/comunidad/chat?to=${match.creator.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[var(--color-primary)] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      Consultar por Chat
                    </Link>
                  )}

                  {!match.isCreator && !match.hasJoined && !isFull && (
                    <button
                      onClick={() => handleJoin(match.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:brightness-105 text-white text-xs font-black shadow-md shadow-[var(--color-primary)]/20 active:scale-95 transition-all"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      ¡Me anoto!
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación Manual */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-600">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Convocar Jugadores
                  </h3>
                  <p className="text-xs text-slate-400">
                    Buscá compañeros para un turno ya armado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
              <span className="font-medium">¿Todavía no tenés cancha reservada en el club?</span>
              <Link
                href="/"
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 transition-colors"
              >
                Sacar Turno →
              </Link>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nombre de la Cancha / Club
                </label>
                <input
                  type="text"
                  required
                  value={formCourt}
                  onChange={(e) => setFormCourt(e.target.value)}
                  placeholder="Ej: Cancha Panorámica 1"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Fecha del Partido
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    ¿Cuántos faltan?
                  </label>
                  <select
                    value={formSlots}
                    onChange={(e) => setFormSlots(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value={1}>Falta 1 jugador</option>
                    <option value={2}>Faltan 2 jugadores</option>
                    <option value={3}>Faltan 3 jugadores</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Nivel o Categoría
                  </label>
                  <input
                    type="text"
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    placeholder="Ej: 6ta pareja"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Posición Buscada
                  </label>
                  <select
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Cualquiera</option>
                    <option value="DRIVE">Drive</option>
                    <option value="REVES">Revés</option>
                    <option value="AMBOS">Indistinto</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nota / Comentario
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ej: Nos bajamos uno a último momento, picadito parejo y con buena onda..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Publicar Convocatoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
