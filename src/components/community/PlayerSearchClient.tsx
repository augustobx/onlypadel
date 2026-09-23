"use client";

import { useState, useTransition } from "react";
import { searchPlayers } from "@/actions/community-profile";
import { Search, UserSearch, Filter, Loader2, MessageCircle, MapPin } from "lucide-react";
import Link from "next/link";

type Player = {
  id: string;
  name: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  category: string | null;
  preferredPosition: string | null;
  availableDays: unknown;
  availableTimeSlot: string | null;
  lookingForPartner: boolean;
  categoryLevel: { id: string; name: string; color: string } | null;
};

const DAYS = [
  { value: "lunes", label: "Lun" },
  { value: "martes", label: "Mar" },
  { value: "miercoles", label: "Mié" },
  { value: "jueves", label: "Jue" },
  { value: "viernes", label: "Vie" },
  { value: "sabado", label: "Sáb" },
  { value: "domingo", label: "Dom" },
];

const TIME_SLOTS = ["Mañana", "Tarde", "Noche", "Flexible"];

const POSITION_LABELS: Record<string, string> = {
  DRIVE: "Drive",
  REVES: "Revés",
  AMBOS: "Ambos",
};

export default function PlayerSearchClient({
  initialPlayers,
  initialCursor,
  categoryLevels,
}: {
  initialPlayers: Player[];
  initialCursor: string | null;
  categoryLevels: { id: string; name: string; color: string }[];
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [onlyLooking, setOnlyLooking] = useState(false);

  const doSearch = (overrides?: Record<string, unknown>) => {
    startTransition(async () => {
      const result = await searchPlayers({
        search: (overrides?.search as string) ?? search,
        availableDay: ((overrides?.availableDay as string) ?? selectedDay) || undefined,
        availableTimeSlot: ((overrides?.availableTimeSlot as string) ?? selectedTimeSlot) || undefined,
        lookingForPartner: ((overrides?.lookingForPartner as boolean) ?? onlyLooking) || undefined,
        limit: 20,
      });
      setPlayers(result.players);
      setNextCursor(result.nextCursor);
    });
  };

  const loadMore = () => {
    if (!nextCursor || isPending) return;
    startTransition(async () => {
      const result = await searchPlayers({
        search,
        availableDay: selectedDay || undefined,
        availableTimeSlot: selectedTimeSlot || undefined,
        lookingForPartner: onlyLooking || undefined,
        cursor: nextCursor,
        limit: 20,
      });
      setPlayers((prev) => [...prev, ...result.players]);
      setNextCursor(result.nextCursor);
    });
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
              placeholder="Buscar por nombre..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all ${
              showFilters
                ? "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-600"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => doSearch()}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserSearch className="w-4 h-4" />}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
            {/* Days */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Día disponible
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => {
                      const val = selectedDay === day.value ? "" : day.value;
                      setSelectedDay(val);
                      doSearch({ availableDay: val });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedDay === day.value
                        ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slot */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Horario
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => {
                      const val = selectedTimeSlot === slot ? "" : slot;
                      setSelectedTimeSlot(val);
                      doSearch({ availableTimeSlot: val });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedTimeSlot === slot
                        ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Looking for partner toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyLooking}
                onChange={(e) => {
                  setOnlyLooking(e.target.checked);
                  doSearch({ lookingForPartner: e.target.checked });
                }}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                🏓 Solo jugadores buscando compañero
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Results */}
      {players.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
            No se encontraron jugadores
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Probá cambiando los filtros de búsqueda
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}

          {nextCursor && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-95 shadow-sm"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const fullName = `${player.name || ""} ${player.lastName || ""}`.trim();
  const initial = (player.name || "?")[0].toUpperCase();
  const days = Array.isArray(player.availableDays)
    ? (player.availableDays as string[])
    : [];
  const dayLabels = days
    .map((d) => DAYS.find((dd) => dd.value === d)?.label)
    .filter(Boolean);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-4 transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white font-bold text-base shadow-md">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={fullName} className="w-full h-full rounded-full object-cover" />
            ) : (
              initial
            )}
          </div>
          {player.lookingForPartner && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px]">
              🏓
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link
              href={`/comunidad/perfil/${player.id}`}
              className="font-bold text-sm text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate"
            >
              {fullName}
            </Link>
            {player.lookingForPartner && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                Busca compañero
              </span>
            )}
          </div>

          {/* Category + Position */}
          <div className="flex items-center gap-2 mb-1.5">
            {player.categoryLevel && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${player.categoryLevel.color}20`,
                  color: player.categoryLevel.color,
                }}
              >
                {player.categoryLevel.name}
              </span>
            )}
            {!player.categoryLevel && player.category && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {player.category}
              </span>
            )}
            {player.preferredPosition && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                🎯 {POSITION_LABELS[player.preferredPosition] || player.preferredPosition}
              </span>
            )}
          </div>

          {/* Bio */}
          {player.bio && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
              {player.bio}
            </p>
          )}

          {/* Availability */}
          {(dayLabels.length > 0 || player.availableTimeSlot) && (
            <div className="flex items-center gap-2 flex-wrap">
              {dayLabels.length > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  📅 {dayLabels.join(", ")}
                </span>
              )}
              {player.availableTimeSlot && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  🕐 {player.availableTimeSlot}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          <Link
            href={`/comunidad/chat?to=${player.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-md shadow-violet-500/20 transition-all active:scale-95 hover:from-violet-500 hover:to-fuchsia-500"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mensaje</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
