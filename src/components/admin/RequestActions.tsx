'use client'

import { useState, useTransition } from 'react'
import { approveAccessRequest, rejectAccessRequest } from '@/lib/actions/access'
import { DEFAULT_TERRITORIES, PROVINCE_IDS, type ProvinceId, type TerritoryId } from '@/lib/domain/territories'
import { USER_ROLES, type UserRole } from '@/lib/domain/types'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'

const LABELS: Record<UserRole, string> = {
  afiliado: 'Afiliado',
  direccion_provincial: 'Dirección provincial',
  direccion_euskadi: 'Dirección regional',
  administracion: 'Administración',
}

const PROVINCES = DEFAULT_TERRITORIES.filter((t) => isProvince(t.id))

function isProvince(id: TerritoryId | null): id is ProvinceId {
  return (PROVINCE_IDS as readonly string[]).includes(id ?? '')
}

const selectClass =
  'h-11 rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold text-night focus:border-electric focus:outline-none'

/** Aprobar (eligiendo territorio y rol) o rechazar una solicitud de acceso. */
export function RequestActions({ id, name, territory: requested }: { id: string; name: string; territory: TerritoryId | null }) {
  const [role, setRole] = useState<UserRole>('afiliado')
  const [territory, setTerritory] = useState<ProvinceId | ''>(isProvince(requested) ? requested : '')
  const [confirmReject, setConfirmReject] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setResult(null)
    startTransition(async () => {
      try {
        setResult(await fn())
      } catch {
        setResult({ ok: false, message: 'Sin conexión. Inténtalo de nuevo.' })
      }
    })
  }

  if (result?.ok) return <Notice tone="success" icon="check">{result.message}</Notice>

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-32 flex-1 gap-1.5">
          <span className="eyebrow !text-[0.6rem] text-slate">Provincia</span>
          <select
            value={territory}
            onChange={(e) => setTerritory(e.target.value as ProvinceId)}
            className={selectClass}
            aria-label={`Provincia para ${name}`}
          >
            <option value="" disabled>
              Elige…
            </option>
            {PROVINCES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-32 flex-1 gap-1.5">
          <span className="eyebrow !text-[0.6rem] text-slate">Rol</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={selectClass}
            aria-label={`Rol para ${name}`}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <Button size="md" disabled={pending} onClick={() =>
            territory
              ? run(() => approveAccessRequest(id, role, territory))
              : setResult({ ok: false, message: 'Elige su provincia.' })
          } aria-label={`Aprobar a ${name}`}>
          {pending ? 'Guardando…' : 'Aprobar'}
        </Button>
      </div>
      {confirmReject ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger">
          <span className="flex-1 font-semibold">¿Rechazar? Se borrará su cuenta.</span>
          <Button size="sm" variant="secondary" onClick={() => setConfirmReject(false)} disabled={pending}>
            No
          </Button>
          <Button size="sm" variant="danger" onClick={() => run(() => rejectAccessRequest(id))} disabled={pending}>
            Sí, rechazar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmReject(true)}
          className="press justify-self-start text-sm font-semibold text-slate underline decoration-line-strong underline-offset-4 hover:text-danger"
        >
          Rechazar
        </button>
      )}
      {result && !result.ok ? <Notice tone="danger">{result.message}</Notice> : null}
    </div>
  )
}
