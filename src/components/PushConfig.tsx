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
    <Card className="border-amber-200">
      <CardHeader className="bg-amber-50/50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? <Bell className="w-5 h-5 text-amber-600" /> : <BellOff className="w-5 h-5 text-gray-400" />}
          Notificaciones Push
        </CardTitle>
        <CardDescription>
          Recibe un aviso sonoro e instantáneo en este dispositivo cada vez que alguien reserve un turno.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        
        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
          <div>
            <p className="font-medium text-gray-900">Estado en este dispositivo</p>
            <p className="text-xs text-gray-500">
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
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isSubscribed ? 'bg-amber-500' : 'bg-gray-200'} ${loading ? 'opacity-50' : ''}`}></div>
          </label>
        </div>

        <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg leading-relaxed border border-blue-100">
          <p className="font-bold mb-1">Cómo probar las notificaciones:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Activa el interruptor de arriba y acepta el permiso del navegador si te lo pide.</li>
            <li>Abre otra pestaña o dispositivo simulando ser un cliente y haz una reserva.</li>
            <li>Asegúrate de que la campanita (Notificaciones) de tu SO no esté en modo "No Molestar".</li>
            <li>Deberías recibir la notificación push al instante.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
