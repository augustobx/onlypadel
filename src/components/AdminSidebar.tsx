'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAdmin } from '@/actions/auth';
import { 
  LayoutDashboard, Calendar, MapPin, CreditCard, Settings, Menu, X, LogOut, 
  Trophy, ClipboardList, CalendarDays, Users, BarChart3, BadgeCheck, ExternalLink,
  Sparkles, Coffee, DollarSign, FileText
} from 'lucide-react';

interface NavSection {
  title: string;
  items: {
    name: string;
    icon: any;
    href: string;
    feature?: string;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: 'Operaciones',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', feature: 'reservations' },
      { name: 'Calendario', icon: Calendar, href: '/admin/calendar', feature: 'reservations', badge: 'Día/Sem/Mes' },
      { name: 'Caja Diaria', icon: DollarSign, href: '/admin/caja', feature: 'reservations', badge: 'Arqueo' },
      { name: 'Cantina & POS', icon: Coffee, href: '/admin/cantina', feature: 'reservations' },
      { name: 'Abonos Fijos', icon: CalendarDays, href: '/admin/abonos', feature: 'reservations' },
      { name: 'Historial', icon: ClipboardList, href: '/admin/history', feature: 'reservations' },
    ]
  },
  {
    title: 'Gestión',
    items: [
      { name: 'Canchas & Horarios', icon: MapPin, href: '/admin/courts', feature: 'reservations' },
      { name: 'Socios & Usuarios', icon: Users, href: '/admin/usuarios', feature: 'users' },
      { name: 'Cuentas Corrientes', icon: FileText, href: '/admin/cuentas-corrientes', feature: 'reservations' },
      { name: 'Gastos Operativos', icon: CreditCard, href: '/admin/expenses', feature: 'expenses' },
    ]
  },
  {
    title: 'Competiciones',
    items: [
      { name: 'Torneos', icon: Trophy, href: '/admin/torneos', feature: 'tournaments' },
      { name: 'Rankings', icon: BarChart3, href: '/admin/rankings', feature: 'rankings' },
      { name: 'Categorías', icon: BadgeCheck, href: '/admin/categorias-jugadores', feature: 'player_categories' },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Configuración & Branding', icon: Settings, href: '/admin/settings' },
    ]
  }
];

export default function AdminSidebar({ 
  enabledFeatures = [],
  clubName = 'OnlyPadel',
  clubLogo = '',
  sportEmoji = '🎾'
}: { 
  enabledFeatures?: string[];
  clubName?: string;
  clubLogo?: string;
  sportEmoji?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    await logoutAdmin();
    router.push('/login');
  };

  const hasLogoImage = /^(https?:\/\/|\/|data:image\/)/i.test(clubLogo);

  return (
    <>
      {/* NAVBAR MOBILE */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3.5 sticky top-0 z-40 shadow-lg border-b border-slate-800">
        <div className="flex items-center gap-2.5 font-black text-lg tracking-tight">
          {hasLogoImage ? (
            <Image src={clubLogo} alt={clubName} width={32} height={32} unoptimized className="w-8 h-8 rounded-lg object-contain bg-slate-800 p-0.5" />
          ) : (
            <span className="text-xl">{sportEmoji}</span>
          )}
          <span className="truncate max-w-[180px]">{clubName}</span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">Admin</span>
        </div>
        <button 
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'} 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={closeMenu}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-950 border-r border-slate-800/80 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header / Logo PC */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80 bg-slate-900/40">
          {hasLogoImage ? (
            <Image src={clubLogo} alt={clubName} width={36} height={36} unoptimized className="w-9 h-9 rounded-xl object-contain bg-slate-800 p-1 border border-slate-700/50" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg shadow-sm">
              {sportEmoji}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-white tracking-tight truncate leading-tight">
              {clubName}
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Panel Admin
            </p>
          </div>
        </div>

        {/* Links de Navegación agrupados */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navSections.map((section) => {
            const filteredItems = section.items.filter(
              item => !item.feature || enabledFeatures.includes(item.feature)
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
                {filteredItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMenu}
                      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                        isActive
                          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold shadow-md shadow-[var(--color-primary)]/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-[var(--color-primary-foreground)]' : 'text-slate-400 group-hover:text-slate-200'
                        }`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && !isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 group-hover:bg-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 space-y-1.5">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Ver Web Pública
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}

