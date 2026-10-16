import { startTransition, type FormEvent, type ReactNode } from 'react'
import type { TerritoryId } from '@/lib/domain/territories'

export const inputClass =
  'mt-2 w-full rounded-xl border border-line-strong bg-white px-4 font-semibold text-night placeholder:font-normal placeholder:text-slate/70 focus:border-electric focus:outline-none focus:ring-4 focus:ring-electric/15'

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow !text-[0.62rem] text-slate">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-slate">{hint}</p> : null}
    </div>
  )
}

/** Selector de territorio con solo los territorios en los que esta persona puede crear. */
export function TerritorySelect({ territories }: { territories: { id: TerritoryId; name: string }[] }) {
  return (
    <Field
      id="territorio"
      label="Territorio"
      hint={territories.length === 1 ? 'Solo puedes crear contenido en tu provincia.' : undefined}
    >
      <select id="territorio" name="territorio" required defaultValue={territories[0]?.id} className={`${inputClass} h-12`}>
        {territories.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

/**
 * Envía el formulario a la Server Action sin el reseteo automático de React,
 * para que un error de validación no borre lo ya escrito.
 */
export function submitKeepingValues(event: FormEvent<HTMLFormElement>, action: (data: FormData) => void) {
  event.preventDefault()
  const data = new FormData(event.currentTarget)
  startTransition(() => action(data))
}
