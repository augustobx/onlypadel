'use server';

import { prisma } from '@/lib/prisma';
import { readUserSessionId } from '@/lib/user-session';
import { requireTenantFeature } from '@/lib/features';
import { revalidatePath } from 'next/cache';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

export async function getNotifications(limit = 50) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, notifications: [], unreadCount: 0 };

    const [notifications, unreadCount] = await Promise.all([
      prisma.communityNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.communityNotification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'No autenticado' };

    await prisma.communityNotification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    revalidatePath('/comunidad/notificaciones');
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Error al actualizar notificación' };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'No autenticado' };

    await prisma.communityNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath('/comunidad/notificaciones');
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: 'Error al actualizar notificaciones' };
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    await requireTenantFeature('community');
    const userId = await readUserSessionId();
    if (!userId) return { success: false, error: 'No autenticado' };

    await prisma.communityNotification.deleteMany({
      where: { id: notificationId, userId },
    });

    revalidatePath('/comunidad/notificaciones');
    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: 'Error al eliminar notificación' };
  }
}
