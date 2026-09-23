"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, ChevronRight, Megaphone, Sparkles } from "lucide-react";

export type CommunityPreviewPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  type: string;
  isPinned: boolean;
  createdAt: Date;
  authorName: string;
  authorAvatar?: string | null;
};

export default function CommunityFeedTicker({
  posts,
  isCommunityActive,
}: {
  posts: CommunityPreviewPost[];
  isCommunityActive: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!posts || posts.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [posts, isPaused]);

  if (!isCommunityActive) return null;

  // If no posts yet, show friendly community invitation
  if (!posts || posts.length === 0) {
    return (
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-3.5 py-2 text-white shadow-sm z-30 shrink-0 border-b border-violet-800/30">
        <Link
          href="/comunidad"
          className="flex items-center justify-between gap-2.5 hover:opacity-95 transition-opacity group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-violet-200 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-tight truncate">
                Comunidad: Buscá compañeros, armá partidos y compartí
              </p>
            </div>
          </div>
          <span className="bg-white/20 group-hover:bg-white/30 text-white px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 flex items-center gap-1 transition-colors">
            Entrar <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
    );
  }

  const currentPost = posts[currentIndex] || posts[0];
  const isAnnouncement = currentPost.type === "CLUB_ANNOUNCEMENT";

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 px-3.5 py-2 text-white shadow-sm z-30 shrink-0 border-b border-violet-900/40 relative overflow-hidden group"
    >
      <Link
        href="/comunidad"
        className="flex items-center justify-between gap-2.5 transition-opacity"
        title="Ver en la Comunidad"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Post category icon */}
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isAnnouncement
                ? "bg-amber-400 text-amber-950 font-black"
                : "bg-white/20 text-white"
            }`}
          >
            {isAnnouncement ? (
              <Megaphone className="w-3.5 h-3.5" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5 text-violet-100" />
            )}
          </div>

          {/* Post Snippet */}
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 leading-none mb-0.5">
              <span
                className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full ${
                  isAnnouncement
                    ? "bg-amber-400/20 text-amber-200 border border-amber-400/40"
                    : "bg-violet-400/20 text-violet-200 border border-violet-300/30"
                }`}
              >
                {isAnnouncement ? "Aviso del Club" : "Comunidad"}
              </span>
              <span className="text-[11px] font-bold text-white/95 truncate">
                {currentPost.authorName}
              </span>
            </div>

            <p className="text-xs text-white/90 truncate font-medium max-w-[210px] sm:max-w-xs">
              {currentPost.content || "Nueva foto compartida en la comunidad"}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {posts.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              {posts.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? "bg-white scale-125"
                      : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}

          <span className="bg-white/20 group-hover:bg-white/30 text-white px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 flex items-center gap-1 transition-all active:scale-95 shadow-xs">
            <span>Ver</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </Link>
    </div>
  );
}
