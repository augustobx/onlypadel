import { getFeedPosts } from "@/actions/community-feed";
import { getUserSession } from "@/actions/user-auth";
import PostComposer from "@/components/community/PostComposer";
import PostCard from "@/components/community/PostCard";
import FeedLoadMore from "@/components/community/FeedLoadMore";

export const metadata = {
  title: "Comunidad — Feed",
  description: "Muro de la comunidad del club",
};

export default async function CommunidadPage() {
  const session = await getUserSession();
  const { posts, nextCursor } = await getFeedPosts();

  return (
    <div className="space-y-4">
      {/* Post Composer */}
      <PostComposer
        userName={`${session?.name || ""} ${session?.lastName || ""}`.trim()}
        userInitial={(session?.name || "?")[0].toUpperCase()}
        userAvatar={(session as any)?.avatarUrl || null}
      />

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
            Aún no hay publicaciones
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ¡Sé el primero en publicar algo en la comunidad!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={session?.id || null}
            />
          ))}

          {nextCursor && <FeedLoadMore cursor={nextCursor} currentUserId={session?.id || null} />}
        </div>
      )}
    </div>
  );
}
