"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Search, ExternalLink, Settings, Users, Store, CalendarDays, CheckCircle2, AlertCircle, X } from "lucide-react";
import { createTenantSuperAdmin } from "@/actions/superadmin";

export function TenantsManagerClient({ tenants, plans }: { tenants: any[]; plans: any[] }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())), [tenants, search]);
  const today = new Date().toISOString().slice(0,10);

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2"><Building2 className="w-6 h-6 text-indigo-400" />Gestión de Clubes (Tenants)</h1>
        <p className="text-sm text-slate-400 mt-1">Aprovisionamiento automático, asignación de planes y estado operativo.</p>
      </div>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all"><Plus className="w-4 h-4" />Aprovisionar Club</button>
    </div>

    <div className="relative max-w-md"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o subdominio..." className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>

    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300">
        <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800"><tr><th className="py-3.5 px-6">Club & Dominio</th><th className="py-3.5 px-6">Plan SaaS</th><th className="py-3.5 px-6">Recursos Creados</th><th className="py-3.5 px-6">Estado</th><th className="py-3.5 px-6 text-right">Acciones</th></tr></thead>
        <tbody className="divide-y divide-slate-800/60">{filtered.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No se encontraron clubes con ese criterio.</td></tr> : filtered.map(t => <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
          <td className="py-4 px-6"><div className="font-semibold text-white">{t.name}</div><div className="text-xs text-indigo-400 font-mono mt-0.5 flex items-center gap-1">{t.host}<a href={`https://${t.host}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300"><ExternalLink className="w-3 h-3" /></a></div></td>
          <td className="py-4 px-6"><div className="inline-block px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700">{t.planName || 'Sin plan'}</div><div className="text-[11px] text-emerald-400 font-semibold mt-1">${Number(t.planPrice || 0).toLocaleString('es-AR')}/mes</div></td>
          <td className="py-4 px-6"><div className="flex items-center gap-3 text-xs text-slate-400"><span className="flex items-center gap-1" title="Usuarios"><Users className="w-3.5 h-3.5 text-indigo-400" />{t.users}</span><span className="flex items-center gap-1" title="Canchas"><Store className="w-3.5 h-3.5 text-cyan-400" />{t.courts}</span><span className="flex items-center gap-1" title="Reservas"><CalendarDays className="w-3.5 h-3.5 text-emerald-400" />{t.bookings}</span></div></td>
          <td className="py-4 px-6">{t.status === 'ACTIVE' ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />Activo</span> : <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><AlertCircle className="w-3 h-3" />{t.status === 'SUSPENDED' ? 'Suspendido' : 'Archivado'}</span>}</td>
          <td className="py-4 px-6 text-right"><Link href={`/superadmin/tenants/${t.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-indigo-300 border border-slate-700"><Settings className="w-3.5 h-3.5" />Gestionar</Link></td>
        </tr>)}</tbody>
      </table></div>
    </div>

    {open && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6"><div><h2 className="text-lg font-bold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-400" />Aprovisionar Nuevo Club SaaS</h2><p className="text-xs text-slate-400 mt-0.5">Se creará el tenant, dominio, suscripción y usuario administrador.</p></div><button onClick={()=>setOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
      <form action={createTenantSuperAdmin} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-slate-300 mb-1">Nombre Comercial *</label><input name="name" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" /></div>
          <div><label className="block text-xs font-medium text-slate-300 mb-1">Subdominio (Slug) *</label><div className="flex"><input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="w-full bg-slate-950 border border-slate-800 rounded-l-xl px-3 py-2 text-sm text-white font-mono" /><span className="bg-slate-800 border border-l-0 border-slate-800 rounded-r-xl px-3 py-2 text-xs text-slate-400 font-mono">.nanoapps.ar</span></div></div>
          <div><label className="block text-xs font-medium text-slate-300 mb-1">Fecha de Inicio *</label><input type="date" name="startsAt" required defaultValue={today} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" /></div>
          <div><label className="block text-xs font-medium text-slate-300 mb-1">Fecha de Vencimiento *</label><input type="date" name="expiresAt" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" /></div>
          <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-300 mb-1">Plan SaaS Asignado *</label><select name="planId" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white">{plans.map(p => <option key={p.id} value={p.id}>{p.name} (${Number(p.price).toLocaleString('es-AR')}/mes)</option>)}</select></div>
        </div>
        <div className="pt-4 border-t border-slate-800"><h3 className="text-sm font-semibold text-indigo-400 mb-3">Usuario Administrador Inicial del Tenant</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div><label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo *</label><input name="ownerName" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" /></div><div><label className="block text-xs font-medium text-slate-300 mb-1">Email *</label><input name="ownerEmail" type="email" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" /></div><div><label className="block text-xs font-medium text-slate-300 mb-1">Contraseña *</label><input name="ownerPassword" type="password" minLength={10} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" /></div></div></div>
        <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 rounded-xl text-sm text-slate-300 border border-slate-700">Cancelar</button><button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">Crear y Aprovisionar</button></div>
      </form>
    </div></div>}
  </div>;
}
