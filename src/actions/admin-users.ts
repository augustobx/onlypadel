'use server';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { normalizePhoneNumber } from "@/lib/phone";
import { requireAdmin } from "@/lib/admin-auth";

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

        const cleanPhone = normalizePhoneNumber(data.phone) || null;

        const user = await prisma.user.create({
            data: {
                dni: cleanDni,
                name: data.name.trim(),
                lastName: data.lastName.trim(),
                phone: cleanPhone,
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
        const cleanPhone = normalizePhoneNumber(data.phone) || null;
        const updateData: any = {
            name: data.name?.trim() || null,
            lastName: data.lastName?.trim() || null,
            phone: cleanPhone,
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

/**
 * Encuentra grupos de usuarios potencialmente duplicados (mismo teléfono normalizado, mismo email o mismo DNI)
 */
export async function findDuplicateUsersAdmin() {
    try {
        await requireAdmin();
        const users = await prisma.user.findMany({
            where: { role: 'PLAYER' },
            select: {
                id: true,
                name: true,
                lastName: true,
                phone: true,
                email: true,
                dni: true,
                createdAt: true,
                isActive: true,
                password: true,
                _count: {
                    select: {
                        bookings: true,
                        fixedBookings: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Mapear por teléfono normalizado
        const phoneGroups: Record<string, typeof users> = {};
        // Mapear por email
        const emailGroups: Record<string, typeof users> = {};
        // Mapear por DNI
        const dniGroups: Record<string, typeof users> = {};

        for (const user of users) {
            const normPhone = normalizePhoneNumber(user.phone);
            if (normPhone && normPhone.length >= 6) {
                if (!phoneGroups[normPhone]) phoneGroups[normPhone] = [];
                phoneGroups[normPhone].push(user);
            }

            if (user.email && !user.email.endsWith('@local.onlypadel')) {
                const normEmail = user.email.trim().toLowerCase();
                if (!emailGroups[normEmail]) emailGroups[normEmail] = [];
                emailGroups[normEmail].push(user);
            }

            if (user.dni && user.dni.trim().length >= 5) {
                const normDni = user.dni.trim().replace(/\D/g, '');
                if (!dniGroups[normDni]) dniGroups[normDni] = [];
                dniGroups[normDni].push(user);
            }
        }

        // Combinar grupos duplicados
        const duplicateGroups: Array<{
            criterion: 'phone' | 'email' | 'dni';
            matchKey: string;
            users: Array<{
                id: string;
                name: string | null;
                lastName: string | null;
                phone: string | null;
                email: string | null;
                dni: string | null;
                hasPassword: boolean;
                bookingsCount: number;
                createdAt: Date;
            }>;
        }> = [];

        const seenUserPairs = new Set<string>();

        const addGroup = (criterion: 'phone' | 'email' | 'dni', key: string, groupUsers: typeof users) => {
            if (groupUsers.length < 2) return;
            // Evitar reportar duplicados idénticos repetidos
            const idsKey = groupUsers.map(u => u.id).sort().join(',');
            if (seenUserPairs.has(idsKey)) return;
            seenUserPairs.add(idsKey);

            duplicateGroups.push({
                criterion,
                matchKey: key,
                users: groupUsers.map(u => ({
                    id: u.id,
                    name: u.name,
                    lastName: u.lastName,
                    phone: u.phone,
                    email: u.email,
                    dni: u.dni,
                    hasPassword: Boolean(u.password),
                    bookingsCount: u._count.bookings + u._count.fixedBookings,
                    createdAt: u.createdAt,
                }))
            });
        };

        for (const [phone, group] of Object.entries(phoneGroups)) {
            addGroup('phone', phone, group);
        }
        for (const [email, group] of Object.entries(emailGroups)) {
            addGroup('email', email, group);
        }
        for (const [dni, group] of Object.entries(dniGroups)) {
            addGroup('dni', dni, group);
        }

        return { success: true, data: duplicateGroups };
    } catch (error: any) {
        console.error("Error finding duplicates:", error);
        return { success: false, error: 'Error al buscar cuentas duplicadas.' };
    }
}

/**
 * Unifica dos cuentas de usuario: transfiere todas las reservas, suscripciones y datos
 * de la cuenta 'sourceUserId' hacia la cuenta 'targetUserId', y elimina/desactiva 'sourceUserId'.
 */
export async function mergeUserAccountsAdmin(targetUserId: string, sourceUserId: string) {
    try {
        await requireAdmin();
        if (targetUserId === sourceUserId) {
            return { success: false, error: 'No podés unificar un usuario consigo mismo.' };
        }

        const [targetUser, sourceUser] = await Promise.all([
            prisma.user.findUnique({ where: { id: targetUserId } }),
            prisma.user.findUnique({ where: { id: sourceUserId } })
        ]);

        if (!targetUser || !sourceUser) {
            return { success: false, error: 'Uno o ambos usuarios no existen.' };
        }

        await prisma.$transaction(async (tx) => {
            // 1. Reasignar reservas normales
            await tx.booking.updateMany({
                where: { userId: sourceUserId },
                data: { userId: targetUserId }
            });

            // 2. Reasignar abonos fijos
            await tx.fixedBooking.updateMany({
                where: { userId: sourceUserId },
                data: { userId: targetUserId }
            });

            // 3. Reasignar suscripciones push
            await tx.pushSubscription.updateMany({
                where: { userId: sourceUserId },
                data: { userId: targetUserId }
            });

            // 4. Reasignar mensajes y participantes de chat si existen
            await tx.chatParticipant.updateMany({
                where: { userId: sourceUserId },
                data: { userId: targetUserId }
            }).catch(() => {});

            await tx.chatMessage.updateMany({
                where: { senderId: sourceUserId },
                data: { senderId: targetUserId }
            }).catch(() => {});

            // 5. Reasignar OpenMatch creados
            await tx.openMatch.updateMany({
                where: { creatorId: sourceUserId },
                data: { creatorId: targetUserId }
            }).catch(() => {});

            // 6. Completar datos faltantes en targetUser si sourceUser los tiene
            const updatePayload: any = {};
            if (!targetUser.phone && sourceUser.phone) updatePayload.phone = normalizePhoneNumber(sourceUser.phone);
            if (!targetUser.email && sourceUser.email && !sourceUser.email.endsWith('@local.onlypadel')) updatePayload.email = sourceUser.email;
            if (!targetUser.dni && sourceUser.dni) updatePayload.dni = sourceUser.dni;
            if (!targetUser.lastName && sourceUser.lastName) updatePayload.lastName = sourceUser.lastName;
            if (!targetUser.password && sourceUser.password) updatePayload.password = sourceUser.password;
            if (!targetUser.category && sourceUser.category) updatePayload.category = sourceUser.category;

            if (Object.keys(updatePayload).length > 0) {
                await tx.user.update({
                    where: { id: targetUserId },
                    data: updatePayload
                });
            }

            // 7. Eliminar de forma segura la cuenta duplicada
            await tx.user.delete({
                where: { id: sourceUserId }
            }).catch(async () => {
                // Si hay llaves foráneas estrictas restantes, desactivarla
                await tx.user.update({
                    where: { id: sourceUserId },
                    data: {
                        isActive: false,
                        phone: `MERGED_${Date.now()}_${sourceUser.phone || ''}`,
                        email: `merged_${Date.now()}@local.onlypadel`,
                        dni: null
                    }
                });
            });
        });

        revalidatePath("/admin/usuarios");
        revalidatePath("/admin/calendar");
        revalidatePath("/admin/history");
        return { success: true };
    } catch (error: any) {
        console.error("Error merging accounts:", error);
        return { success: false, error: error.message || 'Error al unificar las cuentas.' };
    }
}

/**
 * Normaliza y estandariza los números de teléfono de todos los jugadores registrados.
 */
export async function batchNormalizeAllPhonesAdmin() {
    try {
        await requireAdmin();
        const users = await prisma.user.findMany({
            where: { phone: { not: null } },
            select: { id: true, phone: true }
        });

        let updatedCount = 0;
        for (const user of users) {
            if (!user.phone) continue;
            const norm = normalizePhoneNumber(user.phone);
            if (norm && norm !== user.phone) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { phone: norm }
                });
                updatedCount++;
            }
        }

        revalidatePath("/admin/usuarios");
        return { success: true, updatedCount };
    } catch (error: any) {
        console.error("Error normalizing phones:", error);
        return { success: false, error: 'Error al normalizar teléfonos.' };
    }
}
