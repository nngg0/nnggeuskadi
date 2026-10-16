'use client'

import { useActionState, useState } from 'react'
import { createProject } from '@/lib/actions/content'
import { MAX_NEW_OPPORTUNITIES } from '@/lib/domain/new-content'
import type { TerritoryId } from '@/lib/domain/territories'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/States'
import { Field, inputClass, submitKeepingValues, TerritorySelect } from './fields'

export function NewProjectForm({ territories, today }: { territories: { id: TerritoryId; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState(createProject, null)
  const [rows, setRows] = useState<number[]>([0])
  const [nextKey, setNextKey] = useState(1)

  return (
    <form onSubmit={(e) => submitKeepingValues(e, action)} className="grid gap-5">
      <Field id="titulo" label="Título">
        <input id="titulo" name="titulo" required minLength={3} maxLength={160} className={`${inputClass} h-12`} />
      </Field>
      <Field id="descripcion" label="Descripción" hint="Qué queremos hacer y por qué hace falta gente.">
        <textarea id="descripcion" name="descripcion" rows={4} maxLength={4000} className={`${inputClass} py-3`} />
      </Field>
      <TerritorySelect territories={territories} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="tipo" label="Tipo" hint="Campaña, Formación, Evento…">
          <input id="tipo" name="tipo" maxLength={40} className={`${inputClass} h-12`} />
        </Field>
        <Field id="fecha_prevista" label="Fecha prevista" hint="Opcional.">
          <input id="fecha_prevista" name="fecha_prevista" type="date" min={today} className={`${inputClass} h-12`} />
        </Field>
      </div>
      <Field id="estado" label="Estado">
        <select id="estado" name="estado" defaultValue="en_preparacion" className={`${inputClass} h-12`}>
          <option value="en_preparacion">En preparación</option>
          <option value="en_marcha">En marcha</option>
        </select>
      </Field>

      <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
        <legend className="eyebrow px-1 !text-[0.62rem] text-slate">Ámbitos en los que se puede participar</legend>
        {rows.map((key, index) => (
          <div key={key} className="grid gap-2 rounded-xl bg-white/60 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-start">
            <input
              name="ambito_nombre"
              aria-label={`Nombre del ámbito ${index + 1}`}
              placeholder="Redes sociales"
              required={index === 0}
              maxLength={80}
              className={`${inputClass} !mt-0 h-11`}
            />
            <input
              name="ambito_descripcion"
              aria-label={`Descripción del ámbito ${index + 1}`}
              placeholder="Qué haría quien se apunte (opcional)"
              maxLength={1000}
              className={`${inputClass} !mt-0 h-11`}
            />
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => setRows(rows.filter((k) => k !== key))}
                aria-label={`Quitar el ámbito ${index + 1}`}
                className="press inline-flex size-11 items-center justify-center rounded-xl text-slate hover:bg-danger-50 hover:text-danger"
              >
                <Icon name="x" size={18} />
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
              setRows([...rows, nextKey])
              setNextKey(nextKey + 1)
            }}
          >
            Añadir ámbito
          </Button>
        ) : null}
      </fieldset>

      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" variant="primary" size="md" disabled={pending} className="justify-self-start">
        {pending ? 'Creando…' : 'Crear proyecto'}
      </Button>
    </form>
  )
}
