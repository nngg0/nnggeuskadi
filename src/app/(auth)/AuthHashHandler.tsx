'use client'

import { useEffect, useState } from 'react'
import { destinationAfterHash, parseAuthHash } from '@/lib/auth/hash'
import { isDemoMode } from '@/lib/config/mode'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

/** Recoge la sesión de los enlaces de invitación/recuperación de Supabase y continúa. */
export function AuthHashHandler() {
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isDemoMode || !window.location.hash) return
    const result = parseAuthHash(window.location.hash)
    if (!result) return
    // Quita los tokens de la barra de direcciones cuanto antes.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    if (result.kind === 'error') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error')
      setMessage('El enlace ha caducado o ya se ha usado. Pide uno nuevo desde «Recuperar acceso».')
      return
    }
    setStatus('working')
    createSupabaseBrowserClient()
      .auth.setSession({ access_token: result.accessToken, refresh_token: result.refreshToken })
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setMessage('No hemos podido validar el enlace. Pide uno nuevo desde «Recuperar acceso».')
          return
        }
        // Recarga completa para que el servidor lea la sesión recién guardada.
        window.location.replace(destinationAfterHash(result.type))
      })
  }, [])

  if (status === 'idle') return null
  return (
    <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-night/90 px-6 text-center text-white">
      {status === 'working' ? (
        <p className="text-lg font-bold">Entrando…</p>
      ) : (
        <div className="max-w-sm">
          <p className="eyebrow text-sky">Enlace no válido</p>
          <p className="mt-3 text-base">{message}</p>
          <a href="/recuperar" className="press mt-6 inline-block rounded-[var(--radius-btn)] bg-electric px-6 py-4 font-bold">
            Recuperar acceso
          </a>
        </div>
      )}
    </div>
  )
}
