"use client";

import { useState, useEffect, useTransition } from "react";
import { getPostComments, addComment } from "@/actions/community-feed";
import { SendHorizonal, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
};

export default function PostComments({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPostComments(postId).then((data) => {
      setComments(data as Comment[]);
      setLoading(false);
    });
  }, [postId]);

  const handleSubmit = () => {
    if (!content.trim() || isPending || !currentUserId) return;
    const formData = new FormData();
    formData.set("content", content);

    startTransition(async () => {
      const result = await addComment(postId, formData);
      if (result.success) {
        setContent("");
        // Refresh comments
        const data = await getPostComments(postId);
        setComments(data as Comment[]);
      }
    });
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-800/60">
      {/* Comments list */}
      <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
            Sin comentarios aún
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                {comment.author.avatarUrl ? (
                  <img
                    src={comment.author.avatarUrl}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (comment.author.name || "?")[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {`${comment.author.name || ""} ${comment.author.lastName || ""}`.trim()}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-3 mt-0.5 inline-block">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment input */}
      {currentUserId && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Escribí un comentario..."
            maxLength={500}
            disabled={isPending}
            className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700 transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isPending}
            className="p-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SendHorizonal className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
