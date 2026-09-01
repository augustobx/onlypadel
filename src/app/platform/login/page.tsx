'use client';

import { useActionState } from 'react';
import { loginPlatform } from '@/actions/platform';

const initialState = { success: false, error: '' };

export default function PlatformLoginPage() {
  const [state, action, pending] = useActionState(async (_state: typeof initialState, data: FormData) => loginPlatform(data), initialState);
  return (
    <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
      <form action={action} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl space-y-5">
        <div><p className="text-emerald-400 font-black tracking-widest text-xs">ONLYPADEL</p><h1 className="text-3xl font-black mt-2">SuperAdmin</h1><p className="text-slate-400 mt-2">Control central de clubes, planes y módulos.</p></div>
        <input name="email" type="email" required placeholder="Correo" className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
        <input name="password" type="password" required minLength={8} placeholder="Contraseña" className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3" />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-xl bg-emerald-500 py-3 font-black text-slate-950 disabled:opacity-50">{pending ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </main>
  );
}
