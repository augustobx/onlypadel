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
                clubName: true, contactPhone: true, apiPhone: true, courtPhone: true, reservationFee: true,
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

        // Custom key-values from Setting table
        const customSettings = await prisma.setting.findMany({
            where: {
                key: { in: [
                    'club_logo', 'splash_mode', 'splash_full_image',
                    'announcement_active', 'announcement_badge', 'announcement_title',
                    'announcement_text', 'announcement_link', 'announcement_link_text',
                    'announcement_variant', 'announcement_duration', 'announcement_auto_close',
                    'current_account_enabled'
                ] }
            }
        });
        const customMap = Object.fromEntries(customSettings.map(s => [s.key, s.value]));

        const clubLogo = customMap['club_logo'] !== undefined ? customMap['club_logo'] : (settings.splashLogo || '');
        const splashMode: 'logo' | 'full_image' = customMap['splash_mode'] === 'full_image' ? 'full_image' : 'logo';
        const splashFullImage = customMap['splash_full_image'] !== undefined ? customMap['splash_full_image'] : (settings.heroImage || '');

        const announcementActive = customMap['announcement_active'] !== undefined 
            ? customMap['announcement_active'] === 'true' 
            : (settings.bubbleActive ?? false);
        const announcementBadge = customMap['announcement_badge'] || 'COMUNICADO';
        const announcementTitle = customMap['announcement_title'] || '';
        const announcementText = customMap['announcement_text'] || settings.bubbleText || '';
        const announcementLink = customMap['announcement_link'] || '';
        const announcementLinkText = customMap['announcement_link_text'] || 'Ver más';
        const announcementVariant = customMap['announcement_variant'] || 'theme';
        const announcementDuration = customMap['announcement_duration'] !== undefined
            ? Number(customMap['announcement_duration']) || 5
            : (settings.bubbleDuration ? Math.round(settings.bubbleDuration / 1000) : 5);
        const announcementAutoClose = customMap['announcement_auto_close'] !== undefined
            ? customMap['announcement_auto_close'] === 'true'
            : true;

        const [reservations, users, tournaments, rankings, playerCategories, whatsapp] = await Promise.all([
            hasTenantFeature('reservations'), hasTenantFeature('users'), hasTenantFeature('tournaments'),
            hasTenantFeature('rankings'), hasTenantFeature('player_categories'), hasTenantFeature('whatsapp'),
        ]);
        return {
            ...settings,
            clubLogo,
            splashMode,
            splashFullImage,
            announcementActive,
            announcementBadge,
            announcementTitle,
            announcementText,
            announcementLink,
            announcementLinkText,
            announcementVariant,
            announcementDuration,
            announcementAutoClose,
            currentAccountEnabled: customMap['current_account_enabled'] !== 'false',
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
        const requireDeposit = formData.get("requireDeposit") === "on";
        const notifyAdmin = formData.get("notifyAdmin") === "on";
        const tournamentsEnabled = formData.get("tournamentsEnabled") === "on";
        const rankingsEnabled = formData.get("rankingsEnabled") === "on";
        const usersModuleEnabled = formData.get("usersModuleEnabled") === "on";
        const requireDepositForRegistered = formData.get("requireDepositForRegistered") === "on";
        const clientCancellations = formData.get("clientCancellations") === "on";
        const currentAccountEnabled = formData.get("currentAccountEnabled") === "on";

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
        
        // Theme selection: supports light, dark, cyber-padel, sunset-clay, ocean-frost
        const rawTheme = (formData.get("theme") as string) || "light";
        const theme = ['light', 'dark', 'cyber-padel', 'sunset-clay', 'ocean-frost'].includes(rawTheme) ? rawTheme : 'light';
        
        const appLayout = formData.get("appLayout") === "chat" ? "chat" : "classic";
        const primaryColor = normalizeHexColor(formData.get("primaryColor") as string, "#10b981");
        const secondaryColor = normalizeHexColor(formData.get("secondaryColor") as string, "#0ea5e9");

        const clubLogo = ((formData.get("clubLogo") as string) || "").trim();
        const splashLogo = clubLogo;
        const splashName = (formData.get("splashName") as string) || "";
        const splashDuration = Number(formData.get("splashDuration")) || 1800;
        const splashMode = (formData.get("splashMode") as string) === 'full_image' ? 'full_image' : 'logo';
        const splashFullImage = splashMode === 'full_image' ? ((formData.get("splashFullImage") as string) || "").trim() : "";

        const announcementActive = formData.get("announcementActive") === "on" || formData.get("bubbleActive") === "on";
        const announcementBadge = ((formData.get("announcementBadge") as string) || "COMUNICADO").trim();
        const announcementTitle = ((formData.get("announcementTitle") as string) || "").trim();
        const announcementText = ((formData.get("announcementText") as string) || (formData.get("bubbleText") as string) || "").trim();
        const announcementLink = ((formData.get("announcementLink") as string) || "").trim();
        const announcementLinkText = ((formData.get("announcementLinkText") as string) || "Ver más").trim();
        const announcementVariant = ((formData.get("announcementVariant") as string) || "theme").trim();
        const announcementDuration = Math.max(1, Number(formData.get("announcementDuration")) || 5);
        const announcementAutoClose = formData.get("announcementAutoClose") === "on";

        const bubbleActive = announcementActive;
        const bubbleText = announcementText;
        const bubbleColor = normalizeHexColor(formData.get("bubbleColor") as string, "#10b981");
        const bubbleDuration = announcementDuration * 1000;

        await prisma.systemSetting.updateMany({
            where: { id: 1 },
            data: {
                clubName, topbarName, contactPhone, courtPhone, apiPhone, mpAccessToken, whatsappPhoneId, whatsappToken, whatsappVerifyToken, reservationFee, sportEmoji, theme, appLayout,
                reservationsEnabled, whatsappReservations, pwaEnabled, autoWhatsapp, requireDeposit, notifyAdmin, tournamentsEnabled, rankingsEnabled,
                usersModuleEnabled, requireDepositForRegistered, clientCancellations,
                splashLogo, splashName, splashDuration,
                bubbleActive, bubbleText, bubbleColor, bubbleDuration,
                primaryColor, secondaryColor, heroImage: splashMode === 'full_image' ? (splashFullImage || null) : null
            },
        });

        // Upsert custom settings in Setting table
        const customEntries = [
            { key: 'club_logo', value: clubLogo },
            { key: 'splash_mode', value: splashMode },
            { key: 'splash_full_image', value: splashFullImage },
            { key: 'announcement_active', value: String(announcementActive) },
            { key: 'announcement_badge', value: announcementBadge },
            { key: 'announcement_title', value: announcementTitle },
            { key: 'announcement_text', value: announcementText },
            { key: 'announcement_link', value: announcementLink },
            { key: 'announcement_link_text', value: announcementLinkText },
            { key: 'announcement_variant', value: announcementVariant },
            { key: 'announcement_duration', value: String(announcementDuration) },
            { key: 'announcement_auto_close', value: String(announcementAutoClose) },
            { key: 'current_account_enabled', value: String(currentAccountEnabled) },
        ];

        for (const entry of customEntries) {
            const updated = await prisma.setting.updateMany({
                where: { key: entry.key },
                data: { value: entry.value },
            });
            if (updated.count === 0) {
                await prisma.setting.create({
                    data: {
                        key: entry.key,
                        value: entry.value,
                    },
                });
            }
        }

        revalidatePath("/admin/settings");
        revalidatePath("/admin");
        revalidatePath("/");
        return { success: true };

    } catch (error) {
        console.error("Error updating settings:", error);
        return { success: false, error: 'Ocurrió un error al guardar la configuración.' };
    }
}
