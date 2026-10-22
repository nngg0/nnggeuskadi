'use client'

import { useActionState, useState } from 'react'
import { createActivity, updateActivity } from '@/lib/actions/content'
import type { TerritoryId } from '@/lib/domain/territories'
import type { ActionResult, ActivityAccess, ActivityKind, ActivityStatus } from '@/lib/domain/types'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import { Field, inputClass, submitKeepingValues, TerritorySelect } from './fields'

/** Valores del formulario de un acto que ya existe (fechas en YYYY-MM-DD). */
export interface ActivityFormValues {
  id: string
  titulo: string
  descripcion: string
  territorio: TerritoryId
  fecha: string
  hora: string
  lugar: string
  plazas: string
  inscripcion_fin: string
  estado: ActivityStatus
  tipo: ActivityKind
  acceso: ActivityAccess
}

const STATUS_LABELS: Record<ActivityStatus, string> = {
  confirmada: 'Publicado',
  por_confirmar: 'Detalles por confirmar (no se puede abrir)',
  borrador: 'Borrador (no se ve)',
  cerrada: 'Inscripción cerrada',
  cancelada: 'Cancelado',
}

/** Alta (sin `initial`) o edición (con `initial`) de un acto. */
export function ActivityForm({
  territories,
  today,
  initial,
}: {
  territories: { id: TerritoryId; name: string }[]
  today: string
  initial?: ActivityFormValues
}) {
  const action: (prev: ActionResult | null, data: FormData) => Promise<ActionResult> = initial
    ? updateActivity.bind(null, initial.id)
    : createActivity
  const [state, dispatch, pending] = useActionState(action, null)
  const [kind, setKind] = useState<ActivityKind>(initial?.tipo ?? 'acto')
  // Al editar se puede conservar una fecha que ya ha pasado.
  const minDate = initial && initial.fecha < today ? initial.fecha : today

  return (
    <form action={dispatch} onSubmit={(e) => submitKeepingValues(e, dispatch)} className="grid gap-5">
      <Field id="titulo" label="Título">
        <input id="titulo" name="titulo" required minLength={3} maxLength={160} defaultValue={initial?.titulo} className={`${inputClass} h-12`} />
      </Field>
      <Field id="descripcion" label="Descripción" hint="Qué es, para quién y qué hay que llevar. Admite saltos de línea.">
        <textarea id="descripcion" name="descripcion" rows={4} maxLength={4000} defaultValue={initial?.descripcion} className={`${inputClass} py-3`} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="tipo" label="Tipo">
          <select id="tipo" name="tipo" value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className={`${inputClass} h-12`}>
            <option value="acto">Acto</option>
            <option value="junta">Junta directiva (interno de NNGG)</option>
          </select>
        </Field>
        {kind === 'junta' ? (
          <Field id="acceso" label="Quién puede verla">
            <select id="acceso" name="acceso" defaultValue={initial?.acceso ?? 'cerrado'} className={`${inputClass} h-12`}>
              <option value="cerrado">Cerrada: solo la Junta Directiva</option>
              <option value="abierto">Abierta: todos los afiliados</option>
            </select>
          </Field>
        ) : null}
      </div>
      <TerritorySelect territories={territories} defaultValue={initial?.territorio} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fecha" label="Fecha">
          <input id="fecha" name="fecha" type="date" required min={minDate} defaultValue={initial?.fecha} className={`${inputClass} h-12`} />
        </Field>
        <Field id="hora" label="Hora" hint="Vacía = «por confirmar».">
          <input id="hora" name="hora" type="time" defaultValue={initial?.hora} className={`${inputClass} h-12`} />
        </Field>
      </div>
      <Field id="lugar" label="Lugar">
        <input id="lugar" name="lugar" maxLength={200} placeholder="Bilbao · Sede PP Bizkaia" defaultValue={initial?.lugar} className={`${inputClass} h-12`} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="plazas" label="Plazas" hint="Vacío = sin límite.">
          <input id="plazas" name="plazas" type="number" min={1} max={100000} inputMode="numeric" defaultValue={initial?.plazas} className={`${inputClass} h-12`} />
        </Field>
        <Field id="inscripcion_fin" label="Cierre de inscripción" hint="Opcional. Cierra a las 23:59 de ese día.">
          <input id="inscripcion_fin" name="inscripcion_fin" type="date" defaultValue={initial?.inscripcion_fin} className={`${inputClass} h-12`} />
        </Field>
      </div>
      <Field id="estado" label={initial ? 'Estado' : 'Publicación'}>
        <select id="estado" name="estado" defaultValue={initial?.estado ?? 'confirmada'} className={`${inputClass} h-12`}>
          {initial ? (
            (Object.keys(STATUS_LABELS) as ActivityStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))
          ) : (
            <>
              <option value="confirmada">Publicar ahora</option>
              <option value="por_confirmar">Anunciar con detalles por confirmar</option>
              <option value="borrador">Guardar como borrador (no se ve)</option>
            </>
          )}
        </select>
      </Field>
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" variant="primary" size="md" disabled={pending} className="justify-self-start">
        {initial ? (pending ? 'Guardando…' : 'Guardar cambios') : pending ? 'Creando…' : 'Crear acto'}
      </Button>
    </form>
  )
}
