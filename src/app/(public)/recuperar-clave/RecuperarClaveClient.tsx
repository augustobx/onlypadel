'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { requestPasswordReset, validateResetToken, resetPasswordWithToken } from '@/actions/password-reset';
import { KeyRound, Mail, Lock, CheckCircle2, AlertCircle, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function RecuperarClaveClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  // Step: 'request' | 'sent' | 'reset' | 'success'
  const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'success'>('request');
  const [identifier, setIdentifier] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [tokenValidating, setTokenValidating] = useState(false);
  const [tokenError, setTokenError] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (token) {
      setTokenValidating(true);
      validateResetToken(token).then((res) => {
        setTokenValidating(false);
        if (res.valid) {
          setTargetEmail(res.email || '');
          setStep('reset');
        } else {
          setTokenError(res.error || 'El enlace de recuperación es inválido o expiró.');
        }
      });
    } else {
      setStep('request');
    }
  }, [token]);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await requestPasswordReset(identifier);
      if (res.success) {
        setStep('sent');
      } else {
        setError(res.error || 'No se pudo enviar la solicitud.');
      }
    });
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    startTransition(async () => {
      if (!token) return;
      const res = await resetPasswordWithToken(token, newPassword);
      if (res.success) {
        setStep('success');
      } else {
        setError(res.error || 'Error al restablecer la contraseña.');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">

        {/* 1. ESTADO DE VALIDACIÓN DEL TOKEN */}
        {tokenValidating && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Verificando enlace de seguridad...</p>
          </div>
        )}

        {/* TOKEN INVÁLIDO O EXPIRADO */}
        {!tokenValidating && tokenError && (
          <div className="text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Enlace no válido</h2>
            <p className="text-sm text-slate-500">{tokenError}</p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setTokenError('');
                  router.push('/recuperar-clave');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-sm"
              >
                Solicitar un nuevo enlace
              </button>
            </div>
          </div>
        )}

        {/* 2. SOLICITUD DE RESET (FORMULARIO PRINCIPAL) */}
        {!tokenValidating && !tokenError && step === 'request' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Recuperar Contraseña</h1>
              <p className="text-xs text-slate-500 mt-2">
                Ingresá tu correo electrónico, DNI o teléfono. Te enviaremos un enlace seguro para restablecer tu clave.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" /> Correo Electrónico, DNI o Teléfono
                </label>
                <input
                  type="text"
                  required
                  placeholder="ejemplo@correo.com o 1123456789"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <Link href="/login-usuario" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-bold transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        )}

        {/* 3. MENSAJE DE ÉXITO ENVIADO */}
        {!tokenValidating && !tokenError && step === 'sent' && (
          <div className="text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">¡Enlace enviado!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Si la cuenta tiene un correo válido registrado, recibirás un mensaje con las instrucciones para restablecer tu contraseña.
            </p>
            <p className="text-xs text-slate-400">
              Recordá revisar la carpeta de <strong>Spam</strong> o correo no deseado.
            </p>

            <div className="pt-4 space-y-2">
              <Link
                href="/login-usuario"
                className="block w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-3.5 rounded-2xl text-center text-sm transition-all"
              >
                Ir a Iniciar Sesión
              </Link>
              <button
                onClick={() => setStep('request')}
                className="text-xs text-slate-400 hover:underline font-medium"
              >
                Probar con otro dato
              </button>
            </div>
          </div>
        )}

        {/* 4. FORMULARIO DE NUEVA CONTRASEÑA */}
        {!tokenValidating && !tokenError && step === 'reset' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Nueva Contraseña</h1>
              <p className="text-xs text-slate-500 mt-2">
                Ingresá tu nueva clave para {targetEmail ? <strong className="text-slate-700 dark:text-slate-300">{targetEmail}</strong> : 'tu cuenta'}.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400" /> Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400" /> Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repetí la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                ) : (
                  'Guardar Contraseña y Continuar'
                )}
              </button>
            </form>
          </div>
        )}

        {/* 5. ÉXITO FINAL */}
        {!tokenValidating && !tokenError && step === 'success' && (
          <div className="text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">¡Contraseña Actualizada!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Tu contraseña fue restablecida con éxito. Ya podés iniciar sesión con tus nuevas credenciales.
            </p>

            <div className="pt-4">
              <Link
                href="/login-usuario"
                className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-center text-sm transition-all shadow-sm"
              >
                Iniciar Sesión Ahora
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
