import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, CreditCard, Globe, Layers, Shield } from 'lucide-react';
import { addTenantDomain, setFeatureOverride, verifyTenantDomain } from '@/actions/platform';
import { registerSaasPayment, updateTenantSuperAdmin } from '@/actions/superadmin';
import { FEATURE_KEYS } from '@/lib/features';
import { getPlatformSession } from '@/lib/platform-auth';
import { platformPrisma } from '@/lib/prisma-core';

const dateValue = (date?: Date | null) => date ? date.toISOString().slice(0, 10) : '';
const inputClass = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getPlatformSession();
  if (!session) redirect('/superadmin/login');
  const { id } = await params;
  const [tenant, plans] = await Promise.all([
    platformPrisma.tenant.findUnique({ where: { id }, include: { domains: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1, include: { plan: { include: { features: true } } } }, featureOverrides: true, saasPayments: { orderBy: { createdAt: 'desc' }, take: 8 }, _count: { select: { users: true, courts: true, bookings: true } } } }),
    platformPrisma.plan.findMany({ orderBy: { price: 'asc' } }),
  ]);
  if (!tenant) notFound();
  const sub = tenant.subscriptions[0];
  const primary = tenant.domains.find(d => d.isPrimary)?.hostname || `${tenant.slug}.nanoapps.ar`;

  return <div className="space-y-6">
    <div className="flex items-center justify-between"><Link href="/superadmin/tenants" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Volver a Clubes</Link></div>

    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400"><Building2 className="w-7 h-7" /></div><div><div className="flex items-center gap-3"><h1 className="text-xl font-bold text-white">{tenant.name}</h1><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${tenant.status==='ACTIVE'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-red-500/10 text-red-400 border-red-500/20'}`}>{tenant.status==='ACTIVE'?'Activo':tenant.status==='SUSPENDED'?'Suspendido':'Archivado'}</span></div><div className="text-xs text-indigo-400 font-mono mt-1 flex items-center gap-2"><span>{primary}</span></div></div></div>
      <div className="flex items-center gap-4 text-xs text-slate-300"><Counter label="Usuarios" value={tenant._count.users}/><Counter label="Canchas" value={tenant._count.courts}/><Counter label="Reservas" value={tenant._count.bookings}/></div>
    </div>

    <form action={updateTenantSuperAdmin} className="space-y-6"><input type="hidden" name="tenantId" value={tenant.id}/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2"><Shield className="w-4 h-4" />Estado y Plan de Suscripción</h2>
          <Field label="Nombre del Club"><input name="name" defaultValue={tenant.name} required className={inputClass} /></Field>
          <Field label="Estado Operativo"><select name="status" defaultValue={tenant.status} className={inputClass}><option value="ACTIVE">Activo (Habilitado 100%)</option><option value="SUSPENDED">Suspendido (Bloqueo de acceso)</option><option value="ARCHIVED">Archivado / Baja</option></select></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Fecha de Inicio"><input type="date" name="startsAt" defaultValue={dateValue(sub?.currentPeriodStart || sub?.startsAt)} required className={inputClass} /></Field><Field label="Fecha de Vencimiento"><input type="date" name="expiresAt" defaultValue={dateValue(sub?.currentPeriodEnd || sub?.trialEndsAt)} className={inputClass} /></Field></div>
          <Field label="Plan SaaS Asignado"><select name="planId" defaultValue={sub?.planId} required className={inputClass}>{plans.map(p=><option key={p.id} value={p.id}>{p.name} (${Number(p.price).toLocaleString('es-AR')}/mes)</option>)}</select></Field>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2"><Globe className="w-4 h-4" />Dominios del Tenant</h2>
          <div className="space-y-2">{tenant.domains.map(d=><div key={d.id} className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"><span className="font-mono text-slate-300 truncate">{d.hostname}</span>{d.verifiedAt?<span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Verificado</span>:<form action={verifyTenantDomain}><input type="hidden" name="domainId" value={d.id}/><button className="text-amber-300">Verificar</button></form>}</div>)}</div>
          <div className="pt-3 border-t border-slate-800"><form action={addTenantDomain} className="space-y-2"><input type="hidden" name="tenantId" value={tenant.id}/><label className="block text-xs font-medium text-slate-300">Dominio Personalizado</label><input name="hostname" placeholder="club.midominio.com" className={inputClass}/><button className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 py-2 text-sm font-medium">Agregar Dominio</button></form></div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2"><CreditCard className="w-4 h-4" />Cobro SaaS y Renovación</h2>
          <form action={registerSaasPayment} className="space-y-3"><input type="hidden" name="tenantId" value={tenant.id}/><Field label="Monto"><input name="amount" type="number" min="1" step="0.01" defaultValue={sub ? Number(sub.plan.price) : 0} required className={inputClass} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Desde"><input name="periodStart" type="date" defaultValue={dateValue(new Date())} required className={inputClass} /></Field><Field label="Hasta"><input name="periodEnd" type="date" required className={inputClass} /></Field></div><Field label="Notas"><input name="notes" className={inputClass} /></Field><button className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-medium">Registrar Cobro SaaS</button></form>
          <div className="pt-3 border-t border-slate-800 space-y-2">{tenant.saasPayments.map(p=><div key={p.id} className="flex justify-between text-[11px]"><span className="text-slate-300">${Number(p.amount).toLocaleString('es-AR')} · {p.status}</span><span className="text-slate-500">{(p.paidAt||p.createdAt).toLocaleDateString('es-AR')}</span></div>)}</div>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6"><h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2 mb-4"><Layers className="w-4 h-4" />Módulos y Overrides del Tenant</h2><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">{FEATURE_KEYS.map(key=>{const override=tenant.featureOverrides.find(o=>o.key===key); const enabled=override?.enabled!==false; return <form key={key} action={setFeatureOverride}><input type="hidden" name="tenantId" value={tenant.id}/><input type="hidden" name="key" value={key}/><input type="hidden" name="enabled" value={enabled?'false':'true'}/><button className={`w-full text-left rounded-xl border px-3 py-2 text-xs ${enabled?'bg-emerald-500/5 border-emerald-500/20 text-emerald-300':'bg-red-500/5 border-red-500/20 text-red-300'}`}>{key}{override?' *':''}</button></form>})}</div></div>
      <div className="flex justify-end"><button className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">Guardar Configuración del Tenant</button></div>
    </form>
  </div>;
}

function Counter({label,value}:{label:string;value:number}){return <div className="px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center"><div className="text-slate-500">{label}</div><div className="font-bold text-white text-sm">{value}</div></div>}
function Field({label,children}:{label:string;children:ReactNode}){return <div><label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>{children}</div>}
