'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { normalizeHexColor } from '@/lib/color';

const levelSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Ingresá el nombre de la categoría.').max(60),
  description: z.string().trim().max(300).optional(),
  color: z.string().trim(),
  displayOrder: z.number().int().min(0).max(999),
  isPublished: z.boolean(),
});

const assignmentSchema = z.object({
  id: z.string().optional(),
  levelId: z.string().min(1, 'Elegí una categoría.'),
  userId: z.string().nullable().optional(),
  externalName: z.string().trim().max(120).nullable().optional(),
  externalPhone: z.string().trim().max(40).nullable().optional(),
  publicNote: z.string().trim().max(300).nullable().optional(),
  isPublished: z.boolean(),
});

function refresh() {
  revalidatePath('/admin/categorias-jugadores');
  revalidatePath('/categorias-jugadores');
  revalidatePath('/');
}

export async function savePlayerCategoryLevel(input: z.input<typeof levelSchema>) {
  try {
    await requireAdmin();
    const data = levelSchema.parse(input);
    const payload = { name: data.name, description: data.description || null, color: normalizeHexColor(data.color, '#10b981'), displayOrder: data.displayOrder, isPublished: data.isPublished };
    if (data.id) await prisma.playerCategoryLevel.update({ where: { id: data.id }, data: payload });
    else await prisma.playerCategoryLevel.create({ data: payload });
    refresh();
    return { success: true };
  } catch (error) {
    console.error('savePlayerCategoryLevel:', error);
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0]?.message };
    return { success: false, error: 'No se pudo guardar la categoría. Verificá que el nombre no esté repetido.' };
  }
}

export async function deletePlayerCategoryLevel(id: string) {
  try {
    await requireAdmin();
    const count = await prisma.playerCategoryAssignment.count({ where: { levelId: id } });
    if (count) return { success: false, error: 'Reasigná o eliminá sus jugadores antes de borrar esta categoría.' };
    await prisma.playerCategoryLevel.delete({ where: { id } });
    refresh();
    return { success: true };
  } catch (error) {
    console.error('deletePlayerCategoryLevel:', error);
    return { success: false, error: 'No se pudo eliminar la categoría.' };
  }
}

export async function savePlayerCategoryAssignment(input: z.input<typeof assignmentSchema>) {
  try {
    await requireAdmin();
    const data = assignmentSchema.parse(input);
    const userId = data.userId || null;
    const externalName = data.externalName?.trim() || null;
    if ((!userId && !externalName) || (userId && externalName)) return { success: false, error: 'Elegí un usuario registrado o ingresá una persona externa.' };
    const payload = { levelId: data.levelId, userId, externalName, externalPhone: userId ? null : data.externalPhone?.trim() || null, publicNote: data.publicNote?.trim() || null, isPublished: data.isPublished };
    if (data.id) await prisma.playerCategoryAssignment.update({ where: { id: data.id }, data: payload });
    else await prisma.playerCategoryAssignment.create({ data: payload });
    if (userId) {
      const level = await prisma.playerCategoryLevel.findUnique({ where: { id: data.levelId }, select: { name: true } });
      if (level) await prisma.user.update({ where: { id: userId }, data: { category: level.name } });
    }
    refresh();
    return { success: true };
  } catch (error) {
    console.error('savePlayerCategoryAssignment:', error);
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0]?.message };
    return { success: false, error: 'No se pudo guardar. Ese usuario puede tener ya una categoría asignada.' };
  }
}

export async function deletePlayerCategoryAssignment(id: string) {
  try {
    await requireAdmin();
    const current = await prisma.playerCategoryAssignment.findUnique({ where: { id }, select: { userId: true } });
    await prisma.playerCategoryAssignment.delete({ where: { id } });
    if (current?.userId) await prisma.user.update({ where: { id: current.userId }, data: { category: null } });
    refresh();
    return { success: true };
  } catch (error) {
    console.error('deletePlayerCategoryAssignment:', error);
    return { success: false, error: 'No se pudo quitar al jugador.' };
  }
}
