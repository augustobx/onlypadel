'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { client } from '@passwordless-id/webauthn';
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  getPasskeyPromptState,
} from '@/actions/passkey-auth';
import { Fingerprint, Loader2, ShieldCheck, X } from 'lucide-react';

const DISMISSED_KEY = 'onlypadel_passkey_prompt_dismissed';

export default function PasskeyEnrollmentPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function checkPrompt() {
      setOpen(false);
      setError('');

      if (
        typeof window === 'undefined' ||
        !window.isSecureContext ||
        !('PublicKeyCredential' in window) ||
        !navigator.credentials
      ) {
        return;
      }

      if (window.sessionStorage.getItem(DISMISSED_KEY) === '1') {
        return;
      }

      const state = await getPasskeyPromptState();
      if (cancelled) return;

      if (state.authenticated && !state.hasPasskey) {
        window.setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 500);
      }
    }

    void checkPrompt();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function dismiss() {
    window.sessionStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
    setError('');
  }

  async function enablePasskey() {
    setBusy(true);
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

      setOpen(false);
      window.sessionStorage.removeItem(DISMISSED_KEY);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        setError('Activación cancelada. Podés hacerlo más tarde desde tu perfil.');
      } else {
        console.error('Passkey prompt activation error:', err);
        setError('No se pudo activar el ingreso biométrico. Podés intentarlo desde tu perfil.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passkey-prompt-title"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          disabled={busy}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pt-7">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
            <Fingerprint className="h-9 w-9 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="text-center">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Ingreso rápido
            </p>
            <h2
              id="passkey-prompt-title"
              className="text-2xl font-black tracking-tight text-slate-900 dark:text-white"
            >
              ¿Querés activar Face ID?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              La próxima vez podés entrar a OnlyPadel sin escribir tu DNI ni contraseña usando
              Face ID, huella, Touch ID o Windows Hello.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/25 p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
              Es seguro y opcional. Tu rostro o huella nunca se envían ni se guardan en OnlyPadel.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-center text-xs font-semibold text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={enablePasskey}
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Activando...
              </>
            ) : (
              <>
                <Fingerprint className="h-5 w-5" />
                Activar ingreso rápido
              </>
            )}
          </button>

          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70 transition-colors disabled:opacity-50"
          >
            Ahora no
          </button>

          <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            También podés activarlo más tarde desde tu perfil.
          </p>
        </div>
      </div>
    </div>
  );
}
