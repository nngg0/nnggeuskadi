import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NewActivityForm } from '@/components/content/NewActivityForm'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { creatableTerritories } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getContent } from '@/lib/content/source'
import { madridDate } from '@/lib/domain/dates'
import { territoryName } from '@/lib/domain/territories'

export const metadata: Metadata = { title: 'Nuevo acto' }

export default async function NewActivityPage() {
  const user = await requireUser()
  const content = await getContent()
  const active = new Set(content.territories.filter((t) => t.active).map((t) => t.id))
  const territories = creatableTerritories(user)
    .filter((id) => active.has(id))
    .map((id) => ({ id, name: territoryName(id, content.territories) }))
  if (territories.length === 0) notFound()

  return (
    <>
      <PageHeader eyebrow="Actos · Nuevo acto" title="Programa un acto.">
        Se añade como fila nueva en la pestaña ACTIVIDADES del Sheet y aparece en Actos al momento.
      </PageHeader>
      <Container className="py-6 md:py-8">
        <div className="max-w-2xl">
          <Link href="/calendario" className="press mb-6 inline-flex items-center gap-2 text-sm font-bold text-electric hover:text-electric-600">
            <Icon name="arrowLeft" size={18} />
            Volver a Actos
          </Link>
          <NewActivityForm territories={territories} today={madridDate(new Date())} />
        </div>
      </Container>
    </>
  )
}
