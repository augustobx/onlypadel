"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeHexColor } from "@/lib/color";
import { hasTenantFeature } from "@/lib/features";

export async function getSettings() {
    try {
        const settings = await prisma.systemSetting.findFirst({
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
        if (!settings) return null;
        const [reservations, users, tournaments, rankings, playerCategories, whatsapp] = await Promise.all([
            hasTenantFeature('reservations'), hasTenantFeature('users'), hasTenantFeature('tournaments'),
            hasTenantFeature('rankings'), hasTenantFeature('player_categories'), hasTenantFeature('whatsapp'),
        ]);
        return {
            ...settings,
            reservationsEnabled: settings.reservationsEnabled && reservations,
            usersModuleEnabled: settings.usersModuleEnabled && users,
            tournamentsEnabled: settings.tournamentsEnabled && tournaments,
            rankingsEnabled: settings.rankingsEnabled && rankings,
            playerCategoriesEnabled: playerCategories,
            whatsappReservations: settings.whatsappReservations && whatsapp,
        };
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
        const requestedMpToken = (formData.get("mpAccessToken") as string)?.trim();
        const requestedWhatsappPhoneId = (formData.get("whatsappPhoneId") as string)?.trim();
        const requestedWhatsappToken = (formData.get("whatsappToken") as string)?.trim();
        const requestedWhatsappVerifyToken = (formData.get("whatsappVerifyToken") as string)?.trim();
        const currentSecrets = await prisma.systemSetting.findFirst({
            where: { id: 1 },
            select: { mpAccessToken: true, whatsappPhoneId: true, whatsappToken: true, whatsappVerifyToken: true },
        });
        if (!currentSecrets) throw new Error('SETTINGS_NOT_FOUND');
        const mpAccessToken = requestedMpToken || currentSecrets.mpAccessToken;
        const whatsappPhoneId = requestedWhatsappPhoneId || currentSecrets.whatsappPhoneId;
        const whatsappToken = requestedWhatsappToken || currentSecrets.whatsappToken;
        const whatsappVerifyToken = requestedWhatsappVerifyToken || currentSecrets.whatsappVerifyToken;
        const reservationFee = Number(formData.get("reservationFee")) || 0;
        const sportEmoji = (formData.get("sportEmoji") as string) || "🎾";
        const theme = formData.get("theme") === "dark" ? "dark" : "light";
        const appLayout = formData.get("appLayout") === "chat" ? "chat" : "classic";
        const heroImage = (formData.get("heroImage") as string) || "";
        const primaryColor = normalizeHexColor(formData.get("primaryColor") as string, "#10b981");
        const secondaryColor = normalizeHexColor(formData.get("secondaryColor") as string, "#0ea5e9");

        const splashLogo = (formData.get("splashLogo") as string) || "";
        const splashName = (formData.get("splashName") as string) || "";
        const splashDuration = Number(formData.get("splashDuration")) || 3000;
        const bubbleText = (formData.get("bubbleText") as string) || "";
        const bubbleColor = normalizeHexColor(formData.get("bubbleColor") as string, "#10b981");
        const bubbleDuration = Number(formData.get("bubbleDuration")) || 3000;

        await prisma.systemSetting.updateMany({
            where: { id: 1 },
            data: {
                clubName, topbarName, contactPhone, courtPhone, apiPhone, mpAccessToken, whatsappPhoneId, whatsappToken, whatsappVerifyToken, reservationFee, sportEmoji, theme, appLayout,
                reservationsEnabled, whatsappReservations, pwaEnabled, autoWhatsapp, requireDeposit, notifyAdmin, tournamentsEnabled, rankingsEnabled,
                usersModuleEnabled, requireDepositForRegistered, clientCancellations,
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
