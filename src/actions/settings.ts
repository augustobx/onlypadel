"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";
import { normalizeHexColor } from "@/lib/color";

export async function getSettings() {
    try {
        const settings = await prisma.systemSetting.findUnique({
            where: { id: 1 },
            select: {
                clubName: true, contactPhone: true, apiPhone: true, reservationFee: true,
                sportEmoji: true, topbarName: true, pwaEnabled: true, autoWhatsapp: true,
                requireDeposit: true, reservationsEnabled: true, whatsappReservations: true,
                notifyAdmin: true, tournamentsEnabled: true, rankingsEnabled: true, usersModuleEnabled: true,
                requireDepositForRegistered: true, clientCancellations: true,
                splashLogo: true, splashName: true, splashDuration: true,
                bubbleActive: true, bubbleText: true, bubbleDuration: true, bubbleColor: true,
                theme: true, appLayout: true, heroImage: true, primaryColor: true, secondaryColor: true,
            },
        });
        return settings;
    } catch (error) {
        console.error("Error fetching settings:", error);
        return null;
    }
}

export async function updateSystemSettings(formData: FormData) {
    try {
        await requireAdmin();
        const reservationsEnabled = formData.get("reservationsEnabled") === "on";
        const whatsappReservations = formData.get("whatsappReservations") === "on";
        const pwaEnabled = formData.get("pwaEnabled") === "on";
        const autoWhatsapp = formData.get("autoWhatsapp") === "on";
        const bubbleActive = formData.get("bubbleActive") === "on";
        const requireDeposit = formData.get("requireDeposit") === "on";
        const notifyAdmin = formData.get("notifyAdmin") === "on";
        const tournamentsEnabled = formData.get("tournamentsEnabled") === "on";
        const rankingsEnabled = formData.get("rankingsEnabled") === "on";
        const usersModuleEnabled = formData.get("usersModuleEnabled") === "on";
        const requireDepositForRegistered = formData.get("requireDepositForRegistered") === "on";
        const clientCancellations = formData.get("clientCancellations") === "on";

        const clubName = (formData.get("clubName") as string) || "";
        const topbarName = (formData.get("topbarName") as string) || "";
        const contactPhone = (formData.get("contactPhone") as string) || "";
        const courtPhone = (formData.get("courtPhone") as string) || "";
        const apiPhone = (formData.get("apiPhone") as string) || "";
        const mpAccessToken = (formData.get("mpAccessToken") as string) || "";
        const reservationFee = Number(formData.get("reservationFee")) || 0;
        const sportEmoji = (formData.get("sportEmoji") as string) || "🎾";
        const theme = formData.get("theme") === "dark" ? "dark" : "light";
        const appLayout = formData.get("appLayout") === "chat" ? "chat" : "classic";
        const heroImage = (formData.get("heroImage") as string) || "";
        const primaryColor = normalizeHexColor(formData.get("primaryColor") as string, "#10b981");
        const secondaryColor = normalizeHexColor(formData.get("secondaryColor") as string, "#0ea5e9");

        const adminUser = (formData.get("adminUser") as string) || "admin";
        const requestedAdminPass = (formData.get("adminPass") as string)?.trim();
        const currentSettings = await prisma.systemSetting.findUnique({ where: { id: 1 }, select: { adminPass: true } });
        if (!currentSettings) throw new Error('SETTINGS_NOT_FOUND');
        const adminPass = requestedAdminPass ? await bcrypt.hash(requestedAdminPass, 12) : currentSettings.adminPass;

        const splashLogo = (formData.get("splashLogo") as string) || "";
        const splashName = (formData.get("splashName") as string) || "";
        const splashDuration = Number(formData.get("splashDuration")) || 3000;
        const bubbleText = (formData.get("bubbleText") as string) || "";
        const bubbleColor = normalizeHexColor(formData.get("bubbleColor") as string, "#10b981");
        const bubbleDuration = Number(formData.get("bubbleDuration")) || 3000;

        await prisma.systemSetting.update({
            where: { id: 1 },
            data: {
                clubName, topbarName, contactPhone, courtPhone, apiPhone, mpAccessToken, reservationFee, sportEmoji, theme, appLayout,
                reservationsEnabled, whatsappReservations, pwaEnabled, autoWhatsapp, requireDeposit, notifyAdmin, tournamentsEnabled, rankingsEnabled,
                usersModuleEnabled, requireDepositForRegistered, clientCancellations,
                adminUser, adminPass,
                splashLogo, splashName, splashDuration,
                bubbleActive, bubbleText, bubbleColor, bubbleDuration,
                primaryColor, secondaryColor, heroImage: heroImage || null
            },
        });

        revalidatePath("/admin/settings");
        revalidatePath("/");

    } catch (error) {
        console.error("Error updating settings:", error);
    }
}
