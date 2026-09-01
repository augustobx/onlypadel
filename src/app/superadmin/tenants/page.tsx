import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, ExternalLink, Plus } from 'lucide-react';
import { createTenantSuperAdmin } from '@/actions/superadmin';
import { getPlatformSession } from '@/lib/platform-auth';
import { platformPrisma } from '@/lib/prisma-core';
import { suspendExpiredTenants } from '@/lib/membership';

const dateValue = (date = new Date()) => date.toISOString().slice(0, 10);

export default async function TenantsPage() {
  const session = await getPlatformSession();
  if (!session) redirect('/superadmin/login');
  await suspendExpiredTenants();
  const [tenants, plans] = await Promise.all([
    platformPrisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, include: { domains: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: true } }, _count: { select: { users: true, courts: true, bookings: true } } } }),
    platformPrisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
  ]);

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Building2 className="w-6 h-6 text-cyan-400" />Clubes / Tenants</h1><p className="text-sm text-slate-400 mt-1">Altas, estado, membresía y acceso de cada club.</p></div>
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="font-bold text-white flex items-center gap-2 mb-4"><Plus className="w-4 h-4" />Nuevo club</h2><form action={createTenantSuperAdmin} className="grid md:grid-cols-3 gap-3">
      <input name="name" required placeholder="Nombre del club" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" />
      <div className="flex"><input name="slug" required placeholder="mi-club" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="min-w-0 flex-1 rounded-l-xl bg-slate-950 border border-slate-700 px-4 py-3" /><span className="rounded-r-xl border border-l-0 border-slate-700 bg-slate-800 px-3 py-3 text-slate-400">.nanoapps.ar</span></div>
      <select name="planId" required className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3">{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <input name="ownerName" required placeholder="Administrador" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" />
      <input name="ownerEmail" type="email" required placeholder="Correo administrador" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" />
      <input name="ownerPassword" type="password" minLength={10} required placeholder="Contraseña inicial" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" />
      <div><label className="text-xs text-slate-400">Inicio membresía</label><input name="startsAt" type="date" defaultValue={dateValue()} required className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /></div>
      <div><label className="text-xs text-slate-400">Vencimiento</label><input name="expiresAt" type="date" required className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /></div>
      <button className="md:self-end rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 font-bold">Crear Club</button>
    </form></section>
    <div className="grid gap-4">{tenants.map(t => { const sub = t.subscriptions[0]; const host = t.domains.find(d => d.isPrimary)?.hostname || `${t.slug}.nanoapps.ar`; return <article key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="flex items-center gap-3"><h2 className="font-bold text-white text-lg">{t.name}</h2><span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${t.status === 'ACTIVE' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>{t.status}</span></div><a href={`https://${host}`} target="_blank" className="text-sm text-cyan-400 flex items-center gap-1 mt-1">{host}<ExternalLink className="w-3 h-3" /></a><p className="text-xs text-slate-500 mt-2">{sub?.plan.name || 'Sin plan'} · {t._count.users} usuarios · {t._count.courts} canchas · {t._count.bookings} reservas</p></div><Link href={`/superadmin/tenants/${t.id}`} className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 px-4 py-2 text-sm font-semibold">Gestionar</Link></article>})}</div>
  </div>;
}
