"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle, Trash2, Pin, Megaphone, Loader2 } from "lucide-react";
import { toggleLike, deletePost } from "@/actions/community-feed";
import PostComments from "@/components/community/PostComments";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type PostData = {
  id: string;
  content: string;
  imageUrl: string | null;
  type: string;
  isPinned: boolean;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    category: string | null;
  };
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
};

export default function PostCard({
  post,
  currentUserId,
}: {
  post: PostData;
  currentUserId: string | null;
}) {
  const [liked, setLiked] = useState(post.isLikedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  const isAnnouncement = post.type === "CLUB_ANNOUNCEMENT";
  const isOwner = currentUserId === post.author.id;
  const authorName = `${post.author.name || ""} ${post.author.lastName || ""}`.trim();
  const initial = (post.author.name || "?")[0].toUpperCase();

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: es,
  });

  const handleLike = () => {
    if (isPending || !currentUserId) return;
    // Optimistic update
    setLiked(!liked);
    setLikesCount((prev) => prev + (liked ? -1 : 1));

    startTransition(async () => {
      const result = await toggleLike(post.id);
      if (!result.success) {
        // Revert
        setLiked(liked);
        setLikesCount(likesCount);
      }
    });
  };

  const handleDelete = () => {
    if (isPending) return;
    if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.success) setDeleted(true);
    });
  };

  if (deleted) return null;

  return (
    <article
      className={`
        bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all
        ${
          isAnnouncement
            ? "border-violet-200/80 dark:border-violet-800/60 ring-1 ring-violet-100 dark:ring-violet-900/40"
            : "border-slate-200/80 dark:border-slate-800/80"
        }
        ${post.isPinned ? "ring-1 ring-amber-200 dark:ring-amber-800/40" : ""}
      `}
    >
      {/* Pinned / Announcement badge */}
      {(post.isPinned || isAnnouncement) && (
        <div
          className={`px-4 py-1.5 text-[11px] font-bold flex items-center gap-1.5 ${
            isAnnouncement
              ? "bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 text-violet-700 dark:text-violet-300"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
          }`}
        >
          {isAnnouncement ? (
            <><Megaphone className="w-3 h-3" /> Anuncio del Club</>
          ) : (
            <><Pin className="w-3 h-3" /> Fijado</>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Author header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md ${
              isAnnouncement
                ? "bg-gradient-to-br from-violet-600 to-fuchsia-600"
                : "bg-gradient-to-br from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-800"
            }`}
          >
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={authorName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initial
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {isAnnouncement ? "📢 Club" : authorName}
              </span>
              {post.author.category && !isAnnouncement && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {post.author.category}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {timeAgo}
            </span>
          </div>

          {/* Delete button for owner */}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </p>

        {/* Image */}
        {post.imageUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <img
              src={post.imageUrl}
              alt="Imagen adjunta"
              className="w-full max-h-96 object-cover"
            />
          </div>
        )}
      </div>

      {/* Actions bar */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1">
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={!currentUserId}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95
            ${
              liked
                ? "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          <Heart
            className={`w-4 h-4 transition-all ${
              liked ? "fill-pink-500 text-pink-500 scale-110" : ""
            }`}
          />
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>

        {/* Comment button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95
            ${
              showComments
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          <MessageCircle className="w-4 h-4" />
          {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <PostComments
          postId={post.id}
          currentUserId={currentUserId}
        />
      )}
    </article>
  );
}
