import { requireAdmin } from "@/lib/admin-auth";
import { getAdminPosts, getAdminConversations } from "@/actions/community-admin";
import AdminCommunityClient from "./AdminCommunityClient";

export const metadata = {
  title: "Moderación de Comunidad — Admin OnlyPadel",
  description: "Panel de moderación de feed, comunicados oficiales y chats.",
};

export default async function AdminComunidadPage() {
  await requireAdmin();

  const [postsRes, chatsRes] = await Promise.all([
    getAdminPosts({ page: 1 }),
    getAdminConversations(),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <AdminCommunityClient
        initialPosts={postsRes.posts}
        initialConversations={chatsRes.conversations}
      />
    </div>
  );
}
