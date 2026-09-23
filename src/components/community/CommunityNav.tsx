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
}: {
  unreadNotifications?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 safe-area-bottom">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/comunidad"
              ? pathname === "/comunidad"
              : pathname.startsWith(item.href);

          const hasAlert = item.href === "/comunidad/notificaciones" && unreadNotifications > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[64px]
                ${
                  isActive
                    ? "bg-gradient-to-t from-violet-100 to-fuchsia-50 dark:from-violet-950/60 dark:to-fuchsia-950/40 text-violet-700 dark:text-violet-300 scale-105"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-95"
                }
              `}
            >
              <div className="relative">
                <item.icon
                  className={`w-5 h-5 transition-all ${
                    isActive
                      ? "text-violet-600 dark:text-violet-400 drop-shadow-sm"
                      : ""
                  }`}
                />
                {hasAlert && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  isActive ? "text-violet-700 dark:text-violet-300" : ""
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-6 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
