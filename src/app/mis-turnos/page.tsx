import { getSettings } from "@/actions/settings";
import PublicNavbar from "@/components/PublicNavbar";
import MisTurnosClient from "./MisTurnosClient";
import { getReadableForeground, normalizeHexColor } from "@/lib/color";

export default async function MisTurnosPage() {
    const settings = await getSettings();
    const theme = settings?.theme || 'light';
    const primaryColor = normalizeHexColor(settings?.primaryColor, '#10b981');
    const secondaryColor = normalizeHexColor(settings?.secondaryColor, '#0ea5e9');

    return (
        <div 
            className={`${theme} min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:items-center md:py-8`}
            style={{ 
                '--color-primary': primaryColor,
                '--color-primary-foreground': getReadableForeground(primaryColor),
                '--color-secondary': secondaryColor,
                '--color-secondary-foreground': getReadableForeground(secondaryColor),
            } as React.CSSProperties}
        >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 min-h-screen md:min-h-0 md:rounded-[2.5rem] md:shadow-2xl md:border md:border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col">
                <PublicNavbar sysSettings={settings} />
                <MisTurnosClient />
            </div>
        </div>
    );
}
