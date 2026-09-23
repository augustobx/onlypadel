"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  CalendarDays,
  Search,
  MessageCircle,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/comunidad", label: "Feed", icon: Newspaper },
  { href: "/comunidad/turnos", label: "Partidos", icon: CalendarDays },
  { href: "/comunidad/jugadores", label: "Jugadores", icon: Search },
  { href: "/comunidad/chat", label: "Chat", icon: MessageCircle },
  { href: "/comunidad/notificaciones", label: "Alertas", icon: Bell },
];

export default function CommunityNav({
  unreadNotifications = 0,
  unreadMessages = 0,
}: {
  unreadNotifications?: number;
  unreadMessages?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--card)]/90 backdrop-blur-xl border-t border-[var(--border)] safe-area-bottom shadow-lg">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/comunidad"
              ? pathname === "/comunidad"
              : pathname.startsWith(item.href);

          const isChat = item.href === "/comunidad/chat";
          const hasChatUnread = isChat && unreadMessages > 0;
          const hasAlert = item.href === "/comunidad/notificaciones" && unreadNotifications > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[64px]
                ${
                  isActive
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold scale-105"
                    : "text-slate-400 hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50 active:scale-95"
                }
              `}
            >
              <div className="relative">
                <item.icon
                  className={`w-5 h-5 transition-all ${
                    isActive
                      ? "text-[var(--color-primary)] drop-shadow-sm"
                      : ""
                  }`}
                />
                {hasAlert && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[var(--card)] animate-pulse" />
                )}
                {hasChatUnread && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[var(--card)] animate-pulse shadow-sm">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  isActive ? "text-[var(--color-primary)] font-bold" : ""
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-6 h-0.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
