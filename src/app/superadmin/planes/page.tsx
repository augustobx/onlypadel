import { redirect } from 'next/navigation';
import { Layers } from 'lucide-react';
import { savePlanSuperAdmin } from '@/actions/superadmin';
import { FEATURE_KEYS } from '@/lib/features';
import { getPlatformSession } from '@/lib/platform-auth';
import { platformPrisma } from '@/lib/prisma-core';

function readLimits(value: unknown) {
  const limits = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    users: Number(limits.users || 0),
    courts: Number(limits.courts || 0),
    bookings: Number(limits.bookings || 0),
  };
}

export default async function PlanesPage() {
  const session = await getPlatformSession();
  if (!session) redirect('/superadmin/login');
  const plans = await platformPrisma.plan.findMany({ orderBy: { price: 'asc' }, include: { features: true, _count: { select: { subscriptions: true } } } });

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Layers className="w-6 h-6 text-emerald-400" />Planes SaaS</h1><p className="text-sm text-slate-400 mt-1">Configuración comercial, límites y módulos incluidos.</p></div>
    <div className="grid xl:grid-cols-3 gap-6">{plans.map(plan => { const limits = readLimits(plan.limits); const enabled = new Set(plan.features.filter(f => f.enabled).map(f => f.key)); return <form key={plan.id} action={savePlanSuperAdmin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"><input type="hidden" name="planId" value={plan.id} /><input type="hidden" name="code" value={plan.code} /><div className="flex justify-between items-center"><span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">{plan.code}</span><span className="text-xs text-slate-500">{plan._count.subscriptions} suscripciones</span></div><div><label className="text-xs text-slate-400">Nombre</label><input name="name" defaultValue={plan.name} required className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" /></div><div><label className="text-xs text-slate-400">Descripción</label><textarea name="description" defaultValue={plan.description || ''} rows={3} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" /></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-slate-400">Precio mensual</label><input name="price" type="number" min="0" step="0.01" defaultValue={Number(plan.price)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2" /></div><div><label className="text-xs text-slate-400">Moneda</label><input name="currency" defaultValue={plan.currency} maxLength={3} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2" /></div></div><div className="grid grid-cols-3 gap-2"><input name="limitUsers" type="number" min="0" defaultValue={limits.users} placeholder="Usuarios" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2" /><input name="limitCourts" type="number" min="0" defaultValue={limits.courts} placeholder="Canchas" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2" /><input name="limitBookings" type="number" min="0" defaultValue={limits.bookings} placeholder="Reservas" className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2" /></div><div className="flex gap-4 text-xs"><label><input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="mr-2" />Activo</label><label><input type="checkbox" name="isPublic" defaultChecked={plan.isPublic} className="mr-2" />Público</label></div><div><p className="text-[11px] uppercase text-slate-500 font-semibold mb-2">Módulos incluidos</p><div className="grid grid-cols-2 gap-2">{FEATURE_KEYS.map(key => <label key={key} className="text-[11px] bg-slate-950 border border-slate-800 rounded-lg p-2"><input type="checkbox" name={`feature:${key}`} defaultChecked={enabled.has(key)} className="mr-2" />{key}</label>)}</div></div><button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 font-semibold">Guardar plan</button></form>})}</div>
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="font-bold text-white mb-4">Crear nuevo plan</h2><form action={savePlanSuperAdmin} className="grid md:grid-cols-4 gap-3"><input name="code" required placeholder="Código" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><input name="name" required placeholder="Nombre" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><input name="price" required type="number" min="0" step="0.01" placeholder="Precio" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><input name="currency" defaultValue="ARS" className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" /><input type="hidden" name="isActive" value="on" /><input type="hidden" name="isPublic" value="on" /><button className="md:col-span-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 py-3 font-bold">Crear plan</button></form></section>
  </div>;
}
