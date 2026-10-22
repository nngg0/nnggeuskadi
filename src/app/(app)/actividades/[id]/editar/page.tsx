import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActivityForm, type ActivityFormValues } from '@/components/content/ActivityForm'
import { DeleteActivity } from '@/components/content/DeleteActivity'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { can, creatableTerritories } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getContent } from '@/lib/content/source'
import { madridDate } from '@/lib/domain/dates'
import { territoryName } from '@/lib/domain/territories'
import type { Activity } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'

export const metadata: Metadata = { title: 'Editar acto' }

type Params = Promise<{ id: string }>

function formValues(activity: Activity): ActivityFormValues {
  return {
    id: activity.id,
    titulo: activity.title,
    descripcion: activity.description,
    territorio: activity.territory,
    fecha: activity.date,
    hora: activity.time ?? '',
    lugar: activity.place,
    plazas: activity.capacity ? String(activity.capacity) : '',
    inscripcion_fin: activity.registrationClosesAt ? madridDate(new Date(activity.registrationClosesAt)) : '',
    estado: activity.status,
    tipo: activity.kind,
    acceso: activity.access,
  }
}

export default async function EditActivityPage({ params }: { params: Params }) {
  const user = await requireUser()
  const content = await getContent()
  const id = decodeURIComponent((await params).id)
  // También los borradores: se pueden editar aunque no tengan ficha pública.
  const activity = content.activities.find((a) => a.id === id)
  if (!activity || !can(user, 'content.create', { territory: activity.territory })) notFound()

  const active = new Set(content.territories.filter((t) => t.active).map((t) => t.id))
  const territories = creatableTerritories(user)
    .filter((t) => active.has(t))
    .map((t) => ({ id: t, name: territoryName(t, content.territories) }))
  const registeredCount = (await personalStore().registrationCounts([activity.id])).get(activity.id) ?? 0
  const backHref = activity.status === 'borrador' ? '/calendario' : `/actividades/${encodeURIComponent(activity.id)}`

  return (
    <>
      <PageHeader eyebrow="Actos · Editar" title={activity.title}>
        Los cambios se guardan en la fila {activity.id} de la pestaña ACTIVIDADES del Sheet y se ven al momento.
        Las inscripciones ya hechas se conservan.
      </PageHeader>
      <Container className="py-6 md:py-8">
        <div className="max-w-2xl">
          <Link href={backHref} className="press mb-6 inline-flex items-center gap-2 text-sm font-bold text-electric hover:text-electric-600">
            <Icon name="arrowLeft" size={18} />
            Volver sin guardar
          </Link>
          <ActivityForm territories={territories} today={madridDate(new Date())} initial={formValues(activity)} />
          <DeleteActivity id={activity.id} title={activity.title} registeredCount={registeredCount} />
        </div>
      </Container>
    </>
  )
}
