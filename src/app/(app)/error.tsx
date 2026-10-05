'use client'

import { useEffect } from 'react'
import { Container } from '@/components/layout/PageHeader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

/** Error al cargar una sección (p. ej. el Sheet o la base de datos no responden). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-white p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger">
          <Icon name="alert" size={28} />
        </span>
        <p className="eyebrow mt-5 text-danger">Algo no ha ido bien</p>
        <h1 className="display mt-2 text-3xl text-night">No hemos podido cargar esta sección.</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Puede ser un problema puntual de conexión. Vuelve a intentarlo en unos segundos.
          {error.digest ? <span className="mt-2 block text-xs text-slate/70">Referencia: {error.digest}</span> : null}
        </p>
        <div className="mt-6 grid gap-2">
          <Button onClick={reset} block arrow>
            Reintentar
          </Button>
          <ButtonLink href="/" variant="secondary" size="md" block>
            Volver a Inicio
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
