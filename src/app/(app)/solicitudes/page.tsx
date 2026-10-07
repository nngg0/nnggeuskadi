import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequestsList } from '@/components/admin/RequestsList'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { personalStore } from '@/lib/personal'

export const metadata: Metadata = { title: 'Solicitudes de acceso' }

/** Solo Administración: aprobar o rechazar a quien ha pedido acceso. */
export default async function AccessRequestsPage() {
  const user = await requireUser()
  if (!can(user, 'members.approve')) notFound()
  const requests = await personalStore().listAccessRequests()

  return (
    <>
      <PageHeader eyebrow="Administración" title="Solicitudes de acceso.">
        Personas que han pedido entrar en la intranet. Aprueba solo a quien conozcas: nadie verifica sus datos.
      </PageHeader>
      <Container className="py-6 md:py-8">
        <RequestsList requests={requests} />
      </Container>
    </>
  )
}
