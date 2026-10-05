'use client'

import { useState, useTransition } from 'react'
import { cancelRegistration, registerForActivity } from '@/lib/actions/registrations'
import { formatInstant } from '@/lib/domain/dates'
import type { RegistrationState } from '@/lib/domain/registration'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/States'

/** Llamada a la acción de una ficha de actividad, con todos sus estados. */
export function RegistrationPanel({ activityId, state }: { activityId: string; state: RegistrationState }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setFeedback(null)
    startTransition(async () => {
      try {
        setFeedback(await action())
      } catch {
        setFeedback({ ok: false, message: 'Sin conexión. Comprueba tu red e inténtalo de nuevo.' })
      }
      setConfirmCancel(false)
    })
  }

  const message = feedback ? (
    <div className="mt-3 animate-fade">
      <Notice tone={feedback.ok ? 'success' : 'danger'} icon={feedback.ok ? 'check' : 'alert'}>
        {feedback.message}
      </Notice>
    </div>
  ) : null

  if (state.kind === 'registered') {
    return (
      <div>
        <div className="flex animate-pop items-center gap-3 rounded-2xl bg-success-50 px-5 py-4 text-success">
          <span className="flex size-9 items-center justify-center rounded-full bg-success text-white">
            <Icon name="check" size={20} strokeWidth={2.6} />
          </span>
          <div>
            <p className="eyebrow">Estás inscrito</p>
            <p className="text-sm font-medium text-success/80">Te esperamos. La encontrarás en tu perfil.</p>
          </div>
        </div>
        {confirmCancel ? (
          <div className="mt-3 rounded-2xl border border-line p-4">
            <p className="text-sm font-semibold text-night">¿Seguro que quieres cancelar tu inscripción?</p>
            <p className="mt-1 text-sm text-slate">Tu plaza quedará libre para otra persona.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="md" onClick={() => setConfirmCancel(false)} disabled={pending}>
                Mantener
              </Button>
              <Button variant="danger" size="md" onClick={() => run(() => cancelRegistration(activityId))} disabled={pending}>
                {pending ? 'Cancelando…' : 'Sí, cancelar'}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="press mt-3 text-sm font-semibold text-slate underline decoration-line-strong underline-offset-4 hover:text-danger"
          >
            Cancelar inscripción
          </button>
        )}
        {message}
      </div>
    )
  }

  if (state.kind === 'open') {
    return (
      <div>
        <Button block arrow onClick={() => run(() => registerForActivity(activityId))} disabled={pending} aria-busy={pending}>
          {pending ? 'Inscribiendo…' : 'Inscribirme'}
        </Button>
        {state.remaining !== null ? (
          <p className="mt-2 text-center text-xs font-medium text-slate">
            {state.remaining === 1 ? 'Queda 1 plaza' : `Quedan ${state.remaining} plazas`}
          </p>
        ) : null}
        {message}
      </div>
    )
  }

  const info: Record<Exclude<RegistrationState['kind'], 'open' | 'registered'>, { title: string; text: string }> = {
    full: { title: 'Plazas completas', text: 'Si alguien cancela, se liberará su plaza. Vuelve a mirar más adelante.' },
    closed: { title: 'Inscripción cerrada', text: 'Ya no es posible inscribirse en esta actividad.' },
    not_open: {
      title: 'Inscripción todavía no abierta',
      text: state.kind === 'not_open' ? `Podrás inscribirte a partir del ${formatInstant(state.opensAt)}.` : '',
    },
    cancelled: { title: 'Actividad cancelada', text: 'La organización ha cancelado esta actividad.' },
    past: { title: 'Actividad finalizada', text: 'Esta actividad ya se ha celebrado.' },
  }
  const current = info[state.kind]
  return (
    <div>
      <div className="rounded-2xl border border-line bg-mist/60 px-5 py-4">
        <p className="eyebrow text-night">{current.title}</p>
        <p className="mt-1 text-sm text-slate">{current.text}</p>
      </div>
      {state.kind === 'full' || state.kind === 'closed' ? (
        <ButtonLink href="/participa" variant="secondary" size="md" block arrow className="mt-3">
          Ver dónde puedes participar
        </ButtonLink>
      ) : null}
      {message}
    </div>
  )
}
