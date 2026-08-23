'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

const categorySchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, 'Ingresá un nombre de categoría.').max(80),
  description: z.string().trim().max(500).optional(),
  isPublished: z.boolean(),
  displayOrder: z.number().int().min(0).max(999),
  sortMode: z.enum(['POINTS', 'MANUAL']),
  showPoints: z.boolean(),
  showPlayed: z.boolean(),
  showWon: z.boolean(),
  showLost: z.boolean(),
});

const entrySchema = z.object({
  id: z.string().trim().optional(),
  categoryId: z.string().trim().min(1),
  userId: z.string().trim().nullable().optional(),
  externalName: z.string().trim().max(120).nullable().optional(),
  externalPhone: z.string().trim().max(40).nullable().optional(),
  manualPosition: z.number().int().min(0).max(9999),
  points: z.number().int().min(-999999).max(999999),
  matchesPlayed: z.number().int().min(0).max(99999),
  matchesWon: z.number().int().min(0).max(99999),
  matchesLost: z.number().int().min(0).max(99999),
  notes: z.string().trim().max(500).nullable().optional(),
});

function refreshRankings() {
  revalidatePath('/admin/rankings');
  revalidatePath('/ranking');
  revalidatePath('/');
}

export async function saveRankingCategory(input: z.input<typeof categorySchema>) {
  try {
    await requireAdmin();
    const data = categorySchema.parse(input);
    if (data.id) {
      await prisma.rankingCategory.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description || null,
          isPublished: data.isPublished,
          displayOrder: data.displayOrder,
          sortMode: data.sortMode,
          showPoints: data.showPoints,
          showPlayed: data.showPlayed,
          showWon: data.showWon,
          showLost: data.showLost,
        },
      });
    } else {
      await prisma.rankingCategory.create({
        data: {
          name: data.name,
          description: data.description || null,
          isPublished: data.isPublished,
          displayOrder: data.displayOrder,
          sortMode: data.sortMode,
          showPoints: data.showPoints,
          showPlayed: data.showPlayed,
          showWon: data.showWon,
          showLost: data.showLost,
        },
      });
    }
    refreshRankings();
    return { success: true };
  } catch (error) {
    console.error('saveRankingCategory:', error);
    return { success: false, error: error instanceof z.ZodError ? error.issues[0]?.message : 'No se pudo guardar la categoría.' };
  }
}

export async function deleteRankingCategory(id: string) {
  try {
    await requireAdmin();
    await prisma.rankingCategory.delete({ where: { id } });
    refreshRankings();
    return { success: true };
  } catch (error) {
    console.error('deleteRankingCategory:', error);
    return { success: false, error: 'No se pudo eliminar la categoría.' };
  }
}

export async function saveRankingEntry(input: z.input<typeof entrySchema>) {
  try {
    await requireAdmin();
    const data = entrySchema.parse(input);
    const userId = data.userId || null;
    const externalName = data.externalName?.trim() || null;
    if (!userId && !externalName) return { success: false, error: 'Elegí un usuario registrado o ingresá un nombre externo.' };
    if (userId && externalName) return { success: false, error: 'La posición debe pertenecer a un usuario registrado o a una persona externa, no a ambos.' };
    if (data.matchesWon + data.matchesLost > data.matchesPlayed) {
      return { success: false, error: 'Los partidos ganados y perdidos no pueden superar los jugados.' };
    }

    const payload = {
      categoryId: data.categoryId,
      userId,
      externalName,
      externalPhone: userId ? null : data.externalPhone?.trim() || null,
      manualPosition: data.manualPosition,
      points: data.points,
      matchesPlayed: data.matchesPlayed,
      matchesWon: data.matchesWon,
      matchesLost: data.matchesLost,
      notes: data.notes?.trim() || null,
    };

    if (data.id) {
      await prisma.rankingEntry.update({ where: { id: data.id }, data: payload });
    } else {
      if (userId) {
        const existing = await prisma.rankingEntry.findUnique({
          where: { categoryId_userId: { categoryId: data.categoryId, userId } },
        });
        if (existing) return { success: false, error: 'Ese usuario ya está incluido en la categoría.' };
      }
      await prisma.rankingEntry.create({ data: payload });
    }
    refreshRankings();
    return { success: true };
  } catch (error) {
    console.error('saveRankingEntry:', error);
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0]?.message };
    return { success: false, error: 'No se pudo guardar la persona en el ranking.' };
  }
}

export async function deleteRankingEntry(id: string) {
  try {
    await requireAdmin();
    await prisma.rankingEntry.delete({ where: { id } });
    refreshRankings();
    return { success: true };
  } catch (error) {
    console.error('deleteRankingEntry:', error);
    return { success: false, error: 'No se pudo quitar la persona del ranking.' };
  }
}
