import { Container } from '@/components/layout/PageHeader'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-white p-8">
        <p className="eyebrow text-electric">No encontrado</p>
        <h1 className="display mt-2 text-3xl text-night">Esto ya no está aquí.</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Puede que la actividad o el proyecto se haya retirado o que el enlace no sea correcto.
        </p>
        <div className="mt-6 grid gap-2">
          <ButtonLink href="/calendario" block arrow>
            Ver calendario
          </ButtonLink>
          <ButtonLink href="/participa" variant="secondary" size="md" block>
            Ver qué estamos preparando
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
