import { Bell } from "lucide-react";

export const metadata = {
  title: "Comunidad — Notificaciones",
  description: "Centro de notificaciones de la comunidad",
};

export default function NotificacionesPage() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-950/60 dark:to-fuchsia-950/60 flex items-center justify-center">
        <Bell className="w-8 h-8 text-violet-500 dark:text-violet-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
        Notificaciones
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No tenés notificaciones nuevas.
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
        Acá vas a recibir alertas de nuevos mensajes, likes y comentarios.
      </p>
    </div>
  );
}
