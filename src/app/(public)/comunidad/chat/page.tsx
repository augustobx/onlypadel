import { getConversations, getOrCreateDirectChat } from "@/actions/community-chat";
import { getUserSession } from "@/actions/user-auth";
import { redirect } from "next/navigation";
import ChatListClient from "@/components/community/ChatListClient";

export const metadata = {
  title: "Comunidad — Chat",
  description: "Mensajes con otros jugadores",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const session = await getUserSession();
  if (!session) redirect("/login-usuario");

  const params = await searchParams;

  // If ?to=userId, create/get direct chat and redirect
  if (params.to) {
    const result = await getOrCreateDirectChat(params.to);
    if (result.success && result.conversationId) {
      redirect(`/comunidad/chat/${result.conversationId}`);
    }
  }

  const conversations = await getConversations();

  return <ChatListClient conversations={conversations} />;
}
