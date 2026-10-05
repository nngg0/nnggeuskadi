'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestPasswordReset, signIn, updatePassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/States'

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
  const [state, action, pending] = useActionState(signIn, null)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
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
