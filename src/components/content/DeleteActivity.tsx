'use client'

import { useState, useTransition } from 'react'
import { deleteActivity } from '@/lib/actions/content'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'

/** «Eliminar acto» con confirmación. Avisa si hay personas inscritas. */
export function DeleteActivity({ id, title, registeredCount }: { id: string; title: string; registeredCount: number }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function remove() {
    setError(null)
    startTransition(async () => {
      try {
        const r = await deleteActivity(id)
        // Si va bien, la acción redirige a Actos; solo vuelve aquí con un error.
        if (r && !r.ok) setError(r.message)
      } catch (e) {
        if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e
        setError('Sin conexión. Inténtalo de nuevo.')
      }
    })
  }

  return (
    <section aria-labelledby="eliminar-acto" className="mt-10 rounded-2xl border border-danger/30 p-5">
      <h2 id="eliminar-acto" className="eyebrow text-danger">
        Eliminar acto
      </h2>
      {!confirming ? (
        <>
          <p className="mt-2 text-sm text-slate">Se borra del Sheet y deja de verse en la app. No se puede deshacer desde aquí.</p>
          <Button type="button" variant="danger" size="sm" className="mt-4" onClick={() => setConfirming(true)}>
            Eliminar acto
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-ink">¿Seguro que quieres eliminar «{title}»?</p>
          {registeredCount > 0 ? (
            <p className="mt-1 text-sm text-warning">
              {registeredCount === 1
                ? 'Hay 1 persona inscrita: dejará de verlo y no recibirá ningún aviso.'
                : `Hay ${registeredCount} personas inscritas: dejarán de verlo y no recibirán ningún aviso.`}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="danger" size="sm" onClick={remove} disabled={pending}>
              {pending ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </>
      )}
      {error ? (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}
    </section>
  )
}
