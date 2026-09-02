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

    const customSettings = await prisma.setting.findMany({
        where: { key: { in: ['club_logo', 'splash_mode', 'splash_full_image'] } }
    });
    const customMap = Object.fromEntries(customSettings.map(s => [s.key, s.value]));

    const enrichedSettings = {
        ...settings,
        clubLogo: customMap['club_logo'] || settings.splashLogo || '',
        splashMode: (customMap['splash_mode'] as 'logo' | 'full_image') || (settings.heroImage ? 'full_image' : 'logo'),
        splashFullImage: customMap['splash_full_image'] || settings.heroImage || '',
        mpAccessToken: '',
        whatsappPhoneId: '',
        whatsappToken: '',
        whatsappVerifyToken: ''
    };

    return (
        <div className="max-w-6xl mx-auto p-2 md:p-6 space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Configuración & Branding
                </h1>
                <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Personaliza la identidad, temas épicos, pantalla splash, módulos y pasarelas de pago del club.
                </p>
            </div>

            <SettingsForm settings={enrichedSettings} />
        </div>
    );
}
