'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[OnlyPadel Global Error]', error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            backgroundColor: '#fff',
            borderRadius: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            padding: '32px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#fef2f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px',
            }}>
              ⚠️
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#0f172a',
              marginBottom: '8px',
            }}>
              Error inesperado
            </h1>
            <p style={{
              color: '#64748b',
              fontWeight: 500,
              marginBottom: '32px',
              lineHeight: 1.6,
            }}>
              Ocurrió un error grave. Intentá recargar la página.
            </p>

            <button
              onClick={() => unstable_retry()}
              style={{
                width: '100%',
                backgroundColor: '#10b981',
                color: '#fff',
                fontWeight: 700,
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              🔄 Reintentar
            </button>

            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontWeight: 700,
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
