import { formatInstant } from '@/lib/domain/dates'
import { territoryName } from '@/lib/domain/territories'
import type { ManagedPerson } from '@/lib/domain/types'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'

/** Listado nominal para la dirección (solo nombre visible, territorio y fecha). */
export function PeopleList({
  title,
  people,
  empty,
  note,
  opportunityNames,
}: {
  title: string
  people: ManagedPerson[]
  empty: string
  note: string
  opportunityNames?: Map<string, string>
}) {
  return (
    <Card className="border-night/15">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>{title}</Eyebrow>
        <span className="text-sm font-bold text-night">{people.length}</span>
      </div>
      <p className="mt-2 text-xs text-slate">{note}</p>
      {people.length === 0 ? (
        <p className="mt-4 text-sm text-slate">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {people.map((p, i) => (
            <li key={`${p.displayName}-${i}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
              <span className="font-semibold text-night">{p.displayName}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-slate">
                {p.opportunityIds?.map((id) => (
                  <span key={id} className="rounded-full bg-electric-50 px-2 py-0.5 font-semibold text-electric">
                    {opportunityNames?.get(id) ?? id}
                  </span>
                ))}
                <span>{territoryName(p.territory)}</span>
                <span>· {formatInstant(p.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
