"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { clearUserSession, createUserSession, readUserSessionId } from "@/lib/user-session";

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string;
    const lastName = formData.get("lastName") as string;
    const dni = formData.get("dni") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !lastName || !dni || !phone || !password) {
        return { success: false, error: "Todos los campos obligatorios deben estar completos." };
    }

    try {
        // Find if DNI already exists
        const existingByDni = await prisma.user.findUnique({ where: { dni } });
        if (existingByDni) {
            return { success: false, error: "El DNI ya está registrado." };
        }

        // Only check email if it's provided
        if (email) {
            const existingByEmail = await prisma.user.findUnique({ where: { email } });
            if (existingByEmail) {
                return { success: false, error: "El Email ya está registrado." };
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                lastName,
                dni,
                phone,
                email: email || null,
                password: hashedPassword,
                role: "PLAYER",
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

export async function loginUser(formData: FormData) {
    const dni = formData.get("dni") as string;
    const password = formData.get("password") as string;

    if (!dni || !password) {
        return { success: false, error: "DNI y contraseña requeridos." };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { dni }
        });

        if (!user || !user.password) {
            return { success: false, error: "Credenciales incorrectas." };
        }

        if (user.isActive === false) {
            return { success: false, error: "Tu cuenta ha sido suspendida. Contacta a la administración." };
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
    cookieStore.set("tpadel_skip_registration", "true", {
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
            select: { id: true, name: true, lastName: true, dni: true, phone: true, email: true, category: true, role: true, isActive: true }
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
