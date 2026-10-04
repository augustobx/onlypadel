import { Suspense } from 'react';
import RecuperarClaveClient from './RecuperarClaveClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Recuperar Contraseña | OnlyPadel',
  description: 'Restablecé tu contraseña de acceso a OnlyPadel.',
};

export default function RecuperarClavePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <RecuperarClaveClient />
    </Suspense>
  );
}
