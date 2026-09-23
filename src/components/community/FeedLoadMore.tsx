"use client";

import { useState, useTransition } from "react";
import { getFeedPosts } from "@/actions/community-feed";
import PostCard from "@/components/community/PostCard";
import { Loader2 } from "lucide-react";

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

export default function FeedLoadMore({
  cursor,
  currentUserId,
}: {
  cursor: string;
  currentUserId: string | null;
}) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(cursor);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    if (!nextCursor || isPending) return;
    startTransition(async () => {
      const result = await getFeedPosts(nextCursor);
      setPosts((prev) => [...prev, ...result.posts]);
      setNextCursor(result.nextCursor);
    });
  };

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}

      {nextCursor && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-95 shadow-sm"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Cargar más"
            )}
          </button>
        </div>
      )}
    </>
  );
}
