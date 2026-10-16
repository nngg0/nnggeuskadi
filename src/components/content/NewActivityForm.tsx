'use client'

import { useActionState } from 'react'
import { createActivity } from '@/lib/actions/content'
import type { TerritoryId } from '@/lib/domain/territories'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import { Field, inputClass, submitKeepingValues, TerritorySelect } from './fields'

export function NewActivityForm({ territories, today }: { territories: { id: TerritoryId; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState(createActivity, null)
  return (
    <form action={action} onSubmit={(e) => submitKeepingValues(e, action)} className="grid gap-5">
      <Field id="titulo" label="Título">
        <input id="titulo" name="titulo" required minLength={3} maxLength={160} className={`${inputClass} h-12`} />
      </Field>
      <Field id="descripcion" label="Descripción" hint="Qué es, para quién y qué hay que llevar. Admite saltos de línea.">
        <textarea id="descripcion" name="descripcion" rows={4} maxLength={4000} className={`${inputClass} py-3`} />
      </Field>
      <TerritorySelect territories={territories} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fecha" label="Fecha">
          <input id="fecha" name="fecha" type="date" required min={today} className={`${inputClass} h-12`} />
        </Field>
        <Field id="hora" label="Hora" hint="Vacía = «por confirmar».">
          <input id="hora" name="hora" type="time" className={`${inputClass} h-12`} />
        </Field>
      </div>
      <Field id="lugar" label="Lugar">
        <input id="lugar" name="lugar" maxLength={200} placeholder="Bilbao · Sede PP Bizkaia" className={`${inputClass} h-12`} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="plazas" label="Plazas" hint="Vacío = sin límite.">
          <input id="plazas" name="plazas" type="number" min={1} max={100000} inputMode="numeric" className={`${inputClass} h-12`} />
        </Field>
        <Field id="inscripcion_fin" label="Cierre de inscripción" hint="Opcional. Cierra a las 23:59 de ese día.">
          <input id="inscripcion_fin" name="inscripcion_fin" type="date" min={today} className={`${inputClass} h-12`} />
        </Field>
      </div>
      <Field id="estado" label="Publicación">
        <select id="estado" name="estado" defaultValue="confirmada" className={`${inputClass} h-12`}>
          <option value="confirmada">Publicar ahora</option>
          <option value="borrador">Guardar como borrador (no se ve)</option>
        </select>
      </Field>
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" variant="primary" size="md" disabled={pending} className="justify-self-start">
        {pending ? 'Creando…' : 'Crear acto'}
      </Button>
    </form>
  )
}
