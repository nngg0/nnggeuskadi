'use client'

import { useState } from 'react'
import { accountLabel } from '@/lib/auth/username'
import { formatInstant } from '@/lib/domain/dates'
import { territoryName } from '@/lib/domain/territories'
import type { AccessRequest } from '@/lib/domain/types'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/States'
import { RequestActions } from './RequestActions'

/**
 * Lista de solicitudes. Conserva las tarjetas ya revisadas (con su resultado) hasta recargar,
 * aunque el servidor ya no las devuelva, para que se vea la confirmación.
 */
export function RequestsList({ requests }: { requests: AccessRequest[] }) {
  const [snapshot] = useState(requests)
  if (snapshot.length === 0) {
    return (
      <EmptyState title="No hay solicitudes pendientes" icon="users">
        Cuando alguien pida acceso desde la pantalla de entrada aparecerá aquí.
      </EmptyState>
    )
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {snapshot.map((r) => (
        <li key={r.id}>
          <Card className="grid gap-4">
            <div>
              <p className="text-lg font-extrabold tracking-[-0.02em] text-night">{r.displayName}</p>
              <p className="mt-0.5 break-all text-sm text-slate">{accountLabel(r.email)}</p>
              <p className="mt-2 text-xs font-semibold text-slate">
                {r.territory ? (
                  <>
                    <span className="eyebrow !text-[0.6rem] text-electric">{territoryName(r.territory)}</span> ·{' '}
                  </>
                ) : null}
                Pedido el {formatInstant(r.createdAt)}
              </p>
            </div>
            <RequestActions id={r.id} name={r.displayName} territory={r.territory} />
          </Card>
        </li>
      ))}
    </ul>
  )
}
