import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/States'
import { TerritoryFilter } from '@/components/ui/TerritoryFilter'
import { canListMembers, managedTerritories, ROLE_LABELS } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { usernameFromEmail } from '@/lib/auth/username'
import { getContent } from '@/lib/content/source'
import { formatFullDate, madridDate } from '@/lib/domain/dates'
import { interestLabel } from '@/lib/domain/interests'
import { matchesTerritoryFilter, parseTerritoryFilter, territoryName } from '@/lib/domain/territories'
import { personalStore } from '@/lib/personal'

export const metadata: Metadata = { title: 'Miembros' }

type Search = Promise<Record<string, string | string[] | undefined>>

/** Listado de miembros: la dirección provincial ve su territorio; la regional y Administración, todos. */
export default async function MembersPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser()
  if (!canListMembers(user)) notFound()
  const params = await searchParams
  const scope = managedTerritories(user)
  const filter = parseTerritoryFilter(Array.isArray(params.t) ? params.t[0] : params.t)
  const [members, content] = await Promise.all([personalStore().listMembers(), getContent()])
  const visible = members.filter((m) => matchesTerritoryFilter(m.territory, filter))
  const territories = content.territories.filter((t) => scope.includes(t.id))

  return (
    <>
      <PageHeader eyebrow="Gestión" title="Miembros.">
        {scope.length === 1
          ? `Afiliados de ${territoryName(scope[0]!)} con acceso a la intranet.`
          : 'Afiliados de todos los territorios con acceso a la intranet.'}{' '}
        Uso interno: no compartas estos datos fuera de la organización.
      </PageHeader>
      <Container className="py-6 md:py-8">
        {territories.length > 1 ? (
          <div className="mb-5">
            <TerritoryFilter value={filter} territories={territories} />
          </div>
        ) : null}
        <p className="eyebrow mb-3 text-slate">{visible.length === 1 ? '1 persona' : `${visible.length} personas`}</p>
        {visible.length === 0 ? (
          <EmptyState title="Nadie todavía" icon="users">
            Cuando se apruebe el acceso de afiliados de este territorio aparecerán aquí.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            {visible.map((m) => (
              <li key={m.email} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-bold text-night">
                    {m.displayName}
                    <span className="eyebrow ml-2 !text-[0.58rem] text-electric">{territoryName(m.territory)}</span>
                  </p>
                  {usernameFromEmail(m.email) ? (
                    <p className="truncate text-sm text-slate">{usernameFromEmail(m.email)}</p>
                  ) : (
                    <a href={`mailto:${m.email}`} className="block truncate text-sm text-slate hover:text-electric">
                      {m.email}
                    </a>
                  )}
                  {m.interests.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.interests.map((i) => (
                        <span key={i} className="rounded-full bg-electric-50 px-2.5 py-0.5 text-xs font-semibold text-electric">
                          {interestLabel(i)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="text-xs text-slate sm:text-right">
                  <p className="font-semibold text-night">{ROLE_LABELS[m.role]}</p>
                  <p>Desde el {formatFullDate(madridDate(new Date(m.createdAt)))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  )
}
