'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAdmin } from '@/actions/auth';
import { LayoutDashboard, Calendar, MapPin, CreditCard, Settings, Menu, X, LogOut, Trophy, ClipboardList, CalendarDays, Users, BarChart3, BadgeCheck } from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { name: 'Diario', icon: Calendar, href: '/admin/calendar' },
  { name: 'Abonos Fijos', icon: CalendarDays, href: '/admin/abonos' },
  { name: 'Historial', icon: ClipboardList, href: '/admin/history' },
  { name: 'Canchas', icon: MapPin, href: '/admin/courts' },
  { name: 'Usuarios', icon: Users, href: '/admin/usuarios' },
  { name: 'Gastos', icon: CreditCard, href: '/admin/expenses' },
  { name: 'Torneos', icon: Trophy, href: '/admin/torneos' },
  { name: 'Rankings', icon: BarChart3, href: '/admin/rankings' },
  { name: 'Categorías jugadores', icon: BadgeCheck, href: '/admin/categorias-jugadores' },
  { name: 'Configuración', icon: Settings, href: '/admin/settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  const handleLogout = async () => {
    await logoutAdmin();
    router.push('/login');
  };

  return (
    <>
      {/* NAVBAR MOBILE (Solo visible en celulares) */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2 font-black text-xl tracking-tight">
          <span className="text-[var(--color-primary)]">T-Padel</span> Admin
        </div>
        <button aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setIsOpen(!isOpen)} className="p-2.5 bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* OVERLAY MOBILE (Fondo oscuro al abrir el menú) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={closeMenu}
        />
      )}

      {/* SIDEBAR (Fijo en PC, Deslizable en Mobile) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Logo PC */}
        <div className="hidden md:flex items-center justify-center h-20 border-b border-slate-800">
          <h1 className="text-2xl font-black text-white tracking-tight">
            <span className="text-[var(--color-primary)]">T-Padel</span> Admin
          </h1>
        </div>

        {/* Links de Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg'
                    : 'hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-[var(--color-primary-foreground)]' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Botón Salir */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
