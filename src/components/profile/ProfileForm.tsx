'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'

export function ProfileForm({ displayName, notifyNewInitiatives }: { displayName: string; notifyNewInitiatives: boolean }) {
  const [state, action, pending] = useActionState(updateProfile, null)
  return (
    <form action={action} className="grid gap-5">
      <div>
        <label htmlFor="displayName" className="eyebrow !text-[0.62rem] text-slate">
          Nombre visible
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          className="mt-2 h-12 w-full rounded-xl border border-line-strong bg-white px-4 font-semibold text-night focus:border-electric focus:outline-none focus:ring-4 focus:ring-electric/15"
        />
        <p className="mt-1.5 text-xs text-slate">Solo lo ve la dirección que organiza las actividades en las que participas.</p>
      </div>
      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line p-4">
        <span>
          <span className="block text-sm font-bold text-night">Avisarme de nuevas iniciativas</span>
          <span className="mt-0.5 block text-xs text-slate">Preparado para las notificaciones de la app (próximamente).</span>
        </span>
        <input type="checkbox" name="notifyNewInitiatives" defaultChecked={notifyNewInitiatives} className="peer sr-only" />
        <span
          aria-hidden
          className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-line-strong transition-colors after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-electric peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-electric/30"
        />
      </label>
      {state ? <Notice tone={state.ok ? 'success' : 'danger'} icon={state.ok ? 'check' : 'alert'}>{state.message}</Notice> : null}
      <Button type="submit" variant="primary" size="md" disabled={pending} className="justify-self-start">
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
