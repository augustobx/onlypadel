import { getCourts } from "@/actions/courts";
import AdminInteractiveCalendar, { CalendarViewMode } from "@/components/AdminInteractiveCalendar";

export default async function CalendarPage({
    searchParams
}: {
    searchParams: Promise<{ date?: string; view?: string; highlight?: string }>
}) {
    const params = await searchParams;
    const response = await getCourts();

    const activeCourts = response.success && response.data
        ? response.data.filter(court => court.isActive)
        : [];

    const initialView: CalendarViewMode = 
        params.view === 'week' ? 'week' : params.view === 'month' ? 'month' : 'day';

    return (
        <div className="p-2 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Calendario Operativo
                    </h1>
                    <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
                        Gestión interactiva por día, semana y mes de canchas y reservas.
                    </p>
                </div>
            </div>

            {activeCourts.length > 0 ? (
                <AdminInteractiveCalendar 
                    courts={activeCourts} 
                    initialDate={params.date} 
                    initialView={initialView}
                    highlightBookingId={params.highlight} 
                />
            ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                    <p className="text-slate-500 font-bold text-lg">No hay canchas activas configuradas.</p>
                </div>
            )}
        </div>
    );
}