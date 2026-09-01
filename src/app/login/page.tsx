'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/actions/auth';
import { Lock, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await loginAdmin(formData);

    if (result.success) {
      router.push('/admin/dashboard');
    } else if (result.suspended) {
      router.push('/suspendido');
    } else {
      setError(result.error || 'Credenciales inválidas');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock className="w-8 h-8 text-emerald-500" /></div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Acceso Restringido</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Ingresa tus credenciales de administrador</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-bold text-center">⚠️ {error}</div>}
          <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><User className="w-4 h-4 mr-2 text-slate-400" /> Usuario</label><input type="text" name="user" required placeholder="admin" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all" /></div>
          <div className="space-y-2"><label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center"><Lock className="w-4 h-4 mr-2 text-slate-400" /> Contraseña</label><input type="password" name="pass" required placeholder="••••••••" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all" /></div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all hover:bg-emerald-600 active:scale-95 flex items-center justify-center">{loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Entrando...</> : 'Ingresar al Panel'}</button>
        </form>
      </div>
    </div>
  );
}
