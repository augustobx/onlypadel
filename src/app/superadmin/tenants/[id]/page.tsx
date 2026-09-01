import { notFound, redirect } from 'next/navigation';
import { CreditCard, Globe2, Settings2 } from 'lucide-react';
import { addTenantDomain, setFeatureOverride, verifyTenantDomain } from '@/actions/platform';
import { registerSaasPayment, updateTenantSuperAdmin } from '@/actions/superadmin';
import { FEATURE_KEYS } from '@/lib/features';
import { getPlatformSession } from '@/lib/platform-auth';
import { platformPrisma } from '@/lib/prisma-core';

const dateValue = (date?: Date | null) => date ? date.toISOString().slice(0, 10) : '';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) redirect('/superadmin/login');
  const { id } = await params;
  const [tenant, plans] = await Promise.all([
    platformPrisma.tenant.findUnique({ where: { id }, include: { domains: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: true } }, featureOverrides: true, saasPayments: { orderBy: { createdAt: 'desc' }, take: 8 }, _count: { select: { users: true, courts: true, bookings: true } } } }),
    platformPrisma.plan.findMany({ orderBy: { price: 'asc' } }),
  ]);
  if (!tenant) notFound();
  const sub = tenant.subscriptions[0];

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-white">{tenant.name}</h1><p className="text-sm text-slate-400 mt-1">{tenant.slug}.nanoapps.ar · {tenant._count.users} usuarios · {tenant._count.courts} canchas · {tenant._count.bookings} reservas</p></div>
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="font-bold text-white flex items-center gap-2 mb-4"><Settings2 className="w-4 h-4 text-indigo-400" />Datos generales y membresía</h2><form action={updateTenantSuperAdmin} className="grid md:grid-cols-2 gap-4">
      <input type="hidden" name="tenantId" value={tenant.id} />
      <div><label className="text-xs text-slate-400">Nombre</label><input name="name" defaultValue={tenant.name} required className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /></div>
      <div><label className="text-xs text-slate-400">Estado</label><select name="status" defaultValue={tenant.status} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3"><option value="ACTIVE">ACTIVO</option><option value="SUSPENDED">SUSPENDIDO</option><option value="ARCHIVED">ARCHIVADO</option></select></div>
      <div><label className="text-xs text-slate-400">Plan</label><select name="planId" defaultValue={sub?.planId} required className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3">{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div><label className="text-xs text-slate-400">Inicio membresía</label><input type="date" name="startsAt" defaultValue={dateValue(sub?.currentPeriodStart || sub?.startsAt)} required className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /></div>
      <div><label className="text-xs text-slate-400">Vencimiento</label><input type="date" name="expiresAt" defaultValue={dateValue(sub?.currentPeriodEnd || sub?.trialEndsAt)} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /></div>
      <button className="md:self-end rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 font-bold">Guardar cambios</button>
    </form></section>

    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="font-bold text-white flex items-center gap-2 mb-4"><CreditCard className="w-4 h-4 text-emerald-400" />Registrar pago y reactivar</h2><form action={registerSaasPayment} className="grid md:grid-cols-4 gap-3"><input type="hidden" name="tenantId" value={tenant.id} /><input name="amount" type="number" min="1" step="0.01" defaultValue={sub ? Number(sub.plan.price) : 0} required placeholder="Monto" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><input name="periodStart" type="date" defaultValue={dateValue(new Date())} required className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><input name="periodEnd" type="date" required className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><input name="notes" placeholder="Notas" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><button className="md:col-span-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 py-3 font-bold">Registrar pago</button></form>
      <div className="mt-4 space-y-2">{tenant.saasPayments.map(p => <div key={p.id} className="flex justify-between text-xs border-t border-slate-800 pt-2"><span className="text-slate-300">${Number(p.amount).toLocaleString('es-AR')} · {p.status}</span><span className="text-slate-500">{p.paidAt?.toLocaleDateString('es-AR') || p.createdAt.toLocaleDateString('es-AR')}</span></div>)}</div>
    </section>

    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="font-bold text-white flex items-center gap-2 mb-4"><Globe2 className="w-4 h-4 text-cyan-400" />Dominios</h2><div className="flex flex-wrap gap-2 mb-4">{tenant.domains.map(d => <span key={d.id} className="rounded-full bg-slate-950 border border-slate-800 px-3 py-1 text-xs">{d.hostname} · {d.verifiedAt ? 'verificado' : <form action={verifyTenantDomain} className="inline"><input type="hidden" name="domainId" value={d.id} /><button className="text-amber-300">verificar</button></form>}</span>)}</div><form action={addTenantDomain} className="flex gap-2"><input type="hidden" name="tenantId" value={tenant.id} /><input name="hostname" required placeholder="dominio personalizado" className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><button className="rounded-xl border border-slate-700 px-4">Agregar</button></form></section>

    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="font-bold text-white mb-4">Módulos / Overrides</h2><div className="flex flex-wrap gap-2">{FEATURE_KEYS.map(key => { const override = tenant.featureOverrides.find(o => o.key === key); return <form key={key} action={setFeatureOverride}><input type="hidden" name="tenantId" value={tenant.id} /><input type="hidden" name="key" value={key} /><input type="hidden" name="enabled" value={override?.enabled ? 'false' : 'true'} /><button className={`rounded-full px-3 py-1 text-xs font-bold border ${override?.enabled === false ? 'border-red-700 text-red-300' : 'border-emerald-800 text-emerald-300'}`}>{key}{override ? '*' : ''}</button></form>})}</div></section>
  </div>;
}
