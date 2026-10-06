'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, ShieldCheck } from 'lucide-react';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function UserPushConfig() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const canUsePush =
        typeof window !== 'undefined' &&
        window.isSecureContext &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!canUsePush) {
        if (!cancelled) {
          setSupported(false);
          setLoading(false);
        }
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const localSubscription = await reg.pushManager.getSubscription();

        let subscribedForThisUser = false;
        if (localSubscription) {
          const response = await fetch(
            `/api/push/user-subscription?endpoint=${encodeURIComponent(localSubscription.endpoint)}`,
            { cache: 'no-store' }
          );
          if (response.ok) {
            const data = await response.json();
            subscribedForThisUser = Boolean(data?.subscribed);
          }
        }

        if (!cancelled) {
          setRegistration(reg);
          setIsSubscribed(subscribedForThisUser);
          setSupported(true);
        }
      } catch (err) {
        console.error('User push initialization error:', err);
        if (!cancelled) {
          setSupported(false);
          setError('No se pudo verificar el estado de las notificaciones en este dispositivo.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  async function getVapidKey() {
    if (publicVapidKey) return publicVapidKey;

    const response = await fetch('/api/push/public-key', { cache: 'no-store' });
    if (!response.ok) return '';

    const data = await response.json();
    return typeof data?.publicKey === 'string' ? data.publicKey : '';
  }

  async function enableNotifications() {
    if (!registration) {
      setError('Las notificaciones no están disponibles todavía. Recargá la página e intentá nuevamente.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (Notification.permission === 'denied') {
        setError('Las notificaciones están bloqueadas en el navegador. Habilitalas desde los permisos del sitio.');
        return;
      }

      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

      if (permission !== 'granted') {
        setError('Necesitamos tu permiso para enviarte notificaciones en este dispositivo.');
        return;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const key = await getVapidKey();
        if (!key) {
          setError('No se pudo obtener la configuración de notificaciones del servidor.');
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const response = await fetch('/api/push/user-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        throw new Error('SUBSCRIBE_FAILED');
      }

      setIsSubscribed(true);
      setMessage('Notificaciones activadas en este dispositivo.');
    } catch (err) {
      console.error('User push subscribe error:', err);
      setError('No se pudieron activar las notificaciones. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  async function disableNotifications() {
    if (!registration) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch('/api/push/user-subscription', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        if (!response.ok) {
          throw new Error('UNSUBSCRIBE_FAILED');
        }

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setMessage('Notificaciones desactivadas en este dispositivo.');
    } catch (err) {
      console.error('User push unsubscribe error:', err);
      setError('No se pudieron desactivar las notificaciones. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            {isSubscribed ? (
              <Bell className="w-6 h-6 text-[var(--color-primary)]" />
            ) : (
              <BellOff className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Notificaciones</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Recibí avisos de mensajes, actividad de la comunidad, convocatorias y novedades del club.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/25 border border-sky-100 dark:border-sky-900/50 p-3">
          <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
            La activación es individual para tu cuenta y para este dispositivo. Podés cambiarla cuando quieras.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}

        {supported === false ? (
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
            Este navegador o dispositivo no permite notificaciones push. En iPhone/iPad puede ser necesario instalar OnlyPadel en la pantalla de inicio.
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                Notificaciones en este dispositivo
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {loading
                  ? 'Verificando...'
                  : isSubscribed
                    ? 'Activadas para tu cuenta.'
                    : 'Desactivadas.'}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isSubscribed}
              disabled={loading || supported === null}
              onClick={() => (isSubscribed ? disableNotifications() : enableNotifications())}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                isSubscribed ? 'bg-[var(--color-primary)]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isSubscribed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {loading && (
                <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-slate-500" />
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
