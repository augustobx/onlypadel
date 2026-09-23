import { getNotifications } from "@/actions/community-notifications";
import { getUserSession } from "@/actions/user-auth";
import { redirect } from "next/navigation";
import NotificationsClient from "@/components/community/NotificationsClient";

export const metadata = {
  title: "Comunidad — Alertas & Notificaciones",
  description: "Centro de notificaciones de la comunidad de OnlyPadel",
};

export default async function NotificacionesPage() {
  const session = await getUserSession();
  if (!session) redirect("/login-usuario?redirect=/comunidad/notificaciones");

  const { notifications, unreadCount } = await getNotifications();

  return (
    <NotificationsClient
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
