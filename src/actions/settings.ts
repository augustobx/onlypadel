"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSettings() {
    try {
        const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
        return settings;
    } catch (error) {
        console.error("Error fetching settings:", error);
        return null;
    }
}

export async function updateSystemSettings(formData: FormData) {
    try {
        const reservationsEnabled = formData.get("reservationsEnabled") === "on";
        const whatsappReservations = formData.get("whatsappReservations") === "on";
        const pwaEnabled = formData.get("pwaEnabled") === "on";
        const autoWhatsapp = formData.get("autoWhatsapp") === "on";
        const bubbleActive = formData.get("bubbleActive") === "on";
        const requireDeposit = formData.get("requireDeposit") === "on";
        const notifyAdmin = formData.get("notifyAdmin") === "on";
        const tournamentsEnabled = formData.get("tournamentsEnabled") === "on";
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
        const theme = (formData.get("theme") as string) || "light";
        const appLayout = (formData.get("appLayout") as string) || "classic";
        const heroImage = (formData.get("heroImage") as string) || "";
        const primaryColor = (formData.get("primaryColor") as string) || "#10b981";
        const secondaryColor = (formData.get("secondaryColor") as string) || "#0ea5e9";

        const adminUser = (formData.get("adminUser") as string) || "admin";
        const adminPass = (formData.get("adminPass") as string) || "admin123";

        const splashLogo = (formData.get("splashLogo") as string) || "";
        const splashName = (formData.get("splashName") as string) || "";
        const splashDuration = Number(formData.get("splashDuration")) || 3000;
        const bubbleText = (formData.get("bubbleText") as string) || "";
        const bubbleColor = (formData.get("bubbleColor") as string) || "#10b981";
        const bubbleDuration = Number(formData.get("bubbleDuration")) || 3000;

        await prisma.systemSetting.update({
            where: { id: 1 },
            data: {
                clubName, topbarName, contactPhone, courtPhone, apiPhone, mpAccessToken, reservationFee, sportEmoji, theme, appLayout,
                reservationsEnabled, whatsappReservations, pwaEnabled, autoWhatsapp, requireDeposit, notifyAdmin, tournamentsEnabled,
                usersModuleEnabled, requireDepositForRegistered,
                adminUser, adminPass,
                splashLogo, splashName, splashDuration,
                bubbleActive, bubbleText, bubbleColor, bubbleDuration,
                primaryColor, secondaryColor
            },
        });

        revalidatePath("/admin/settings");
        revalidatePath("/");

    } catch (error) {
        console.error("Error updating settings:", error);
    }
}