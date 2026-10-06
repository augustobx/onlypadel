'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { client } from '@passwordless-id/webauthn';
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  removePasskey,
} from '@/actions/passkey-auth';
import { Fingerprint, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';

type PasskeyItem = {
  id: string;
  authenticatorName: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type PasskeyManagerProps = {
  initialPasskeys: PasskeyItem[];
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function PasskeyManager({ initialPasskeys }: PasskeyManagerProps) {
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
      'PublicKeyCredential' in window &&
      !!navigator.credentials
    );
  }, []);

  async function handleAddPasskey() {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const start = await beginPasskeyRegistration();
      if (!start.success) {
        setError(start.error);
        return;
      }

      const registration = await client.register({
        challenge: start.challenge,
        user: start.user,
        domain: start.rpId,
        hints: ['client-device'],
        userVerification: 'required',
        discoverable: 'required',
        attestation: false,
        timeout: 60_000,
      });

      const result = await finishPasskeyRegistration(start.challengeId, registration);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage('Ingreso biométrico activado correctamente.');
      router.refresh();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        setError('Activación cancelada. Podés intentarlo cuando quieras.');
      } else {
        console.error('Passkey activation error:', err);
        setError('No se pudo activar el ingreso biométrico en este dispositivo.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(passkeyId: string) {
    if (!window.confirm('¿Eliminar este acceso biométrico de OnlyPadel?')) return;

    setRemovingId(passkeyId);
    setMessage('');
    setError('');

    try {
      const result = await removePasskey(passkeyId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage('Passkey eliminada.');
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <Fingerprint className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Face ID / Biometría</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Entrá sin escribir tu contraseña usando Face ID, Touch ID, huella o Windows Hello.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/50 p-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
            Tu rostro o huella nunca se envían a OnlyPadel. La verificación se realiza de forma segura en tu dispositivo.
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

        {initialPasskeys.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Dispositivos habilitados
            </p>
            {initialPasskeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-3.5"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4 text-[var(--color-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {passkey.authenticatorName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Activado {formatDate(passkey.createdAt)}
                      {passkey.lastUsedAt ? ` · usado ${formatDate(passkey.lastUsedAt)}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(passkey.id)}
                  disabled={removingId === passkey.id}
                  aria-label="Eliminar passkey"
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
                >
                  {removingId === passkey.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {supported === false ? (
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
            Este navegador o dispositivo no ofrece passkeys compatibles. Podés seguir ingresando con DNI y contraseña.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddPasskey}
            disabled={busy || supported === null}
            className="w-full rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] py-3.5 px-4 font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activando...
              </>
            ) : initialPasskeys.length ? (
              <>
                <Plus className="w-5 h-5" />
                Agregar otro dispositivo
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                Activar Face ID / biometría
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
