'use client';

import { useActionState } from 'react';
import { Shield } from 'lucide-react';
import { loginPlatform } from '@/actions/platform';

const initialState = { success: false, error: '' };

export default function SuperAdminLoginPage() {
  const [state, action, pending] = useActionState(async (_state: typeof initialState, data: FormData) => loginPlatform(data), initialState);
  return (
    <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
      <form action={action} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4"><Shield className="w-7 h-7" /></div>
          <p className="text-indigo-400 font-black tracking-widest text-xs">ONLYPADEL</p>
          <h1 className="text-3xl font-black mt-2">SuperAdmin</h1>
          <p className="text-slate-400 mt-2">Control central de clubes, membresías y planes SaaS.</p>
        </div>
        <input name="email" type="email" required placeholder="Correo" className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" />
        <input name="password" type="password" required minLength={8} placeholder="Contraseña" className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3" />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 font-black disabled:opacity-50">{pending ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </main>
  );
}
