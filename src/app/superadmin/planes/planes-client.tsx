"use client";

import { useState, type ReactNode } from "react";
import { Layers, Users, Store, CalendarDays, Save, Loader2 } from "lucide-react";
import { savePlanSuperAdmin } from "@/actions/superadmin";

const FEATURE_KEYS = [
  'reservations', 'users', 'tournaments', 'rankings', 'player_categories',
  'expenses', 'whatsapp', 'push', 'payments',
] as const;

export function PlanesClient({ plans }: { plans: any[] }) {
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Layers className="w-6 h-6 text-emerald-400" />Planes SaaS</h1><p className="text-sm text-slate-400 mt-1">Configuración comercial, límites y módulos incluidos en cada plan.</p></div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">{plans.map(plan => <PlanEditor key={plan.id} plan={plan} />)}</div>
  </div>;
}

function PlanEditor({ plan }: { plan: any }) {
  const [loading, setLoading] = useState(false);
  const [name,setName]=useState(plan.name);
  const [description,setDescription]=useState(plan.description || '');
  const [price,setPrice]=useState(plan.price);
  const [currency,setCurrency]=useState(plan.currency);
  const [users,setUsers]=useState(plan.limits.users);
  const [courts,setCourts]=useState(plan.limits.courts);
  const [bookings,setBookings]=useState(plan.limits.bookings);
  const [active,setActive]=useState(plan.isActive);
  const [publicPlan,setPublicPlan]=useState(plan.isPublic);
  const [features,setFeatures]=useState<string[]>(plan.features);

  const toggle=(key:string)=>setFeatures(v=>v.includes(key)?v.filter(x=>x!==key):[...v,key]);
  async function save(){
    setLoading(true);
    const fd=new FormData(); fd.set('planId',plan.id); fd.set('code',plan.code); fd.set('name',name); fd.set('description',description); fd.set('price',String(price)); fd.set('currency',currency); fd.set('limitUsers',String(users)); fd.set('limitCourts',String(courts)); fd.set('limitBookings',String(bookings)); if(active) fd.set('isActive','on'); if(publicPlan) fd.set('isPublic','on'); features.forEach(k=>fd.set(`feature:${k}`,'on'));
    try { await savePlanSuperAdmin(fd); } finally { setLoading(false); }
  }

  return <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
    <div className="flex justify-between items-start"><div><span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">{plan.code}</span><p className="text-xs text-slate-500 mt-3">{plan.subscriptions} suscripción(es)</p></div><div className="space-y-1 text-xs text-slate-300"><label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} />Activo</label><label className="flex items-center gap-2"><input type="checkbox" checked={publicPlan} onChange={e=>setPublicPlan(e.target.checked)} />Público</label></div></div>
    <div><label className="text-xs text-slate-400">Nombre</label><input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" /></div>
    <div><label className="text-xs text-slate-400">Descripción</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none" /></div>
    <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-slate-400">Precio mensual</label><input type="number" value={price} onChange={e=>setPrice(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" /></div><div><label className="text-xs text-slate-400">Moneda</label><input value={currency} maxLength={3} onChange={e=>setCurrency(e.target.value.toUpperCase())} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" /></div></div>
    <div className="grid grid-cols-3 gap-2"><Limit icon={<Users className="w-3 h-3" />} label="Usuarios" value={users} setValue={setUsers}/><Limit icon={<Store className="w-3 h-3" />} label="Canchas" value={courts} setValue={setCourts}/><Limit icon={<CalendarDays className="w-3 h-3" />} label="Reservas" value={bookings} setValue={setBookings}/></div>
    <div className="border-t border-slate-800 pt-4"><p className="text-xs font-semibold text-slate-400 uppercase mb-3">Módulos incluidos</p><div className="grid grid-cols-2 gap-2">{FEATURE_KEYS.map(key=><label key={key} className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2"><input type="checkbox" checked={features.includes(key)} onChange={()=>toggle(key)} />{key}</label>)}</div></div>
    <button onClick={save} disabled={loading} className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium">{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}Guardar Plan</button>
  </div>;
}

function Limit({icon,label,value,setValue}:{icon:ReactNode;label:string;value:number;setValue:(n:number)=>void}){return <div><label className="text-[11px] text-slate-500 flex gap-1">{icon}{label}</label><input type="number" value={value} onChange={e=>setValue(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white" /></div>}
