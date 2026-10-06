'use client'

import { useActionState, useState } from 'react'
import { updateInterests } from '@/lib/actions/profile'
import { cn } from '@/lib/cn'
import { INTERESTS, MAX_INTERESTS, type InterestId } from '@/lib/domain/interests'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/States'

/** "Mis intereses": hasta 3 temas. */
export function InterestsForm({ initial }: { initial: InterestId[] }) {
  const [selected, setSelected] = useState<InterestId[]>(initial)
  const [state, action, pending] = useActionState(updateInterests, null)
  const full = selected.length >= MAX_INTERESTS

  function toggle(id: InterestId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_INTERESTS ? prev : [...prev, id]))
  }

  return (
    <form action={action}>
      <fieldset>
        <legend className="text-sm text-slate">
          Elige hasta {MAX_INTERESTS} temas. Nos ayuda a saber en qué te gustaría participar.
          <span className={cn('ml-2 font-bold', full ? 'text-electric' : 'text-night')}>
            {selected.length} de {MAX_INTERESTS}
          </span>
        </legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {INTERESTS.map(({ id, label }) => {
            const checked = selected.includes(id)
            const disabled = !checked && full
            return (
              <label
                key={id}
                className={cn(
                  'press inline-flex cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                  checked ? 'border-electric bg-electric text-white' : 'border-line-strong bg-white text-night hover:border-night/40',
                  disabled && 'cursor-not-allowed opacity-40 hover:border-line-strong',
                )}
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(id)}
                  className="sr-only"
                />
                {checked ? <Icon name="check" size={15} strokeWidth={3} /> : null}
                {label}
              </label>
            )
          })}
        </div>
      </fieldset>
      {state ? (
        <div className="mt-4">
          <Notice tone={state.ok ? 'success' : 'danger'} icon={state.ok ? 'check' : 'alert'}>
            {state.message}
          </Notice>
        </div>
      ) : null}
      <Button type="submit" size="md" disabled={pending} className="mt-5">
        {pending ? 'Guardando…' : 'Guardar intereses'}
      </Button>
    </form>
  )
}
