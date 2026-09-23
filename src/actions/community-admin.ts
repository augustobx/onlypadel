'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { revalidatePath } from 'next/cache';
import type { PostType } from '@prisma/client';

export async function getAdminPosts(params?: {
  page?: number;
  type?: PostType;
  search?: string;
}) {
  try {
    await requireAdmin();
    const page = params?.page || 1;
    const limit = 30;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.type) {
      where.type = params.type;
    }
    if (params?.search) {
      where.content = { contains: params.search };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              lastName: true,
              avatarUrl: true,
              role: true,
              email: true,
              dni: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return {
      success: true,
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
        type: p.type,
        isPinned: p.isPinned,
        isActive: p.isActive,
        createdAt: p.createdAt,
        author: p.author,
        likesCount: p._count.likes,
        commentsCount: p._count.comments,
      })),
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    return { success: false, error: 'Error al obtener publicaciones para moderación.', posts: [], total: 0, totalPages: 0 };
  }
}

export async function togglePostVisibility(postId: string) {
  try {
    await requireAdmin();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isActive: true },
    });

    if (!post) return { success: false, error: 'Publicación no encontrada.' };

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isActive: !post.isActive },
    });

    revalidatePath('/comunidad');
    revalidatePath('/admin/comunidad');

    return { success: true, isActive: updated.isActive };
  } catch (error) {
    console.error('Error toggling post visibility:', error);
    return { success: false, error: 'No se pudo actualizar el estado de la publicación.' };
  }
}

export async function togglePostPinned(postId: string) {
  try {
    await requireAdmin();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isPinned: true },
    });

    if (!post) return { success: false, error: 'Publicación no encontrada.' };

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });

    revalidatePath('/comunidad');
    revalidatePath('/admin/comunidad');

    return { success: true, isPinned: updated.isPinned };
  } catch (error) {
    console.error('Error toggling pin:', error);
    return { success: false, error: 'No se pudo fijar la publicación.' };
  }
}

export async function deletePostPermanently(postId: string) {
  try {
    await requireAdmin();

    await prisma.post.delete({
      where: { id: postId },
    });

    revalidatePath('/comunidad');
    revalidatePath('/admin/comunidad');

    return { success: true };
  } catch (error) {
    console.error('Error deleting post permanently:', error);
    return { success: false, error: 'No se pudo eliminar la publicación.' };
  }
}

export async function createClubAnnouncement(data: {
  content: string;
  imageUrl?: string;
  isPinned?: boolean;
}) {
  try {
    const admin = await requireAdmin();

    if (!data.content || data.content.trim().length === 0) {
      return { success: false, error: 'El contenido del comunicado no puede estar vacío.' };
    }

    const rawImage = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';
    const cleanImageUrl = rawImage && !rawImage.startsWith('$') && rawImage !== 'undefined' && rawImage !== 'null' ? rawImage : null;

    const post = await prisma.post.create({
      data: {
        authorId: admin.userId,
        type: 'CLUB_ANNOUNCEMENT',
        content: data.content.trim(),
        imageUrl: cleanImageUrl,
        isPinned: data.isPinned ?? true,
        isActive: true,
      },
    });

    // Notificar a los jugadores activos del club sobre el nuevo comunicado
    try {
      const players = await prisma.user.findMany({
        where: { role: 'PLAYER', isActive: true },
        select: { id: true },
        take: 100,
      });
      for (const p of players) {
        await prisma.communityNotification.create({
          data: {
            userId: p.id,
            type: 'CLUB_ANNOUNCEMENT',
            title: '📢 Nuevo Comunicado Oficial del Club',
            body: data.content.trim().slice(0, 90) + (data.content.trim().length > 90 ? '...' : ''),
            linkUrl: '/comunidad',
          },
        });
      }
    } catch (e) {
      console.error('Error sending announcement notifications:', e);
    }

    revalidatePath('/comunidad');
    revalidatePath('/admin/comunidad');

    return { success: true, postId: post.id };
  } catch (error) {
    console.error('Error creating club announcement:', error);
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo crear el comunicado del club.' };
  }
}

export async function getAdminConversations() {
  try {
    await requireAdmin();

    const conversations = await prisma.chatConversation.findMany({
      orderBy: { updatedAt: 'desc' },
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
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      success: true,
      conversations: conversations.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        totalMessages: c._count.messages,
        updatedAt: c.updatedAt,
        participants: c.participants.map((p) => p.user),
        lastMessage: c.messages[0]
          ? {
              content: c.messages[0].isDeleted ? '[Mensaje moderado]' : c.messages[0].content,
              senderName: `${c.messages[0].sender.name || ''} ${c.messages[0].sender.lastName || ''}`.trim(),
              createdAt: c.messages[0].createdAt,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error('Error fetching admin conversations:', error);
    return { success: false, error: 'Error al cargar chats para moderación.', conversations: [] };
  }
}

export async function getAdminConversationMessages(conversationId: string) {
  try {
    await requireAdmin();

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarUrl: true,
            dni: true,
          },
        },
      },
    });

    return {
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        isDeleted: m.isDeleted,
        createdAt: m.createdAt,
        sender: m.sender,
      })),
    };
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return { success: false, error: 'Error al obtener mensajes de la conversación.', messages: [] };
  }
}

export async function moderateChatMessage(messageId: string) {
  try {
    await requireAdmin();

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: '🚫 [Este mensaje fue eliminado por un administrador del club]',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error moderating message:', error);
    return { success: false, error: 'No se pudo moderar el mensaje.' };
  }
}

export async function getAdminCommunityStats() {
  try {
    await requireAdmin();

    const [totalPosts, totalAnnouncements, activeMatches, totalMessages, playersWithAvatar] = await Promise.all([
      prisma.post.count({ where: { isActive: true } }),
      prisma.post.count({ where: { type: 'CLUB_ANNOUNCEMENT', isActive: true } }),
      prisma.openMatch.count({ where: { status: 'OPEN' } }),
      prisma.chatMessage.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { role: 'PLAYER', isActive: true, avatarUrl: { not: null } } }),
    ]);

    return {
      success: true,
      stats: {
        totalPosts,
        totalAnnouncements,
        activeMatches,
        totalMessages,
        playersWithAvatar,
      },
    };
  } catch (error) {
    console.error('Error fetching admin community stats:', error);
    return {
      success: false,
      stats: {
        totalPosts: 0,
        totalAnnouncements: 0,
        activeMatches: 0,
        totalMessages: 0,
        playersWithAvatar: 0,
      },
    };
  }
}
