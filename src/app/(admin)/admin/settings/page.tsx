import { prisma } from "@/lib/prisma";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
    let settings = await prisma.systemSetting.findFirst({ where: { id: 1 } });

    if (!settings) {
        settings = await prisma.systemSetting.create({
            data: {
                clubName: "OnlyPadel", topbarName: "OnlyPadel", contactPhone: "", courtPhone: "", apiPhone: "", mpAccessToken: "", reservationFee: 0,
                sportEmoji: "🎾", theme: "light", pwaEnabled: true, autoWhatsapp: false,
                requireDeposit: true, reservationsEnabled: true, whatsappReservations: true,
                splashLogo: "OnlyPadel", splashName: "OnlyPadel", splashDuration: 1500,
                bubbleActive: false, bubbleText: "¡Bienvenidos!", bubbleDuration: 3000, bubbleColor: "#10b981"
            }
        });
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
                <p className="text-gray-500">Administra las preferencias generales, reservas y PWA.</p>
            </div>

            <SettingsForm settings={{ ...settings, mpAccessToken: '', whatsappPhoneId: '', whatsappToken: '', whatsappVerifyToken: '' }} />
        </div>
    );
}
