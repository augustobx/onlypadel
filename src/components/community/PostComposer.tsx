"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { createPost } from "@/actions/community-feed";
import { SendHorizonal, Loader2, Image as ImageIcon, X } from "lucide-react";

export default function PostComposer({
  userName,
  userInitial,
  userAvatar,
}: {
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
}) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxLength = 2000;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "post");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al subir la imagen");
      }

      setImageUrl(data.url);
    } catch (err: any) {
      setError(err.message || "No se pudo subir la foto.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleSubmit = () => {
    if ((!content.trim() && !imageUrl) || isPending || isUploading) return;
    setError(null);
    const formData = new FormData();
    formData.set("content", content);
    if (imageUrl) formData.set("imageUrl", imageUrl);

    startTransition(async () => {
      const result = await createPost(formData);
      if (result.success) {
        setContent("");
        setImageUrl(null);
      } else {
        setError(result.error || "Error al publicar");
      }
    });
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {userAvatar ? (
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative border border-[var(--color-primary)]/25 shadow-sm">
              <Image src={userAvatar} alt={userName} fill unoptimized className="object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {userInitial}
            </div>
          )}

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="¿Qué está pasando en la cancha? 🏓"
              className="w-full resize-none border-0 bg-transparent text-sm text-[var(--foreground)] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 min-h-[60px]"
              rows={2}
              maxLength={maxLength}
              disabled={isPending}
            />

            {/* Preview de la imagen adjunta */}
            {imageUrl && (
              <div className="relative mt-2 rounded-xl overflow-hidden max-h-56 max-w-sm border border-[var(--border)] bg-slate-950/5">
                <Image
                  src={imageUrl}
                  alt="Imagen adjunta"
                  width={400}
                  height={240}
                  unoptimized
                  className="w-full h-auto object-cover max-h-56 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-all shadow-md active:scale-95"
                  title="Quitar foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[var(--muted)]/40 border-t border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isPending}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 text-xs font-semibold transition-all disabled:opacity-50"
            title="Adjuntar foto"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
            ) : (
              <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
            )}
            <span className="hidden sm:inline">Foto</span>
          </button>

          <span
            className={`text-[11px] font-medium tabular-nums ${
              content.length > maxLength * 0.9
                ? "text-red-500"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {content.length}/{maxLength}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-500 font-medium truncate max-w-[200px]">{error}</span>
          )}
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && !imageUrl) || isPending || isUploading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] hover:opacity-90 text-[var(--color-primary-foreground)] text-xs font-bold shadow-md shadow-[var(--color-primary)]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SendHorizonal className="w-3.5 h-3.5" />
            )}
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}
