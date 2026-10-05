'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { setDocumentSaved } from '@/lib/actions/documents'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

/** Guardar/quitar documento con respuesta inmediata (optimista) y reversión si falla. */
export function SaveDocumentButton({ documentId, saved, title }: { documentId: string; saved: boolean; title: string }) {
  const [optimistic, setOptimistic] = useOptimistic(saved)
  const [error, setError] = useState(false)
  const [, startTransition] = useTransition()

  function toggle() {
    const next = !optimistic
    setError(false)
    startTransition(async () => {
      setOptimistic(next)
      try {
        const result = await setDocumentSaved(documentId, next)
        if (!result.ok) setError(true)
      } catch {
        setError(true)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic}
      aria-label={optimistic ? `Quitar "${title}" de guardados` : `Guardar "${title}"`}
      title={error ? 'No se ha podido guardar. Inténtalo de nuevo.' : optimistic ? 'Guardado' : 'Guardar'}
      className={cn(
        'press flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors',
        optimistic ? 'border-electric bg-electric text-white' : 'border-line-strong bg-white text-slate hover:text-electric',
        error && 'border-danger text-danger',
      )}
    >
      <Icon name="bookmark" size={19} filled={optimistic} className={optimistic ? 'animate-pop' : undefined} />
    </button>
  )
}
