"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import {
  Megaphone,
  Shield,
  MessageSquare,
  Pin,
  Eye,
  EyeOff,
  Trash2,
  PlusCircle,
  Loader2,
  CheckCircle2,
  Upload,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  togglePostVisibility,
  togglePostPinned,
  deletePostPermanently,
  createClubAnnouncement,
  getAdminConversationMessages,
  moderateChatMessage,
} from "@/actions/community-admin";

interface AdminPost {
  id: string;
  content: string;
  imageUrl: string | null;
  type: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string;
    email: string | null;
    dni: string | null;
  };
  likesCount: number;
  commentsCount: number;
}

interface AdminConversation {
  id: string;
  type: string;
  name: string | null;
  totalMessages: number;
  updatedAt: Date;
  participants: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  }[];
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: Date;
  } | null;
}

interface AdminCommunityStats {
  totalPosts: number;
  totalAnnouncements: number;
  activeMatches: number;
  totalMessages: number;
  playersWithAvatar: number;
}

export default function AdminCommunityClient({
  initialPosts,
  initialConversations,
  stats,
}: {
  initialPosts: AdminPost[];
  initialConversations: AdminConversation[];
  stats?: AdminCommunityStats;
}) {
  const [activeTab, setActiveTab] = useState<"announcements" | "posts" | "chats">(
    "announcements"
  );
  const [posts, setPosts] = useState<AdminPost[]>(initialPosts);
  const [conversations] = useState<AdminConversation[]>(initialConversations);

  // Estados para crear comunicado oficial
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementImage, setAnnouncementImage] = useState<string | null>(null);
  const [announcementPinned, setAnnouncementPinned] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para inspección de chat
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null
  );
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Subir imagen para comunicado oficial
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "announcement");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al subir la imagen");
      }
      setAnnouncementImage(data.url);
    } catch (err: any) {
      alert(err.message || "Error al subir la imagen.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementContent.trim()) return;

    startTransition(async () => {
      const res = await createClubAnnouncement({
        content: announcementContent,
        imageUrl: announcementImage || undefined,
        isPinned: announcementPinned,
      });

      if (res.success) {
        setAnnouncementContent("");
        setAnnouncementImage(null);
        setActionMessage("¡Comunicado oficial publicado con éxito en el feed!");
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(res.error || "No se pudo publicar el comunicado.");
      }
    });
  };

  const handleToggleVisibility = (postId: string) => {
    startTransition(async () => {
      const res = await togglePostVisibility(postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, isActive: res.isActive! } : p
          )
        );
      }
    });
  };

  const handleTogglePin = (postId: string) => {
    startTransition(async () => {
      const res = await togglePostPinned(postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, isPinned: res.isPinned! } : p
          )
        );
      }
    });
  };

  const handleDeletePost = (postId: string) => {
    if (!confirm("¿Eliminar definitivamente esta publicación y sus comentarios?"))
      return;

    startTransition(async () => {
      const res = await deletePostPermanently(postId);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    });
  };

  const handleInspectChat = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsLoadingMessages(true);

    startTransition(async () => {
      const res = await getAdminConversationMessages(conversationId);
      if (res.success) {
        setConversationMessages(res.messages);
      }
      setIsLoadingMessages(false);
    });
  };

  const handleModerateMessage = (messageId: string) => {
    if (!confirm("¿Moderar y ocultar este mensaje para todos los participantes?"))
      return;

    startTransition(async () => {
      const res = await moderateChatMessage(messageId);
      if (res.success) {
        setConversationMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isDeleted: true,
                  content: "🚫 [Este mensaje fue eliminado por un administrador del club]",
                }
              : m
          )
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600">
              <Shield className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Panel de Moderación
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Comunidad, Muro & Chats
          </h1>
          <p className="text-xs text-slate-500 max-w-xl">
            Publica anuncios institucionales, modera publicaciones de los socios y supervisa mensajes inapropiados en los chats del club.
          </p>
        </div>

        {/* Pestañas */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 shrink-0 self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("announcements")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
              activeTab === "announcements"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Megaphone className="w-4 h-4 text-violet-500" />
            Comunicados
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
              activeTab === "posts"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Shield className="w-4 h-4 text-amber-500" />
            Moderar Feed
          </button>
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
              activeTab === "chats"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            Supervisar Chats
          </button>
        </div>
      </div>

      {/* Tira de Métricas de Comunidad */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              📢 Comunicados
            </span>
            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
              {stats.totalAnnouncements}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              📝 Publicaciones Muro
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalPosts}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              🎾 Turnos Convocados
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.activeMatches}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              💬 Mensajes Chat
            </span>
            <span className="text-2xl font-black text-amber-500">
              {stats.totalMessages}
            </span>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {actionMessage}
        </div>
      )}

      {/* ─── TAB 1: COMUNICADOS OFICIALES ─── */}
      {activeTab === "announcements" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                <Megaphone className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Emitir Comunicado Oficial
                </h3>
                <p className="text-[11px] text-slate-400">
                  Aparece destacado en la parte superior del feed de la app
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Mensaje del Comunicado
                </label>
                <textarea
                  rows={4}
                  required
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Ej: Estimados socios, el próximo sábado tendremos clínica con profesionales y horario especial de cantina..."
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 font-medium text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* Imagen opcional */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Flyer / Imagen adjunta (opcional)</span>
                  {announcementImage && (
                    <button
                      type="button"
                      onClick={() => setAnnouncementImage(null)}
                      className="text-rose-500 font-bold hover:underline"
                    >
                      Quitar imagen
                    </button>
                  )}
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                {announcementImage ? (
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/5">
                    <Image
                      src={announcementImage}
                      alt="Preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-violet-600 hover:border-violet-300 dark:hover:border-violet-700 transition-all font-semibold"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                    ) : (
                      <Upload className="w-5 h-5 text-slate-400" />
                    )}
                    <span>Hacé clic para subir flyer o imagen</span>
                  </button>
                )}
              </div>

              {/* Checkbox Fijar */}
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={announcementPinned}
                  onChange={(e) => setAnnouncementPinned(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--color-primary)]"
                />
                <span>Fijar en el tope del muro comunitario</span>
              </label>

              <button
                type="submit"
                disabled={isPending || isUploadingImage || !announcementContent.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:brightness-105 text-white font-black shadow-md shadow-[var(--color-primary)]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Publicar Comunicado
              </button>
            </form>
          </div>

          {/* Listado de Anuncios Existentes */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Pin className="w-4 h-4 text-violet-600" />
              Comunicados Activos en el Muro
            </h3>

            {posts.filter((p) => p.type === "CLUB_ANNOUNCEMENT").length === 0 ? (
              <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-slate-400 text-xs">
                No hay comunicados oficiales activos en este momento.
              </div>
            ) : (
              <div className="space-y-3">
                {posts
                  .filter((p) => p.type === "CLUB_ANNOUNCEMENT")
                  .map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-900/60 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold text-[10px] flex items-center gap-1">
                            <Megaphone className="w-3 h-3" /> Comunicado Oficial
                          </span>
                          {ann.isPinned && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                              <Pin className="w-3 h-3" /> Fijado
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(ann.createdAt).toLocaleDateString("es-AR")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                          {ann.content}
                        </p>
                        {ann.imageUrl && (
                          <div className="relative h-32 w-48 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                            <Image
                              src={ann.imageUrl}
                              alt="Flyer"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePin(ann.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        >
                          {ann.isPinned ? "Desfijar" : "Fijar"}
                        </button>
                        <button
                          onClick={() => handleDeletePost(ann.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: MODERACIÓN DE POSTS ─── */}
      {activeTab === "posts" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Publicaciones de Jugadores ({posts.length})
            </h3>
            <span className="text-xs text-slate-400">
              Ocultá posts inapropiados o eliminalos definitivamente
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  !post.isActive ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                }`}
              >
                <div className="space-y-1.5 max-w-2xl">
                  {/* Autor */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {post.author.name} {post.author.lastName}
                    </span>
                    {post.author.dni && (
                      <span className="text-[10px] text-slate-400">
                        DNI: {post.author.dni}
                      </span>
                    )}
                    {!post.isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200 text-[10px] font-black uppercase">
                        Oculto por Moderación
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleString("es-AR")}
                    </span>
                  </div>

                  {/* Contenido */}
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {post.content}
                  </p>

                  {/* Imagen */}
                  {post.imageUrl && (
                    <div className="relative h-20 w-32 rounded-lg overflow-hidden border">
                      <Image
                        src={post.imageUrl}
                        alt="Post media"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>❤️ {post.likesCount} likes</span>
                    <span>💬 {post.commentsCount} comentarios</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleVisibility(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      post.isActive
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {post.isActive ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Reactivar
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: SUPERVISIÓN DE CHATS ─── */}
      {activeTab === "chats" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Conversaciones */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white px-2">
              Conversaciones Activas ({conversations.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {conversations.map((c) => {
                const names = c.participants
                  .map((p) => p.name || "Jugador")
                  .join(", ");
                const isSelected = selectedConversationId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleInspectChat(c.id)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
                        {c.name || names}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {c.totalMessages} msgs
                      </span>
                    </div>
                    {c.lastMessage && (
                      <p className="text-[11px] text-slate-500 truncate">
                        <span className="font-semibold">{c.lastMessage.senderName}:</span>{" "}
                        {c.lastMessage.content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visor e Inspección de Mensajes */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Mensajes de la Conversación
            </h3>

            {!selectedConversationId ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Seleccioná una conversación a la izquierda para inspeccionar sus mensajes.
              </div>
            ) : isLoadingMessages ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                Cargando historial de mensajes...
              </div>
            ) : conversationMessages.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                No hay mensajes en esta conversación.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {conversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                      msg.isDeleted
                        ? "bg-rose-50/40 border-rose-200 text-rose-500 italic"
                        : "bg-slate-50/80 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {msg.sender.name} {msg.sender.lastName}
                        </span>
                        {msg.sender.dni && (
                          <span className="text-[10px] text-slate-400">
                            DNI: {msg.sender.dni}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        {msg.content}
                      </p>
                    </div>

                    {!msg.isDeleted && (
                      <button
                        onClick={() => handleModerateMessage(msg.id)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-100 transition-colors shrink-0"
                        title="Eliminar mensaje ofensivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
