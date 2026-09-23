"use server";

import { prisma } from "@/lib/prisma";
import { readUserSessionId } from "@/lib/user-session";
import { requireTenantFeature } from "@/lib/features";
import { revalidatePath } from "next/cache";

// ─── Helpers ──────────────────────────────────────────────
async function requireChatUser() {
  await requireTenantFeature("community");
  const userId = await readUserSessionId();
  if (!userId) throw new Error("AUTH_REQUIRED");
  return userId;
}

// ─── Get or create direct conversation ────────────────────
export async function getOrCreateDirectChat(otherUserId: string) {
  const userId = await requireChatUser();
  if (userId === otherUserId) {
    return { success: false, error: "No podés chatear con vos mismo." };
  }

  // Check if direct conversation already exists between these two users
  const existing = await prisma.chatConversation.findFirst({
    where: {
      type: "DIRECT",
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    return { success: true, conversationId: existing.id };
  }

  // Verify the other user exists and is active
  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, isActive: true },
  });
  if (!otherUser || !otherUser.isActive) {
    return { success: false, error: "Usuario no encontrado." };
  }

  // Create new direct conversation
  const conversation = await prisma.chatConversation.create({
    data: {
      type: "DIRECT",
    },
  });

  await prisma.chatParticipant.create({
    data: { conversationId: conversation.id, userId, role: "MEMBER" },
  });
  await prisma.chatParticipant.create({
    data: { conversationId: conversation.id, userId: otherUserId, role: "MEMBER" },
  });

  return { success: true, conversationId: conversation.id };
}

// ─── Create group conversation ────────────────────────────
export async function createGroupChat(
  name: string,
  memberIds: string[]
) {
  const userId = await requireChatUser();

  if (!name?.trim()) {
    return { success: false, error: "El grupo necesita un nombre." };
  }
  if (name.length > 120) {
    return { success: false, error: "El nombre no puede superar los 120 caracteres." };
  }

  // Include creator as ADMIN participant
  const allMembers = [userId, ...memberIds.filter((id) => id !== userId)];
  if (allMembers.length < 2) {
    return { success: false, error: "Un grupo necesita al menos 2 miembros." };
  }

  const conversation = await prisma.chatConversation.create({
    data: {
      type: "GROUP",
      name: name.trim(),
    },
  });

  for (const memberId of allMembers) {
    await prisma.chatParticipant.create({
      data: {
        conversationId: conversation.id,
        userId: memberId,
        role: memberId === userId ? "ADMIN" : "MEMBER",
      },
    });
  }

  return { success: true, conversationId: conversation.id };
}

// ─── List conversations ──────────────────────────────────
export async function getConversations() {
  const userId = await requireChatUser();

  const conversations = await prisma.chatConversation.findMany({
    where: {
      participants: { some: { userId } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
          sender: {
            select: { name: true },
          },
        },
      },
    },
  });

  return conversations.map((conv) => {
    const myParticipant = conv.participants.find((p) => p.userId === userId);
    const lastMessage = conv.messages[0] ?? null;

    // Count unread: messages after my lastReadAt
    const unreadCount = myParticipant?.lastReadAt
      ? 0 // We'll calculate properly with a count query below
      : lastMessage
        ? 1
        : 0;

    return {
      id: conv.id,
      type: conv.type,
      name:
        conv.type === "GROUP"
          ? conv.name
          : conv.participants
              .filter((p) => p.userId !== userId)
              .map((p) => `${p.user.name} ${p.user.lastName ?? ""}`.trim())
              .join(", "),
      imageUrl: conv.imageUrl,
      participants: conv.participants.map((p) => p.user),
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            senderName: lastMessage.sender.name,
            createdAt: lastMessage.createdAt,
            isMe: lastMessage.senderId === userId,
          }
        : null,
      unreadCount,
      updatedAt: conv.updatedAt,
    };
  });
}

// ─── Get messages for a conversation ─────────────────────
export async function getMessages(
  conversationId: string,
  cursor?: string,
  limit = 30
) {
  const userId = await requireChatUser();

  // Verify participation
  const participant = await prisma.chatParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!participant) {
    return { success: false, error: "No participás en esta conversación." };
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Mark as read
  await prisma.chatParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return {
    success: true,
    messages: items.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt,
      sender: m.sender,
      isMe: m.senderId === userId,
    })),
    nextCursor: hasMore ? items[0]?.id : null,
  };
}

// ─── Send message ────────────────────────────────────────
export async function sendMessage(
  conversationId: string,
  formData: FormData
) {
  const userId = await requireChatUser();
  const content = (formData.get("content") as string)?.trim();

  if (!content || content.length === 0) {
    return { success: false, error: "El mensaje no puede estar vacío." };
  }
  if (content.length > 2000) {
    return {
      success: false,
      error: "El mensaje no puede superar los 2000 caracteres.",
    };
  }

  // Verify participation
  const participant = await prisma.chatParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!participant) {
    return { success: false, error: "No participás en esta conversación." };
  }

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        type: "TEXT",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    }),
    // Update conversation timestamp
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
    // Mark sender's own read
    prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    }),
  ]);

  revalidatePath(`/comunidad/chat/${conversationId}`);

  return {
    success: true,
    message: {
      id: message.id,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
      sender: message.sender,
      isMe: true,
    },
  };
}

// ─── Get conversation info ──────────────────────────────
export async function getConversationInfo(conversationId: string) {
  const userId = await requireChatUser();

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) return null;

  // Verify participation
  const isParticipant = conversation.participants.some(
    (p) => p.userId === userId
  );
  if (!isParticipant) return null;

  return {
    id: conversation.id,
    type: conversation.type,
    name:
      conversation.type === "GROUP"
        ? conversation.name
        : conversation.participants
            .filter((p) => p.userId !== userId)
            .map((p) => `${p.user.name} ${p.user.lastName ?? ""}`.trim())
            .join(", "),
    imageUrl: conversation.imageUrl,
    participants: conversation.participants.map((p) => ({
      ...p.user,
      role: p.role,
    })),
  };
}
