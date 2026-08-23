'use server';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function checkUserDniAdmin(dni: string) {
    try {
        const cleanDni = dni.trim().replace(/\D/g, '');
        if (!cleanDni) return { exists: false, error: "DNI vacío" };

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { dni: cleanDni },
                    { dni: dni.trim() }
                ]
            },
            select: { 
                id: true, 
                name: true, 
                lastName: true, 
                dni: true, 
                phone: true, 
                category: true,
                isActive: true
            }
        });

        if (user) {
            return { exists: true, user };
        }
        return { exists: false };
    } catch (error) {
        console.error("Error checking DNI:", error);
        return { exists: false, error: "Error al verificar DNI." };
    }
}

export async function createUserAdmin(data: {
    dni: string;
    name: string;
    lastName: string;
    phone: string;
    email?: string;
    category?: string;
    password?: string;
}) {
    try {
        const cleanDni = data.dni.trim();
        if (!cleanDni) return { success: false, error: "El DNI es obligatorio." };

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { dni: cleanDni },
                    { dni: cleanDni.replace(/\D/g, '') }
                ]
            }
        });

        if (existing) {
            return { success: false, error: `Ya existe un jugador registrado con el DNI ${cleanDni} (${existing.name} ${existing.lastName || ''}).` };
        }

        let hashedPassword = null;
        if (data.password && data.password.trim() !== "") {
            hashedPassword = await bcrypt.hash(data.password.trim(), 10);
        }

        const cleanCategory = data.category?.trim() || null;

        const user = await prisma.user.create({
            data: {
                dni: cleanDni,
                name: data.name.trim(),
                lastName: data.lastName.trim(),
                phone: data.phone?.trim() || null,
                email: data.email?.trim() || null,
                category: cleanCategory,
                password: hashedPassword,
                role: "PLAYER",
                isActive: true,
            }
        });

        if (cleanCategory) {
            let level = await prisma.playerCategoryLevel.findFirst({
                where: { name: cleanCategory }
            });

            if (!level) {
                level = await prisma.playerCategoryLevel.create({
                    data: {
                        name: cleanCategory,
                        color: '#3b82f6',
                        displayOrder: 1,
                        isPublished: true,
                    }
                });
            }

            await prisma.playerCategoryAssignment.create({
                data: {
                    userId: user.id,
                    levelId: level.id,
                    isPublished: true,
                }
            });
        }

        revalidatePath("/admin/usuarios");
        revalidatePath("/admin/categorias-jugadores");
        revalidatePath("/categorias-jugadores");
        revalidatePath("/perfil");
        revalidatePath("/");
        return { success: true, user };
    } catch (error) {
        console.error("Error creating user:", error);
        return { success: false, error: "Error al crear el usuario." };
    }
}

export async function updateUserAdmin(userId: string, data: {
    name: string;
    lastName: string;
    phone: string;
    category: string;
    isActive: boolean;
    password?: string;
}) {
    try {
        const cleanCategory = data.category?.trim() || null;
        const updateData: any = {
            name: data.name?.trim() || null,
            lastName: data.lastName?.trim() || null,
            phone: data.phone?.trim() || null,
            category: cleanCategory,
            isActive: data.isActive,
        };

        if (data.password && data.password.trim() !== "") {
            updateData.password = await bcrypt.hash(data.password.trim(), 10);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        // Sincronizar con PlayerCategoryAssignment para retroalimentar la tabla de categorías
        if (cleanCategory) {
            let level = await prisma.playerCategoryLevel.findFirst({
                where: { name: cleanCategory }
            });

            if (!level) {
                level = await prisma.playerCategoryLevel.create({
                    data: {
                        name: cleanCategory,
                        color: '#3b82f6',
                        displayOrder: 1,
                        isPublished: true,
                    }
                });
            }

            const existingAssignment = await prisma.playerCategoryAssignment.findFirst({
                where: { userId }
            });

            if (existingAssignment) {
                await prisma.playerCategoryAssignment.update({
                    where: { id: existingAssignment.id },
                    data: { levelId: level.id, isPublished: true }
                });
            } else {
                await prisma.playerCategoryAssignment.create({
                    data: { userId, levelId: level.id, isPublished: true }
                });
            }
        } else {
            // Si se quitó la categoría, eliminar asignación
            await prisma.playerCategoryAssignment.deleteMany({
                where: { userId }
            });
        }

        revalidatePath("/admin/usuarios");
        revalidatePath("/admin/categorias-jugadores");
        revalidatePath("/categorias-jugadores");
        revalidatePath("/perfil");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error updating user:", error);
        return { success: false, error: "Error al actualizar el usuario." };
    }
}
