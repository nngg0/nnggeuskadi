'use client'

import { useState, useTransition } from 'react'
import { setMemberJunta } from '@/lib/actions/access'

/** Administración y dirección regional: marcar si una persona es de la Junta Directiva (ve las juntas cerradas). */
export function MemberJuntaToggle({ id, name, junta: initial }: { id: string; name: string; junta: boolean }) {
  const [junta, setJunta] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle(next: boolean) {
    setError(null)
    setJunta(next)
    startTransition(async () => {
      try {
        const r = await setMemberJunta(id, next)
        if (!r.ok) {
          setJunta(!next)
          setError(r.message)
        }
      } catch {
        setJunta(!next)
        setError('Sin conexión. Inténtalo de nuevo.')
      }
    })
  }

  return (
    <div className="grid gap-1 sm:justify-items-end">
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
        <input
          type="checkbox"
          checked={junta}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          aria-label={`${name} es de la Junta Directiva`}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-6 w-10 shrink-0 rounded-full bg-line-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-junta peer-checked:after:translate-x-4 peer-focus-visible:ring-4 peer-focus-visible:ring-junta/30"
        />
        Junta Directiva
      </label>
      {error ? <p role="status" className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  )
}
