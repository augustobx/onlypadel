'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[OnlyPadel Error Boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        {/* Icono de error */}
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Algo salió mal
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
          Hubo un problema al cargar la página. Puede ser una falla de conexión momentánea.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => unstable_retry()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            🔄 Reintentar
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
          >
            Volver al inicio
          </button>
        </div>

        {error?.digest && (
          <p className="mt-6 text-xs text-slate-400 dark:text-slate-600 font-mono">
            Código: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
