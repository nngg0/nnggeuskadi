'use client'

import { useState, useTransition } from 'react'
import { setMemberRole } from '@/lib/actions/access'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { DEFAULT_TERRITORIES, type TerritoryId } from '@/lib/domain/territories'
import { USER_ROLES, type UserRole } from '@/lib/domain/types'
import { Button } from '@/components/ui/Button'

const selectClass =
  'h-10 rounded-xl border border-line-strong bg-card px-3 text-sm font-semibold text-ink focus:border-electric focus:outline-none'

/** Solo Administración: cambiar el rol y la provincia de un miembro desde el listado. */
export function MemberRoleControl({ id, name, role: initialRole, territory: initialTerritory }: { id: string; name: string; role: UserRole; territory: TerritoryId }) {
  const [role, setRole] = useState(initialRole)
  const [territory, setTerritory] = useState(initialTerritory)
  const [saved, setSaved] = useState({ role: initialRole, territory: initialTerritory })
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const needsProvince = role === 'afiliado' || role === 'direccion_provincial'
  const changed = role !== saved.role || territory !== saved.territory

  function save() {
    setResult(null)
    startTransition(async () => {
      try {
        const r = await setMemberRole(id, role, territory)
        setResult(r)
        if (r.ok) setSaved({ role, territory })
      } catch {
        setResult({ ok: false, message: 'Sin conexión. Inténtalo de nuevo.' })
      }
    })
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={selectClass} aria-label={`Rol de ${name}`}>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select value={territory} onChange={(e) => setTerritory(e.target.value as TerritoryId)} className={selectClass} aria-label={`Territorio de ${name}`}>
          {DEFAULT_TERRITORIES.map((t) => (
            <option key={t.id} value={t.id} disabled={needsProvince && t.id === 'euskadi'}>
              {t.name}
            </option>
          ))}
        </select>
        {changed ? (
          <Button type="button" size="sm" variant="primary" onClick={save} disabled={pending} aria-label={`Guardar rol de ${name}`}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
        ) : null}
      </div>
      {result ? (
        <p role="status" className={result.ok ? 'text-xs font-semibold text-success sm:text-right' : 'text-xs font-semibold text-danger sm:text-right'}>
          {result.message}
        </p>
      ) : null}
    </div>
  )
}
