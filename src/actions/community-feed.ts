"use server";

import { prisma } from "@/lib/prisma";
import { readUserSessionId } from "@/lib/user-session";
import { requireTenantFeature } from "@/lib/features";
import { revalidatePath } from "next/cache";

// ─── Helpers ──────────────────────────────────────────────
async function requireCommunityUser() {
  await requireTenantFeature("community");
  const userId = await readUserSessionId();
  if (!userId) throw new Error("AUTH_REQUIRED");
  return userId;
}

// ─── Feed queries ─────────────────────────────────────────
export async function getFeedPosts(cursor?: string, limit = 20) {
  await requireTenantFeature("community");
  const userId = await readUserSessionId();

  const posts = await prisma.post.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: {
        select: {
          id: true,
          name: true,
          lastName: true,
          avatarUrl: true,
          category: true,
        },
      },
      _count: { select: { likes: true, comments: true } },
      ...(userId
        ? { likes: { where: { userId }, select: { id: true } } }
        : {}),
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;

  return {
    posts: items.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      type: p.type,
      isPinned: p.isPinned,
      createdAt: p.createdAt,
      author: p.author,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      isLikedByMe: userId ? (p.likes as { id: string }[]).length > 0 : false,
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
  };
}

// ─── Create post ──────────────────────────────────────────
export async function createPost(formData: FormData) {
  const userId = await requireCommunityUser();
  const content = (formData.get("content") as string)?.trim();
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;

  if (!content && !imageUrl) {
    return { success: false, error: "Debes escribir un mensaje o adjuntar una imagen." };
  }
  if (content && content.length > 2000) {
    return {
      success: false,
      error: "El contenido no puede superar los 2000 caracteres.",
    };
  }

  try {
    await prisma.post.create({
      data: {
        authorId: userId,
        content: content || "",
        imageUrl: imageUrl || null,
        type: "PLAYER",
      },
    });
    revalidatePath("/comunidad");
    return { success: true };
  } catch (error) {
    console.error("Create post error:", error);
    return { success: false, error: "Error al publicar." };
  }
}

// ─── Toggle like ──────────────────────────────────────────
export async function toggleLike(postId: string) {
  const userId = await requireCommunityUser();

  try {
    const existing = await prisma.postLike.findFirst({
      where: { postId, userId },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.postLike.create({
        data: { postId, userId },
      });

      // Notificar al autor de la publicación si no es el mismo usuario
      try {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        if (post && post.authorId !== userId) {
          const actor = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, lastName: true },
          });
          const actorName = actor ? `${actor.name} ${actor.lastName || ''}`.trim() : 'Un jugador';
          await prisma.communityNotification.create({
            data: {
              userId: post.authorId,
              type: 'POST_LIKE',
              title: '¡Le gustó tu publicación! ❤️',
              body: `A ${actorName} le gustó tu publicación en el muro.`,
              linkUrl: '/comunidad',
            },
          });
        }
      } catch (e) {
        console.error('Error creating like notification:', e);
      }
    }
    revalidatePath("/comunidad");
    return { success: true, liked: !existing };
  } catch (error) {
    console.error("Toggle like error:", error);
    return { success: false, error: "Error al procesar el like." };
  }
}

// ─── Add comment ──────────────────────────────────────────
export async function addComment(postId: string, formData: FormData) {
  const userId = await requireCommunityUser();
  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length === 0) {
    return { success: false, error: "El comentario no puede estar vacío." };
  }
  if (content.length > 500) {
    return {
      success: false,
      error: "El comentario no puede superar los 500 caracteres.",
    };
  }

  try {
    await prisma.postComment.create({
      data: {
        postId,
        authorId: userId,
        content,
      },
    });

    // Notificar al autor de la publicación si no es el mismo usuario
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (post && post.authorId !== userId) {
        const actor = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, lastName: true },
        });
        const actorName = actor ? `${actor.name} ${actor.lastName || ''}`.trim() : 'Un jugador';
        await prisma.communityNotification.create({
          data: {
            userId: post.authorId,
            type: 'POST_COMMENT',
            title: 'Nuevo comentario en tu publicación 💬',
            body: `${actorName} comentó: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
            linkUrl: '/comunidad',
          },
        });
      }
    } catch (e) {
      console.error('Error creating comment notification:', e);
    }

    revalidatePath("/comunidad");
    return { success: true };
  } catch (error) {
    console.error("Add comment error:", error);
    return { success: false, error: "Error al comentar." };
  }
}

// ─── Get comments for a post ──────────────────────────────
export async function getPostComments(postId: string) {
  await requireTenantFeature("community");

  const comments = await prisma.postComment.findMany({
    where: { postId, isActive: true },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return comments;
}

// ─── Delete post (author or admin) ────────────────────────
export async function deletePost(postId: string) {
  const userId = await requireCommunityUser();

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { success: false, error: "Post no encontrado." };

  // Check if author or admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (post.authorId !== userId && user?.role !== "ADMIN") {
    return { success: false, error: "No tenés permiso para eliminar este post." };
  }

  await prisma.post.update({
    where: { id: postId },
    data: { isActive: false },
  });

  revalidatePath("/comunidad");
  return { success: true };
}

// ─── Get latest posts for preview ticker/cards ───────────
export async function getLatestCommunityPosts(limit = 3) {
  try {
    const posts = await prisma.post.findMany({
      where: { isActive: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      type: p.type,
      isPinned: p.isPinned,
      createdAt: p.createdAt,
      authorName:
        p.type === "CLUB_ANNOUNCEMENT"
          ? "Club Oficial"
          : `${p.author.name || "Jugador"} ${p.author.lastName || ""}`.trim(),
      authorAvatar: p.author.avatarUrl,
    }));
  } catch (error) {
    console.error("Error fetching latest community posts:", error);
    return [];
  }
}
