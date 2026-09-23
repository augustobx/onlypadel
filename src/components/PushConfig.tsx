'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bell, BellOff } from 'lucide-react';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushConfig() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setSwRegistration(reg);
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
          setLoading(false);
        });
      }).catch(err => {
        console.error('Service Worker registration failed:', err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleSubscribe = async () => {
    if (!swRegistration) return alert('Service worker no está listo.');
    if (!publicVapidKey) return alert('Llaves VAPID no configuradas en .env');

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Debes permitir las notificaciones en tu navegador.');
        setLoading(false);
        return;
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // Save to DB
      await fetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error('Error al suscribir:', error);
      alert('Ocurrió un error al intentar activar las notificaciones.');
    }
    setLoading(false);
  };

  const handleUnsubscribe = async () => {
    if (!swRegistration) return;
    setLoading(true);
    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        // Delete from DB first
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Unsubscribe locally
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error('Error al desuscribir:', error);
      alert('Error al desactivar notificaciones.');
    }
    setLoading(false);
  };

  return (
    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm bg-card text-card-foreground">
      <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 rounded-t-3xl border-b border-slate-200/60 dark:border-slate-800/60">
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-lg">
          {isSubscribed ? <Bell className="w-5 h-5 text-[var(--color-primary)]" /> : <BellOff className="w-5 h-5 text-slate-400" />}
          Notificaciones Push
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">
          Recibe un aviso sonoro e instantáneo en este dispositivo cada vez que alguien reserve un turno.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        
        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-800/60">
          <div>
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Estado en este dispositivo</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {loading ? 'Verificando...' : isSubscribed ? 'Recibiendo alertas de nuevos turnos.' : 'Alertas pausadas.'}
            </p>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isSubscribed} 
              disabled={loading}
              onChange={(e) => {
                if (e.target.checked) handleSubscribe();
                else handleUnsubscribe();
              }} 
            />
            <div className={`w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isSubscribed ? 'bg-[var(--color-primary)]' : 'bg-slate-300 dark:bg-slate-700'} ${loading ? 'opacity-50' : ''}`}></div>
          </label>
        </div>

        <div className="bg-sky-500/10 dark:bg-sky-500/15 text-sky-900 dark:text-sky-200 text-xs p-4 rounded-2xl leading-relaxed border border-sky-500/25">
          <p className="font-bold mb-1.5 flex items-center gap-1.5 text-sky-800 dark:text-sky-300">💡 Cómo probar las notificaciones:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
            <li>Activa el interruptor de arriba y acepta el permiso del navegador si te lo pide.</li>
            <li>Abre otra pestaña o dispositivo simulando ser un cliente y haz una reserva.</li>
            <li>Asegúrate de que la campanita (Notificaciones) de tu SO no esté en modo &quot;No Molestar&quot;.</li>
            <li>Deberías recibir la notificación push al instante.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
