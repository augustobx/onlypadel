import { redirect } from 'next/navigation';
import { Activity, Building2, CircleDollarSign, ShieldAlert } from 'lucide-react';
import { getPlatformSession } from '@/lib/platform-auth';
import { platformPrisma } from '@/lib/prisma-core';
import { suspendExpiredTenants } from '@/lib/membership';

export default async function SuperAdminDashboard() {
  const session = await getPlatformSession();
  if (!session) redirect('/superadmin/login');
  await suspendExpiredTenants();

  const [tenants, active, suspended, subscriptions, audit] = await Promise.all([
    platformPrisma.tenant.count(),
    platformPrisma.tenant.count({ where: { status: 'ACTIVE' } }),
    platformPrisma.tenant.count({ where: { status: 'SUSPENDED' } }),
    platformPrisma.tenantSubscription.findMany({ where: { status: 'ACTIVE' }, include: { plan: true } }),
    platformPrisma.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { tenant: true } }),
  ]);
  const mrr = subscriptions.reduce((acc, item) => acc + Number(item.plan.price), 0);

  const cards = [
    { label: 'Clubes Totales', value: tenants, icon: Building2 },
    { label: 'Clubes Activos', value: active, icon: Activity },
    { label: 'Suspendidos', value: suspended, icon: ShieldAlert },
    { label: 'MRR Estimado', value: `$${mrr.toLocaleString('es-AR')}`, icon: CircleDollarSign },
  ];

  return <div className="space-y-8">
    <div><h1 className="text-2xl font-bold text-white">Métricas de Plataforma</h1><p className="text-sm text-slate-400 mt-1">Estado general de OnlyPadel SaaS.</p></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(({label,value,icon:Icon}) => <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><Icon className="w-5 h-5 text-indigo-400" /></div><div className="text-3xl font-black text-white mt-3">{value}</div></div>)}</div>
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="font-bold text-white mb-4">Auditoría reciente</h2><div className="space-y-2">{audit.map(item => <div key={item.id} className="flex justify-between gap-4 border-b border-slate-800 py-2 text-sm"><span className="text-slate-300">{item.action} · {item.tenant?.name || 'Plataforma'}</span><time className="text-slate-500">{item.createdAt.toLocaleString('es-AR')}</time></div>)}</div></section>
  </div>;
}
