import { getUserSession } from "@/actions/user-auth";
import { getSettings } from "@/actions/settings";
import { getUserPasskeys } from "@/actions/passkey-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Fingerprint, Settings } from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";
import PasskeyManager from "@/components/PasskeyManager";
import { getReadableForeground, getThemeColors } from "@/lib/color";

export default async function PerfilConfiguracionPage() {
    const session = await getUserSession();
    if (!session) {
        redirect("/login-usuario");
    }

    const [settings, passkeys] = await Promise.all([
        getSettings(),
        getUserPasskeys(),
    ]);

    const themeColors = getThemeColors(
        settings?.theme,
        settings?.primaryColor,
        settings?.secondaryColor
    );

    return (
        <div
            data-theme={themeColors.themeName}
            className={`${themeColors.themeClass} min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col md:items-center md:py-8`}
            style={{
                "--color-primary": themeColors.primary,
                "--color-primary-foreground": getReadableForeground(themeColors.primary),
                "--color-secondary": themeColors.secondary,
                "--color-secondary-foreground": getReadableForeground(themeColors.secondary),
            } as React.CSSProperties}
        >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen md:min-h-0 md:rounded-[2.5rem] md:shadow-2xl md:border md:border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col">
                <PublicNavbar sysSettings={settings} />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/perfil"
                            aria-label="Volver al perfil"
                            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>

                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                                    Configuración
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Seguridad y preferencias de tu cuenta.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
                        <Fingerprint className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                                Seguridad de acceso
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Administrá desde acá el ingreso con Face ID, huella, Touch ID o Windows Hello.
                            </p>
                        </div>
                    </div>

                    <PasskeyManager initialPasskeys={passkeys} />
                </div>
            </div>
        </div>
    );
}
