"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { clearUserSession, createUserSession, readUserSessionId } from "@/lib/user-session";
import { requireTenantFeature } from "@/lib/features";
import { normalizePhoneNumber } from "@/lib/phone";

import { VALID_CATEGORIES } from "@/lib/tournaments/category-rules";

export async function registerUser(formData: FormData) {
    await requireTenantFeature('users');
    const name = (formData.get("name") as string || "").trim();
    const lastName = (formData.get("lastName") as string || "").trim();
    const dni = (formData.get("dni") as string || "").trim();
    const rawPhone = (formData.get("phone") as string || "").trim();
    const email = (formData.get("email") as string || "").trim().toLowerCase();
    const password = (formData.get("password") as string || "").trim();
    const category = (formData.get("category") as string || "").trim();

    if (!name || !lastName || !dni || !rawPhone || !password) {
        return { success: false, error: "Todos los campos obligatorios deben estar completos." };
    }

    if (!category || !(VALID_CATEGORIES as readonly string[]).includes(category)) {
        return { success: false, error: "Debes seleccionar tu categoría de juego obligatoria (8va a 1ra)." };
    }

    const cleanDni = dni.replace(/\D/g, '') || dni;
    const cleanPhone = normalizePhoneNumber(rawPhone);

    try {
        // 1. Verificar si existe por DNI
        const existingByDni = await prisma.user.findFirst({
            where: {
                OR: [
                    { dni },
                    ...(cleanDni ? [{ dni: cleanDni }] : [])
                ]
            }
        });

        // 2. Verificar si existe por Email
        let existingByEmail = null;
        if (email) {
            existingByEmail = await prisma.user.findFirst({
                where: { email }
            });
        }

        // 3. Verificar si existe por Teléfono normalizado
        let existingByPhone = null;
        if (cleanPhone) {
            existingByPhone = await prisma.user.findFirst({
                where: {
                    OR: [
                        { phone: cleanPhone },
                        { phone: rawPhone }
                    ]
                }
            });
        }

        // Si existe un usuario ya registrado con contraseña activa, avisar
        const existingWithPassword = [existingByDni, existingByEmail, existingByPhone].find(u => u && u.password);
        if (existingWithPassword) {
            if (existingByDni?.password) return { success: false, error: "El DNI ya tiene una cuenta registrada. Iniciá sesión o recuperá tu clave." };
            if (existingByEmail?.password) return { success: false, error: "El Email ya tiene una cuenta registrada. Iniciá sesión o recuperá tu clave." };
            if (existingByPhone?.password) return { success: false, error: "El Teléfono ya tiene una cuenta registrada. Iniciá sesión o recuperá tu clave." };
        }

        // Si existe un usuario previo SIN contraseña (creado por turno de mostrador o reserva de invitado):
        // ¡Lo actualizamos / unificamos para que conserve todo su historial de turnos y no cree duplicados!
        const existingGuestUser = existingByPhone || existingByDni || existingByEmail;
        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingGuestUser && !existingGuestUser.password) {
            const updatedUser = await prisma.user.update({
                where: { id: existingGuestUser.id },
                data: {
                    name,
                    lastName,
                    dni: cleanDni || existingGuestUser.dni,
                    phone: cleanPhone || existingGuestUser.phone,
                    email: email || existingGuestUser.email,
                    category,
                    password: hashedPassword,
                    isActive: true,
                }
            });

            await createUserSession(updatedUser.id);
            revalidatePath("/");
            return { success: true };
        }

        const user = await prisma.user.create({
            data: {
                name,
                lastName,
                dni: cleanDni,
                phone: cleanPhone,
                email: email || null,
                category,
                password: hashedPassword,
                role: "PLAYER",
                isActive: true,
            }
        });

        await createUserSession(user.id);

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Register error:", error);
        return { success: false, error: "Error interno del servidor." };
    }
}

export async function updateUserCategory(category: string) {
    try {
        const trimmed = (category || "").trim();
        if (!(VALID_CATEGORIES as readonly string[]).includes(trimmed)) {
            return { success: false, error: "Categoría no válida. Selecciona entre 8va y 1ra." };
        }

        const userId = await readUserSessionId();
        if (!userId) {
            return { success: false, error: "Debes iniciar sesión para actualizar tu categoría." };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { category: trimmed }
        });

        revalidatePath("/");
        revalidatePath("/perfil");
        revalidatePath("/torneos");
        return { success: true };
    } catch (error) {
        console.error("updateUserCategory error:", error);
        return { success: false, error: "No se pudo actualizar la categoría." };
    }
}

export async function loginUser(formData: FormData) {
    await requireTenantFeature('users');
    const rawIdentifier = (formData.get("dni") || formData.get("identifier") || formData.get("email") || formData.get("phone") || "") as string;
    const identifier = rawIdentifier.trim();
    const password = (formData.get("password") as string || "").trim();

    if (!identifier || !password) {
        return { success: false, error: "Ingresá tu DNI, teléfono o email y tu contraseña." };
    }

    try {
        const cleanDni = identifier.replace(/\D/g, "");
        const normalizedPhone = normalizePhoneNumber(identifier);

        // Búsqueda flexible: permite iniciar sesión con DNI, Email o Teléfono
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { dni: identifier },
                    ...(cleanDni ? [{ dni: cleanDni }] : []),
                    { email: identifier.toLowerCase() },
                    ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
                    { phone: identifier }
                ]
            }
        });

        if (!user || !user.password) {
            return { success: false, error: "Credenciales incorrectas o usuario sin clave establecida." };
        }

        if (user.isActive === false) {
            return { success: false, error: "Tu cuenta ha sido suspendida. Contactá a la administración." };
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return { success: false, error: "Credenciales incorrectas." };
        }

        await createUserSession(user.id);

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Error interno del servidor." };
    }
}

export async function logoutUser() {
    await clearUserSession();
    revalidatePath("/");
}

export async function skipRegistration() {
    const cookieStore = await cookies();
    // Cookie de sesión (sin maxAge) para que se borre al cerrar el navegador
    cookieStore.set("onlypadel_skip_registration", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });
    revalidatePath("/");
    return { success: true };
}

export async function getUserSession() {
    const userId = await readUserSessionId();
    
    if (!userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, lastName: true, dni: true, phone: true, email: true, category: true, role: true, isActive: true, avatarUrl: true }
        });
        
        if (user && user.isActive === false) {
            // Kick out blocked user
            await clearUserSession();
            return null;
        }

        return user;
    } catch (error) {
        console.error("Session error:", error);
        return null;
    }
}
