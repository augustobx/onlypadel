import { AlertTriangle, CreditCard, ShieldOff } from 'lucide-react';
import { getRequestHostname } from '@/lib/tenant-context';
import { platformPrisma } from '@/lib/prisma-core';

export default async function SuspendidoPage() {
  const hostname = await getRequestHostname();
  const domain = await platformPrisma.tenantDomain.findUnique({ where: { hostname }, include: { tenant: true } });
  const tenant = domain?.tenant || (hostname.endsWith('.nanoapps.ar') ? await platformPrisma.tenant.findUnique({ where: { slug: hostname.replace(/\.nanoapps\.ar$/, '') } }) : null);
  const subscription = tenant ? await platformPrisma.tenantSubscription.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, include: { plan: true } }) : null;
  const expiry = subscription?.currentPeriodEnd || subscription?.trialEndsAt;

  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white"><div className="w-full max-w-lg text-center"><div className="mx-auto w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6"><ShieldOff className="w-10 h-10 text-red-400" /></div><div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold mb-4"><AlertTriangle className="w-3.5 h-3.5" />SERVICIO SUSPENDIDO</div><h1 className="text-3xl font-bold">Membresía vencida</h1><p className="text-slate-400 mt-3 leading-relaxed">El acceso de {tenant?.name || 'este club'} a OnlyPadel está temporalmente suspendido por falta de pago.</p>{expiry && <p className="text-sm text-slate-500 mt-3">Vencimiento: {expiry.toLocaleDateString('es-AR')}</p>}<div className="mt-6 p-4 rounded-2xl bg-slate-950 border border-slate-800"><CreditCard className="w-6 h-6 text-indigo-400 mx-auto mb-2" /><p className="text-sm text-slate-300">Para restablecer el servicio, regularizá la membresía con NanoLabs.</p></div><p className="text-xs text-slate-500 mt-6">Una vez registrado el pago, el acceso se rehabilita automáticamente.</p></div><p className="text-xs text-slate-600 mt-5">OnlyPadel · Plataforma SaaS NanoLabs</p></div></main>;
}
