"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Camera,
  Users,
  CalendarDays,
  Sparkles,
  Loader2,
  CheckCircle2,
  MessageCircle,
  Clock,
  MapPin,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { updateCommunityProfile } from "@/actions/community-profile";
import { createOpenMatchFromBooking } from "@/actions/community-matches";
import type { PreferredPosition } from "@prisma/client";

interface ProfileCommunityProps {
  userId: string;
  initialAvatarUrl: string | null;
  initialBio: string | null;
  initialPosition: PreferredPosition | null;
  initialLookingForPartner: boolean;
  initialTimeSlot?: string | null;
  initialDays?: string[] | null;
  upcomingBookings: {
    id: string;
    courtName: string;
    startTime: Date;
    endTime: Date;
    status: string;
  }[];
}

const ALL_DAYS = [
  { id: "lunes", label: "Lun" },
  { id: "martes", label: "Mar" },
  { id: "miercoles", label: "Mié" },
  { id: "jueves", label: "Jue" },
  { id: "viernes", label: "Vie" },
  { id: "sabado", label: "Sáb" },
  { id: "domingo", label: "Dom" },
];

export default function ProfileCommunitySection({
  userId,
  initialAvatarUrl,
  initialBio,
  initialPosition,
  initialLookingForPartner,
  initialTimeSlot,
  initialDays,
  upcomingBookings,
}: ProfileCommunityProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [bio, setBio] = useState(initialBio || "");
  const [position, setPosition] = useState<PreferredPosition | "">(initialPosition || "");
  const [lookingForPartner, setLookingForPartner] = useState(initialLookingForPartner);
  const [timeSlot, setTimeSlot] = useState(initialTimeSlot || "");
  const [selectedDays, setSelectedDays] = useState<string[]>(initialDays || []);

  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal para convocar desde una reserva
  const [selectedBooking, setSelectedBooking] = useState<{
    id: string;
    courtName: string;
    startTime: Date;
  } | null>(null);
  const [slotsNeeded, setSlotsNeeded] = useState(1);
  const [matchPosition, setMatchPosition] = useState<PreferredPosition | "">("");
  const [matchDescription, setMatchDescription] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Subir avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al subir la imagen");
      }

      setAvatarUrl(data.url);

      // Guardar en base de datos
      const profileData = new FormData();
      profileData.set("avatarUrl", data.url);
      profileData.set("lookingForPartner", String(lookingForPartner));
      if (bio) profileData.set("bio", bio);
      if (position) profileData.set("preferredPosition", position);

      await updateCommunityProfile(profileData);
      setFeedback("¡Foto de perfil actualizada con éxito!");
      setTimeout(() => setFeedback(null), 3500);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error al actualizar la foto.");
    } finally {
      setIsUploading(false);
    }
  };

  // Guardar perfil social
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("bio", bio);
      if (position) formData.set("preferredPosition", position);
      formData.set("lookingForPartner", String(lookingForPartner));
      if (avatarUrl) formData.set("avatarUrl", avatarUrl);
      if (timeSlot) formData.set("availableTimeSlot", timeSlot);
      for (const d of selectedDays) {
        formData.set(`day_${d}`, "on");
      }

      const res = await updateCommunityProfile(formData);
      if (res.success) {
        setIsEditing(false);
        setFeedback("¡Perfil social actualizado!");
        setTimeout(() => setFeedback(null), 3000);
        router.refresh();
      } else {
        alert(res.error || "Error al guardar el perfil.");
      }
    });
  };

  // Convocar jugadores para un turno
  const handleCreateOpenMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    startTransition(async () => {
      const res = await createOpenMatchFromBooking({
        bookingId: selectedBooking.id,
        slotsNeeded,
        positionNeeded: (matchPosition as PreferredPosition) || undefined,
        description: matchDescription.trim() || undefined,
      });

      if (res.success) {
        setSelectedBooking(null);
        setFeedback("¡Convocatoria creada y publicada en el muro!");
        setTimeout(() => setFeedback(null), 4000);
        router.refresh();
      } else {
        alert(res.error || "No se pudo convocar jugadores.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* TARJETA DE PERFIL SOCIAL & AVATAR */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--card)] to-[var(--color-secondary)]/10 border border-[var(--color-primary)]/30 shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar Interactivo con Botón de Cámara */}
            <div className="relative group shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl overflow-hidden relative border-2 border-[var(--color-primary)]/30 bg-white dark:bg-slate-900 shadow-md">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Foto de perfil"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white font-bold text-xl">
                    🎾
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-[var(--color-primary)] hover:brightness-110 text-white shadow-md active:scale-95 transition-all"
                title="Cambiar foto de perfil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">
                  Mi Perfil Comunitario
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {position ? `Juega al ${position}` : "Posición no definida"}
              </p>
              {lookingForPartner && (
                <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  🎾 Busco compañeros de juego
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-bold text-[var(--color-primary)] hover:underline shrink-0"
          >
            {isEditing ? "Cancelar" : "Editar perfil"}
          </button>
        </div>

        {feedback && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {feedback}
          </div>
        )}

        {/* Biografía y disponibilidad en modo vista */}
        {!isEditing && (
          <div className="space-y-2">
            {bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-[var(--color-primary)]/20">
                &quot;{bio}&quot;
              </p>
            )}

            {(selectedDays.length > 0 || timeSlot) && (
              <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {timeSlot && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-[var(--color-primary)]/20 font-semibold">
                    <Clock className="w-3 h-3 text-[var(--color-primary)]" /> {timeSlot}
                  </span>
                )}
                {selectedDays.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-[var(--color-primary)]/20 font-semibold">
                    <CalendarDays className="w-3 h-3 text-[var(--color-primary)]" />
                    {selectedDays.map((d) => ALL_DAYS.find((item) => item.id === d)?.label || d).join(", ")}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Formulario de Edición */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="space-y-3 pt-3 border-t border-[var(--color-primary)]/20 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Sobre mí / Descripción
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ej: Juego hace 2 años, busco partidos parejos entre semana a la tarde..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium resize-none focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Posición Habitual
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                >
                  <option value="">No especificado</option>
                  <option value="DRIVE">Drive</option>
                  <option value="REVES">Revés</option>
                  <option value="AMBOS">Indistinto / Ambos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Horario Preferido
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                >
                  <option value="">Cualquier horario</option>
                  <option value="Mañanas (8:00 a 12:00)">Mañanas (8:00 a 12:00)</option>
                  <option value="Mediodía (12:00 a 16:00)">Mediodía (12:00 a 16:00)</option>
                  <option value="Tardes (16:00 a 20:00)">Tardes (16:00 a 20:00)</option>
                  <option value="Noches (20:00 a 00:00)">Noches (20:00 a 00:00)</option>
                </select>
              </div>
            </div>

            {/* Días habituales */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Días habituales para jugar
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day.id);
                  return (
                    <button
                      type="button"
                      key={day.id}
                      onClick={() =>
                        setSelectedDays((prev) =>
                          isSelected ? prev.filter((d) => d !== day.id) : [...prev, day.id]
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        isSelected
                          ? "bg-[var(--color-primary)] text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={lookingForPartner}
                  onChange={(e) => setLookingForPartner(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--color-primary)]"
                />
                <span>Activar &quot;Busco compañeros de juego&quot; en la comunidad</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 rounded-xl bg-[var(--color-primary)] text-white font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SECCIÓN: CONVOCAR JUGADORES PARA TURNOS CONFIRMADOS */}
      {upcomingBookings.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              ¿Te falta gente para tus turnos?
            </h4>
            <span className="text-[10px] text-slate-400">
              Convocá en 1 clic
            </span>
          </div>

          <div className="space-y-2">
            {upcomingBookings.map((b) => {
              const dateStr = new Date(b.startTime).toLocaleDateString("es-AR", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              const timeStr = `${new Date(b.startTime).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })} hs`;

              return (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                      <CalendarDays className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span className="capitalize">{dateStr}</span>
                      <span className="text-slate-400">•</span>
                      <span>{timeStr}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                      {b.courtName}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedBooking({
                        id: b.id,
                        courtName: b.courtName,
                        startTime: b.startTime,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/15 hover:brightness-105 text-[var(--color-primary)] text-xs font-black border border-[var(--color-primary)]/30 active:scale-95 transition-all shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Convocar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Convocatoria desde Reserva */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Convocar Compañeros
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedBooking.courtName} •{" "}
                  {new Date(selectedBooking.startTime).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  hs
                </p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOpenMatch} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ¿Cuántos jugadores te faltan?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSlotsNeeded(num)}
                      className={`py-2 rounded-xl font-bold border transition-all ${
                        slotsNeeded === num
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Falta {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Posición Buscada
                </label>
                <select
                  value={matchPosition}
                  onChange={(e) => setMatchPosition(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100"
                >
                  <option value="">Cualquier posición</option>
                  <option value="DRIVE">Drive</option>
                  <option value="REVES">Revés</option>
                  <option value="AMBOS">Indistinto</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nota / Mensaje para el Muro
                </label>
                <textarea
                  rows={2}
                  value={matchDescription}
                  onChange={(e) => setMatchDescription(e.target.value)}
                  placeholder="Ej: Picadito parejo, buena onda, faltó uno a último momento..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-3 py-1.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Publicar en Comunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
