'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';

export default function ConnectivityStatus() {
  // navigator.onLine produce falsos negativos en algunas WebViews. Partimos
  // del hecho comprobable de que la app cargó y reaccionamos a eventos reales.
  const [online, setOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((error) => {
        console.error('No se pudo registrar el modo PWA:', error);
      });
    }

    const onOffline = () => {
      setOnline(false);
      setShowRestored(false);
    };
    const onOnline = () => {
      setOnline(true);
      setShowRestored(true);
      window.setTimeout(() => setShowRestored(false), 3500);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-3 top-3 z-[200] mx-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold shadow-2xl ${online ? 'bg-emerald-700 text-white' : 'bg-slate-950 text-white'}`}
    >
      {online ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <WifiOff className="h-5 w-5 shrink-0" />}
      <span>{online ? 'Conexión restablecida. Ya podés continuar.' : 'Sin conexión. Tus datos siguen acá y no se enviará dos veces.'}</span>
    </div>
  );
}
