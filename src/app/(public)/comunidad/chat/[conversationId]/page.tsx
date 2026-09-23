import { getMessages, getConversationInfo } from "@/actions/community-chat";
import { getUserSession } from "@/actions/user-auth";
import { redirect } from "next/navigation";
import ChatConversationClient from "@/components/community/ChatConversationClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const info = await getConversationInfo(conversationId);
  return {
    title: `Chat — ${info?.name || "Conversación"}`,
  };
}

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await getUserSession();
  if (!session) redirect("/login-usuario");

  const { conversationId } = await params;
  const [info, messagesResult] = await Promise.all([
    getConversationInfo(conversationId),
    getMessages(conversationId),
  ]);

  if (!info) redirect("/comunidad/chat");

  return (
    <ChatConversationClient
      conversationId={conversationId}
      conversationInfo={info}
      initialMessages={messagesResult.success ? (messagesResult.messages ?? []) : []}
      initialCursor={(messagesResult as { nextCursor?: string | null }).nextCursor ?? null}
      currentUserId={session.id}
    />
  );
}
