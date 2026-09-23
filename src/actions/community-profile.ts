"use server";

import { prisma } from "@/lib/prisma";
import { readUserSessionId } from "@/lib/user-session";
import { requireTenantFeature } from "@/lib/features";
import { revalidatePath } from "next/cache";

// ─── Update enriched profile ────────────────────────────
export async function updateCommunityProfile(formData: FormData) {
  await requireTenantFeature("community");
  const userId = await readUserSessionId();
  if (!userId) throw new Error("AUTH_REQUIRED");

  const bio = (formData.get("bio") as string)?.trim() || null;
  const avatarUrl = (formData.get("avatarUrl") as string)?.trim() || undefined;
  const preferredPosition =
    (formData.get("preferredPosition") as string) || null;
  const availableTimeSlot =
    (formData.get("availableTimeSlot") as string) || null;
  const lookingForPartner = formData.get("lookingForPartner") === "true";
  const isProfilePublic = formData.get("isProfilePublic") !== "false";

  // Parse available days from checkboxes
  const allDays = [
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
  ];
  const availableDays = allDays.filter(
    (day) => formData.get(`day_${day}`) === "on"
  );

  if (bio && bio.length > 300) {
    return { success: false, error: "La bio no puede superar los 300 caracteres." };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        bio,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        preferredPosition: preferredPosition as
          | "DRIVE"
          | "REVES"
          | "AMBOS"
          | null,
        availableDays: availableDays.length > 0 ? availableDays : undefined,
        availableTimeSlot,
        lookingForPartner,
        isProfilePublic,
      },
    });

    revalidatePath("/comunidad");
    revalidatePath("/perfil");
    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: "Error al actualizar el perfil." };
  }
}

// ─── Get public profile ─────────────────────────────────
export async function getPublicProfile(userId: string) {
  await requireTenantFeature("community");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      lastName: true,
      avatarUrl: true,
      bio: true,
      category: true,
      preferredPosition: true,
      availableDays: true,
      availableTimeSlot: true,
      isProfilePublic: true,
      lookingForPartner: true,
      createdAt: true,
      playerCategoryAssignments: {
        where: { isPublished: true },
        include: {
          level: { select: { name: true, color: true } },
        },
        take: 1,
      },
      _count: {
        select: { posts: true },
      },
    },
  });

  if (!user || !user.isProfilePublic) return null;

  return {
    ...user,
    categoryLevel: user.playerCategoryAssignments[0]?.level ?? null,
    postsCount: user._count.posts,
  };
}

// ─── Search players ─────────────────────────────────────
export async function searchPlayers(filters?: {
  search?: string;
  categoryLevelId?: string;
  availableDay?: string;
  availableTimeSlot?: string;
  lookingForPartner?: boolean;
  cursor?: string;
  limit?: number;
}) {
  await requireTenantFeature("community");

  const limit = filters?.limit ?? 20;
  const where: Record<string, unknown> = {
    isActive: true,
    isProfilePublic: true,
    role: "PLAYER",
  };

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { lastName: { contains: filters.search } },
    ];
  }

  if (filters?.lookingForPartner) {
    where.lookingForPartner = true;
  }

  if (filters?.availableTimeSlot) {
    where.availableTimeSlot = filters.availableTimeSlot;
  }

  if (filters?.availableDay) {
    // JSON contains for the day string within the array
    where.availableDays = { array_contains: filters.availableDay };
  }

  const players = await prisma.user.findMany({
    where,
    orderBy: [{ lookingForPartner: "desc" }, { name: "asc" }],
    take: limit + 1,
    ...(filters?.cursor
      ? { cursor: { id: filters.cursor }, skip: 1 }
      : {}),
    select: {
      id: true,
      name: true,
      lastName: true,
      avatarUrl: true,
      bio: true,
      category: true,
      preferredPosition: true,
      availableDays: true,
      availableTimeSlot: true,
      lookingForPartner: true,
      playerCategoryAssignments: {
        where: { isPublished: true },
        include: {
          level: { select: { id: true, name: true, color: true } },
        },
        take: 1,
      },
    },
  });

  const hasMore = players.length > limit;
  const items = hasMore ? players.slice(0, limit) : players;

  return {
    players: items.map((p) => ({
      ...p,
      categoryLevel: p.playerCategoryAssignments[0]?.level ?? null,
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
  };
}
