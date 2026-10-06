'use server';

import { prisma } from "@/lib/prisma";
import { platformPrisma } from "@/lib/prisma-core";
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
 * Unifica dos cuentas de usuario: transfiere todas las reservas, abonos fijos, torneos,
 * rankings, categorías, partidos abiertos, publicaciones, chat y sesiones de 'sourceUserId'
 * hacia 'targetUserId', y elimina limpiamente la cuenta duplicada.
 */
export async function mergeUserAccountsAdmin(targetUserId: string, sourceUserId: string) {
    try {
        const adminSession = await requireAdmin();
        const tenantId = adminSession.tenantId;

        if (targetUserId === sourceUserId) {
            return { success: false, error: 'No podés unificar un usuario consigo mismo.' };
        }

        const [targetUser, sourceUser] = await Promise.all([
            platformPrisma.user.findFirst({ where: { id: targetUserId, tenantId } }),
            platformPrisma.user.findFirst({ where: { id: sourceUserId, tenantId } })
        ]);

        if (!targetUser || !sourceUser) {
            return { success: false, error: 'Uno o ambos usuarios no existen o no pertenecen a este club.' };
        }

        await platformPrisma.$transaction(async (tx) => {
            // 1. Reasignar reservas normales
            await tx.booking.updateMany({
                where: { userId: sourceUserId, tenantId },
                data: { userId: targetUserId }
            });

            // 2. Reasignar abonos fijos
            await tx.fixedBooking.updateMany({
                where: { userId: sourceUserId, tenantId },
                data: { userId: targetUserId }
            });

            // 3. Reasignar equipos de torneos (player1 y player2)
            await tx.tournamentTeam.updateMany({
                where: { player1Id: sourceUserId, tenantId },
                data: { player1Id: targetUserId }
            });
            await tx.tournamentTeam.updateMany({
                where: { player2Id: sourceUserId, tenantId },
                data: { player2Id: targetUserId }
            });

            // 4. Unificar rankings por categoría sin violar @@unique([tenantId, categoryId, userId])
            const sourceRankings = await tx.rankingEntry.findMany({
                where: { userId: sourceUserId, tenantId }
            });
            for (const sr of sourceRankings) {
                const targetRanking = await tx.rankingEntry.findUnique({
                    where: {
                        tenantId_categoryId_userId: {
                            tenantId,
                            categoryId: sr.categoryId,
                            userId: targetUserId
                        }
                    }
                });
                if (targetRanking) {
                    await tx.rankingEntry.update({
                        where: { id: targetRanking.id },
                        data: {
                            points: Math.max(targetRanking.points, sr.points),
                            matchesPlayed: targetRanking.matchesPlayed + sr.matchesPlayed,
                            matchesWon: targetRanking.matchesWon + sr.matchesWon,
                            matchesLost: targetRanking.matchesLost + sr.matchesLost,
                        }
                    });
                    await tx.rankingEntry.delete({ where: { id: sr.id } });
                } else {
                    await tx.rankingEntry.update({
                        where: { id: sr.id },
                        data: { userId: targetUserId }
                    });
                }
            }

            // 5. Unificar padrón de categorías de jugador (PlayerCategoryAssignment)
            const sourceAssignment = await tx.playerCategoryAssignment.findUnique({
                where: {
                    tenantId_userId: {
                        tenantId,
                        userId: sourceUserId
                    }
                }
            });
            if (sourceAssignment) {
                const targetAssignment = await tx.playerCategoryAssignment.findUnique({
                    where: {
                        tenantId_userId: {
                            tenantId,
                            userId: targetUserId
                        }
                    }
                });
                if (targetAssignment) {
                    await tx.playerCategoryAssignment.delete({ where: { id: sourceAssignment.id } });
                } else {
                    await tx.playerCategoryAssignment.update({
                        where: { id: sourceAssignment.id },
                        data: { userId: targetUserId }
                    });
                }
            }

            // 6. Reasignar partidos abiertos creados
            await tx.openMatch.updateMany({
                where: { creatorId: sourceUserId, tenantId },
                data: { creatorId: targetUserId }
            });

            // 7. Unificar jugadores unidos a partidos abiertos (OpenMatchPlayer)
            const sourceJoinedMatches = await tx.openMatchPlayer.findMany({
                where: { userId: sourceUserId, tenantId }
            });
            for (const sm of sourceJoinedMatches) {
                const targetInMatch = await tx.openMatchPlayer.findUnique({
                    where: {
                        tenantId_matchId_userId: {
                            tenantId,
                            matchId: sm.matchId,
                            userId: targetUserId
                        }
                    }
                });
                if (targetInMatch) {
                    await tx.openMatchPlayer.delete({ where: { id: sm.id } });
                } else {
                    await tx.openMatchPlayer.update({
                        where: { id: sm.id },
                        data: { userId: targetUserId }
                    });
                }
            }

            // 8. Reasignar publicaciones y comentarios de comunidad
            await tx.post.updateMany({
                where: { authorId: sourceUserId, tenantId },
                data: { authorId: targetUserId }
            });
            await tx.postComment.updateMany({
                where: { authorId: sourceUserId, tenantId },
                data: { authorId: targetUserId }
            });

            // 9. Unificar likes de post sin duplicar
            const sourceLikes = await tx.postLike.findMany({
                where: { userId: sourceUserId, tenantId }
            });
            for (const sl of sourceLikes) {
                const targetLike = await tx.postLike.findUnique({
                    where: {
                        tenantId_postId_userId: {
                            tenantId,
                            postId: sl.postId,
                            userId: targetUserId
                        }
                    }
                });
                if (targetLike) {
                    await tx.postLike.delete({ where: { id: sl.id } });
                } else {
                    await tx.postLike.update({
                        where: { id: sl.id },
                        data: { userId: targetUserId }
                    });
                }
            }

            // 10. Unificar participantes de chat
            const sourceParticipants = await tx.chatParticipant.findMany({
                where: { userId: sourceUserId, tenantId }
            });
            for (const sp of sourceParticipants) {
                const targetInChat = await tx.chatParticipant.findUnique({
                    where: {
                        tenantId_conversationId_userId: {
                            tenantId,
                            conversationId: sp.conversationId,
                            userId: targetUserId
                        }
                    }
                });
                if (targetInChat) {
                    await tx.chatParticipant.delete({ where: { id: sp.id } });
                } else {
                    await tx.chatParticipant.update({
                        where: { id: sp.id },
                        data: { userId: targetUserId }
                    });
                }
            }

            // 11. Reasignar mensajes de chat enviados
            await tx.chatMessage.updateMany({
                where: { senderId: sourceUserId, tenantId },
                data: { senderId: targetUserId }
            });

            // 12. Limpiar notificaciones, suscripciones push y sesiones del usuario origen
            await tx.communityNotification.deleteMany({
                where: { userId: sourceUserId, tenantId }
            });
            await tx.pushSubscription.deleteMany({
                where: { userId: sourceUserId, tenantId }
            });
            await tx.userSession.deleteMany({
                where: { userId: sourceUserId, tenantId }
            });
            await tx.adminSession.deleteMany({
                where: { userId: sourceUserId, tenantId }
            });

            // 13. Liberar claves únicas en sourceUser para evitar colisiones al actualizar targetUser
            await tx.user.update({
                where: { id: sourceUserId },
                data: {
                    email: null,
                    dni: null,
                    phone: null
                }
            });

            // 14. Completar datos faltantes en targetUser si sourceUser los tenía
            const updatePayload: any = {};
            if (!targetUser.phone && sourceUser.phone) updatePayload.phone = normalizePhoneNumber(sourceUser.phone);
            if (!targetUser.email && sourceUser.email && !sourceUser.email.endsWith('@local.onlypadel')) updatePayload.email = sourceUser.email;
            if (!targetUser.dni && sourceUser.dni) updatePayload.dni = sourceUser.dni;
            if (!targetUser.lastName && sourceUser.lastName) updatePayload.lastName = sourceUser.lastName;
            if (!targetUser.password && sourceUser.password) updatePayload.password = sourceUser.password;
            if (!targetUser.category && sourceUser.category) updatePayload.category = sourceUser.category;
            if (!targetUser.avatarUrl && sourceUser.avatarUrl) updatePayload.avatarUrl = sourceUser.avatarUrl;
            if (!targetUser.bio && sourceUser.bio) updatePayload.bio = sourceUser.bio;
            if (!targetUser.preferredPosition && sourceUser.preferredPosition) updatePayload.preferredPosition = sourceUser.preferredPosition;

            if (Object.keys(updatePayload).length > 0) {
                await tx.user.update({
                    where: { id: targetUserId },
                    data: updatePayload
                });
            }

            // 15. Eliminar definitivamente la cuenta duplicada (ahora sin ninguna llave foránea pendiente)
            await tx.user.delete({
                where: { id: sourceUserId }
            });
        }, {
            maxWait: 15000,
            timeout: 45000
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
