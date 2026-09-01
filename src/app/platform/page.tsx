import { redirect } from 'next/navigation';
import { platformPrisma } from '@/lib/prisma-core';
import { getPlatformSession } from '@/lib/platform-auth';
import { addTenantDomain, createTenant, logoutPlatform, savePlan, setFeatureOverride, setTenantPlan, setTenantStatus, verifyTenantDomain } from '@/actions/platform';
import { FEATURE_KEYS } from '@/lib/features';

export default async function PlatformPage() {
  const session = await getPlatformSession();
  if (!session) redirect('/platform/login');
  const [tenants, plans, recentAudit] = await Promise.all([
    platformPrisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, include: { domains: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: true } }, featureOverrides: true, _count: { select: { users: true, courts: true, bookings: true } } } }),
    platformPrisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' }, include: { features: true } }),
    platformPrisma.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { actor: true, tenant: true } }),
  ]);
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-5 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-emerald-400 font-black tracking-widest text-xs">ONLYPADEL · SAAS</p><h1 className="text-3xl font-black">Panel de plataforma</h1><p className="text-slate-400">{session.name} · {tenants.length} clubes</p></div><form action={logoutPlatform}><button className="rounded-xl border border-slate-700 px-4 py-2">Salir</button></form></header>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-black mb-5">Alta de club</h2><form action={createTenant} className="grid md:grid-cols-3 gap-3">
          <input name="name" required placeholder="Nombre del club" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <input name="slug" required placeholder="dominio-del-club" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <select name="planId" required className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3">{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input name="ownerName" required placeholder="Administrador" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <input name="ownerEmail" type="email" required placeholder="Correo del administrador" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <input name="ownerPassword" type="password" minLength={10} required placeholder="Contraseña inicial" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <button className="md:col-span-3 rounded-xl bg-emerald-500 text-slate-950 py-3 font-black">Crear club y tenant</button>
        </form></section>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-black mb-5">Planes</h2><form action={savePlan} className="grid md:grid-cols-3 gap-3">
          <input name="code" required placeholder="Código (PRO)" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <input name="name" required placeholder="Nombre" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <input name="price" required type="number" min="0" step="0.01" placeholder="Precio mensual" className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
          <div className="md:col-span-3 flex flex-wrap gap-3">{FEATURE_KEYS.map(key => <label key={key} className="text-sm"><input type="checkbox" name={`feature:${key}`} className="mr-1"/> {key}</label>)}</div>
          <button className="md:col-span-3 rounded-xl border border-emerald-600 py-3 font-black text-emerald-300">Crear o actualizar plan</button>
        </form></section>
        <section className="space-y-4"><h2 className="text-xl font-black">Clubes</h2>{tenants.map(tenant => { const subscription = tenant.subscriptions[0]; return <article key={tenant.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-black">{tenant.name}</h3><a className="text-emerald-400" href={`https://${tenant.domains[0]?.hostname}`} target="_blank">{tenant.domains[0]?.hostname}</a><p className="text-xs text-slate-500 mt-1">{tenant._count.users} usuarios · {tenant._count.courts} canchas · {tenant._count.bookings} reservas</p></div><span className="h-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-bold">{tenant.status}</span></div>
          <div className="grid md:grid-cols-2 gap-3"><form action={setTenantStatus} className="flex gap-2"><input type="hidden" name="tenantId" value={tenant.id}/><select name="status" defaultValue={tenant.status} className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3"><option>ACTIVE</option><option>SUSPENDED</option><option>ARCHIVED</option></select><button className="rounded-xl border border-slate-700 px-4 py-2">Estado</button></form>
          <form action={setTenantPlan} className="flex gap-2"><input type="hidden" name="tenantId" value={tenant.id}/><select name="planId" defaultValue={subscription?.planId} className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3">{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="rounded-xl border border-slate-700 px-4 py-2">Plan</button></form></div>
          <div className="flex flex-wrap gap-2">{FEATURE_KEYS.map(key => { const override = tenant.featureOverrides.find(item => item.key === key); return <form key={key} action={setFeatureOverride}><input type="hidden" name="tenantId" value={tenant.id}/><input type="hidden" name="key" value={key}/><input type="hidden" name="enabled" value={override?.enabled ? 'false' : 'true'}/><button className={`rounded-full px-3 py-1 text-xs font-bold border ${override?.enabled === false ? 'border-red-700 text-red-300' : 'border-emerald-800 text-emerald-300'}`}>{key}{override ? '*' : ''}</button></form>})}</div>
          <div className="space-y-2"><div className="flex flex-wrap gap-2">{tenant.domains.map(domain => <span key={domain.id} className="rounded-full bg-slate-900 px-3 py-1 text-xs">{domain.hostname} · {domain.verifiedAt ? 'verificado' : <form action={verifyTenantDomain} className="inline"><input type="hidden" name="domainId" value={domain.id}/><button className="text-amber-300">verificar</button></form>}</span>)}</div><form action={addTenantDomain} className="flex gap-2"><input type="hidden" name="tenantId" value={tenant.id}/><input name="hostname" required placeholder="dominio personalizado" className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2"/><button className="rounded-xl border border-slate-700 px-4">Agregar dominio</button></form></div>
        </article>})}</section>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-xl font-black mb-4">Auditoría reciente</h2><div className="space-y-2 text-sm">{recentAudit.map(log => <div key={log.id} className="flex justify-between gap-4 border-b border-white/5 py-2"><span>{log.action} · {log.tenant?.name || 'Plataforma'}</span><time className="text-slate-500">{log.createdAt.toLocaleString('es-AR')}</time></div>)}</div></section>
      </div>
    </main>
  );
}
