'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition, type FormEvent } from 'react'
import { requestAccess } from '@/lib/actions/access'
import { requestPasswordReset, signIn, updatePassword } from '@/lib/actions/auth'
import { DEFAULT_TERRITORIES } from '@/lib/domain/territories'
import { USERNAME_HINT, USERNAME_MAX, USERNAME_MIN } from '@/lib/auth/username'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'
import type { ActionResult } from '@/lib/domain/types'

/**
 * Como useActionState, pero sin vaciar el formulario tras enviarlo: si hay un error,
 * la persona no tiene que volver a escribirlo todo.
 */
function useKeepValuesAction(fn: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      setState(await fn(null, formData))
    })
  }
  return [state, onSubmit, pending] as const
}

const inputClass =
  'mt-2 h-14 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-base font-semibold text-white placeholder:text-white/35 focus:border-electric focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-electric/30'

function Field({ label, ...props }: { label: string } & React.ComponentProps<'input'>) {
  return (
    <div>
      <label htmlFor={props.id} className="eyebrow !text-[0.62rem] text-white/60">
        {label}
      </label>
      <input className={inputClass} {...props} />
    </div>
  )
}

export function LoginForm({ next }: { next: string }) {
  const [state, onSubmit, pending] = useKeepValuesAction(signIn)
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field
        label="Usuario"
        id="username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <Field label="Contraseña" id="password" name="password" type="password" autoComplete="current-password" required />
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" block arrow disabled={pending} className="mt-2">
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
      <Link href="/recuperar" className="press justify-self-start text-sm font-semibold text-sky hover:text-white">
        ¿Has olvidado la contraseña? Recuperar acceso
      </Link>
    </form>
  )
}

export function RecoverForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null)
  if (state?.ok) return <Notice tone="success" icon="check">{state.message}</Notice>
  return (
    <form action={action} className="grid gap-4">
      <Field label="Email" id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" block arrow disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </Button>
    </form>
  )
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null)
  return (
    <form action={action} className="grid gap-4">
      <Field label="Nueva contraseña" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      <Field label="Repite la contraseña" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" block arrow disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  )
}

export function RequestAccessForm() {
  const [state, onSubmit, pending] = useKeepValuesAction(requestAccess)
  if (state?.ok) {
    return (
      <div className="grid gap-5">
        <Notice tone="success" icon="check">
          {state.message}
        </Notice>
        <Link href="/login" className="press justify-self-start text-sm font-semibold text-sky hover:text-white">
          Ir a la pantalla de entrada
        </Link>
      </div>
    )
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Nombre y apellido" id="displayName" name="displayName" autoComplete="name" required minLength={2} maxLength={80} />
      <div>
        <Field
          label="Nombre de usuario"
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          pattern="[a-z0-9._\-]+"
          title={USERNAME_HINT}
          aria-describedby="username-hint"
        />
        <p id="username-hint" className="mt-2 text-xs text-white/50">
          {USERNAME_HINT}
        </p>
      </div>
      <div>
        <label htmlFor="territory" className="eyebrow !text-[0.62rem] text-white/60">
          Territorio
        </label>
        <select
          id="territory"
          name="territory"
          required
          defaultValue=""
          className="mt-2 h-14 w-full rounded-2xl border border-white/15 bg-night-2 px-4 text-base font-semibold text-white focus:border-electric focus:outline-none focus:ring-4 focus:ring-electric/30"
        >
          <option value="" disabled>
            Elige tu territorio
          </option>
          {DEFAULT_TERRITORIES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <Field label="Contraseña (mínimo 10 caracteres)" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      <Field label="Repite la contraseña" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      {/* Campo trampa para bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">No rellenar</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state && !state.ok ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button type="submit" block arrow disabled={pending} className="mt-2">
        {pending ? 'Enviando…' : 'Solicitar acceso'}
      </Button>
    </form>
  )
}
