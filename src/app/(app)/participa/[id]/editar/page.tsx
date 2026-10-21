import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProjectForm, type ProjectFormValues } from '@/components/content/ProjectForm'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { can, creatableTerritories } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getContent } from '@/lib/content/source'
import { madridDate } from '@/lib/domain/dates'
import { territoryName } from '@/lib/domain/territories'
import type { Opportunity, Project } from '@/lib/domain/types'

export const metadata: Metadata = { title: 'Editar proyecto' }

type Params = Promise<{ id: string }>

function formValues(project: Project, opportunities: Opportunity[]): ProjectFormValues {
  return {
    id: project.id,
    titulo: project.title,
    descripcion: project.description,
    tipo: project.kind ?? '',
    territorio: project.territory,
    estado: project.status,
    fecha_prevista: project.expectedDate ?? '',
    ambitos: opportunities
      .filter((o) => o.projectId === project.id && o.visible)
      .map((o) => ({ id: o.id, nombre: o.name, descripcion: o.description, estado: o.status })),
  }
}

export default async function EditProjectPage({ params }: { params: Params }) {
  const user = await requireUser()
  const content = await getContent()
  const id = decodeURIComponent((await params).id)
  // También los cerrados u ocultos: se pueden reabrir desde aquí.
  const project = content.projects.find((p) => p.id === id)
  if (!project || !can(user, 'content.create', { territory: project.territory })) notFound()

  const active = new Set(content.territories.filter((t) => t.active).map((t) => t.id))
  const territories = creatableTerritories(user)
    .filter((t) => active.has(t))
    .map((t) => ({ id: t, name: territoryName(t, content.territories) }))
  const backHref = project.status === 'cerrado' || !project.visible ? '/participa' : `/participa/${encodeURIComponent(project.id)}`

  return (
    <>
      <PageHeader eyebrow="Proyectos · Editar" title={project.title}>
        Los cambios se guardan en la fila {project.id} de PROYECTOS y en sus ámbitos de OPORTUNIDADES, y se ven al momento.
        Quien ya se había apuntado conserva su participación.
      </PageHeader>
      <Container className="py-6 md:py-8">
        <div className="max-w-3xl">
          <Link href={backHref} className="press mb-6 inline-flex items-center gap-2 text-sm font-bold text-electric hover:text-electric-600">
            <Icon name="arrowLeft" size={18} />
            Volver sin guardar
          </Link>
          <ProjectForm territories={territories} today={madridDate(new Date())} initial={formValues(project, content.opportunities)} />
        </div>
      </Container>
    </>
  )
}
