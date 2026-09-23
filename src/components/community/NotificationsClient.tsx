'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  CalendarDays,
  Megaphone,
  Bell,
  CheckCheck,
  Trash2,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  NotificationItem,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/actions/community-notifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationsClientProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}

export default function NotificationsClient({
  initialNotifications,
  initialUnreadCount,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkAllRead = () => {
    if (unreadCount === 0 || isPending) return;
    startTransition(async () => {
      const res = await markAllNotificationsAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        router.refresh();
      }
    });
  };

  const handleClickItem = (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      startTransition(async () => {
        await markNotificationAsRead(item.id);
        router.refresh();
      });
    }
    if (item.linkUrl) {
      router.push(item.linkUrl);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (item && !item.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    startTransition(async () => {
      await deleteNotification(id);
      router.refresh();
    });
  };

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'POST_LIKE':
        return (
          <div className="w-10 h-10 rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 shadow-sm">
            <Heart className="w-5 h-5 fill-current" />
          </div>
        );
      case 'POST_COMMENT':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
            <MessageCircle className="w-5 h-5" />
          </div>
        );
      case 'MATCH_JOIN':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
            <CalendarDays className="w-5 h-5" />
          </div>
        );
      case 'CLUB_ANNOUNCEMENT':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center shrink-0 shadow-sm">
            <Megaphone className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white flex items-center justify-center shadow-md shadow-[var(--color-primary)]/20">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Alertas & Novedades</h2>
            <p className="text-[11px] text-slate-400">
              {unreadCount > 0
                ? `${unreadCount} alerta${unreadCount > 1 ? 's' : ''} sin leer`
                : 'Todas al día'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            )}
            <span className="hidden sm:inline">Marcar todas</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/30'
              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            filter === 'unread'
              ? 'bg-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/30'
              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          No leídas ({unreadCount})
        </button>
      </div>

      {/* Notifications list */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {filter === 'unread' ? 'No tenés alertas pendientes' : 'No tenés notificaciones aún'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Cuando otros jugadores comenten tus posts, les gusten tus fotos o se sumen a tus turnos, te avisaremos aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleClickItem(item)}
              className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                item.isRead
                  ? 'bg-white/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300 hover:shadow-sm'
                  : 'bg-gradient-to-r from-[var(--color-primary)]/10 via-white dark:via-slate-900 to-[var(--color-secondary)]/10 border-[var(--color-primary)]/30 shadow-sm'
              }`}
            >
              {/* Type icon */}
              {getIcon(item.type)}

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0 animate-pulse" />
                  )}
                </div>

                {item.body && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-1.5">
                    {item.body}
                  </p>
                )}

                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 self-center">
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                  title="Eliminar notificación"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
