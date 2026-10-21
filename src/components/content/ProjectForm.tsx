'use client'

import { useActionState, useState } from 'react'
import { createProject, updateProject } from '@/lib/actions/content'
import { MAX_NEW_OPPORTUNITIES } from '@/lib/domain/new-content'
import type { TerritoryId } from '@/lib/domain/territories'
import type { ActionResult, OpportunityStatus, ProjectStatus } from '@/lib/domain/types'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/States'
import { cn } from '@/lib/cn'
import { Field, inputClass, submitKeepingValues, TerritorySelect } from './fields'

/** Valores de un proyecto que ya existe (fechas en YYYY-MM-DD) y sus ámbitos visibles. */
export interface ProjectFormValues {
  id: string
  titulo: string
  descripcion: string
  tipo: string
  territorio: TerritoryId
  estado: ProjectStatus
  fecha_prevista: string
  ambitos: { id: string; nombre: string; descripcion: string; estado: OpportunityStatus }[]
}

interface Row {
  key: number
  id: string
  nombre: string
  descripcion: string
  estado: OpportunityStatus
}

const PROJECT_STATUS_OPTIONS: [ProjectStatus, string][] = [
  ['en_preparacion', 'En preparación'],
  ['en_marcha', 'En marcha'],
  ['cerrado', 'Cerrado (deja de verse)'],
]

/** Alta (sin `initial`) o edición (con `initial`) de un proyecto y sus ámbitos. */
export function ProjectForm({
  territories,
  today,
  initial,
}: {
  territories: { id: TerritoryId; name: string }[]
  today: string
  initial?: ProjectFormValues
}) {
  const action: (prev: ActionResult | null, data: FormData) => Promise<ActionResult> = initial
    ? updateProject.bind(null, initial.id)
    : createProject
  const [state, dispatch, pending] = useActionState(action, null)
  const [rows, setRows] = useState<Row[]>(() =>
    initial && initial.ambitos.length > 0
      ? initial.ambitos.map((a, i) => ({ key: i, ...a }))
      : [{ key: 0, id: '', nombre: '', descripcion: '', estado: 'abierta' }],
  )
  const [nextKey, setNextKey] = useState(rows.length)
  const minDate = initial?.fecha_prevista && initial.fecha_prevista < today ? initial.fecha_prevista : today

  return (
    <form action={dispatch} onSubmit={(e) => submitKeepingValues(e, dispatch)} className="grid gap-5">
      <Field id="titulo" label="Título">
        <input id="titulo" name="titulo" required minLength={3} maxLength={160} defaultValue={initial?.titulo} className={`${inputClass} h-12`} />
      </Field>
      <Field id="descripcion" label="Descripción" hint="Qué queremos hacer y por qué hace falta gente.">
        <textarea id="descripcion" name="descripcion" rows={4} maxLength={4000} defaultValue={initial?.descripcion} className={`${inputClass} py-3`} />
      </Field>
      <TerritorySelect territories={territories} defaultValue={initial?.territorio} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="tipo" label="Tipo" hint="Campaña, Formación, Evento…">
          <input id="tipo" name="tipo" maxLength={40} defaultValue={initial?.tipo} className={`${inputClass} h-12`} />
        </Field>
        <Field id="fecha_prevista" label="Fecha prevista" hint="Opcional.">
          <input id="fecha_prevista" name="fecha_prevista" type="date" min={minDate} defaultValue={initial?.fecha_prevista} className={`${inputClass} h-12`} />
        </Field>
      </div>
      <Field id="estado" label="Estado">
        <select id="estado" name="estado" defaultValue={initial?.estado ?? 'en_preparacion'} className={`${inputClass} h-12`}>
          {PROJECT_STATUS_OPTIONS.filter(([s]) => initial || s !== 'cerrado').map(([s, label]) => (
            <option key={s} value={s}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
        <legend className="eyebrow px-1 !text-[0.62rem] text-slate">Ámbitos en los que se puede participar</legend>
        {initial ? (
          <p className="-mt-1 text-xs text-slate">Si quitas un ámbito deja de verse, pero quien ya se había apuntado lo conserva.</p>
        ) : null}
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={cn(
              'grid gap-2 rounded-xl border border-line p-3 sm:border-0 sm:p-0',
              initial ? 'sm:grid-cols-[minmax(0,13rem)_1fr_auto_auto] sm:items-start' : 'sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-start',
            )}
          >
            <input type="hidden" name="ambito_id" value={row.id} />
            <input
              name="ambito_nombre"
              aria-label={`Nombre del ámbito ${index + 1}`}
              placeholder="Redes sociales"
              required={index === 0}
              maxLength={80}
              defaultValue={row.nombre}
              className={`${inputClass} !mt-0 h-11`}
            />
            <input
              name="ambito_descripcion"
              aria-label={`Descripción del ámbito ${index + 1}`}
              placeholder="Qué haría quien se apunte (opcional)"
              maxLength={1000}
              defaultValue={row.descripcion}
              className={`${inputClass} !mt-0 h-11`}
            />
            {initial ? (
              <select
                name="ambito_estado"
                aria-label={`Estado del ámbito ${index + 1}`}
                defaultValue={row.estado}
                className={`${inputClass} !mt-0 h-11 sm:w-auto`}
              >
                <option value="abierta">Abierto</option>
                <option value="cerrada">Cerrado</option>
              </select>
            ) : null}
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                aria-label={`Quitar el ámbito ${index + 1}`}
                className="press inline-flex h-11 items-center justify-center gap-1.5 justify-self-start rounded-xl px-3 text-sm font-semibold text-slate hover:bg-danger-50 hover:text-danger sm:w-11 sm:px-0"
              >
                <Icon name="x" size={18} />
                <span className="sm:hidden">Quitar</span>
              </button>
            ) : null}
          </div>
        ))}
        {rows.length < MAX_NEW_OPPORTUNITIES ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Icon name="plus" size={18} />}
            className="justify-self-start"
            onClick={() => {
              setRows([...rows, { key: nextKey, id: '', nombre: '', descripcion: '', estado: 'abierta' }])
              setNextKey(nextKey + 1)
            }}
          >
            Añadir ámbito
          </Button>
        ) : null}
      </fieldset>

      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" variant="primary" size="md" disabled={pending} className="justify-self-start">
        {initial ? (pending ? 'Guardando…' : 'Guardar cambios') : pending ? 'Creando…' : 'Crear proyecto'}
      </Button>
    </form>
  )
}
