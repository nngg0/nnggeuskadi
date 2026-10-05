'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { saveParticipation, withdrawParticipation } from '@/lib/actions/participations'
import { cn } from '@/lib/cn'
import { formatDayMonth } from '@/lib/domain/dates'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Notice } from '@/components/ui/States'

export interface OpportunityOption {
  id: string
  name: string
  description: string
  deadline: string | null
  isOpen: boolean
  chosen: boolean
}

interface Props {
  projectId: string
  projectTitle: string
  options: OpportunityOption[]
  participating: boolean
  tone?: 'light' | 'dark' | 'brand'
  block?: boolean
}

/**
 * "Quiero participar": abre una hoja inferior donde elegir uno o varios ámbitos,
 * confirma, registra la participación y muestra el resultado al instante.
 */
export function ParticipateFlow({ projectId, projectTitle, options, participating, tone = 'light', block = true }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(options.filter((o) => o.chosen).map((o) => o.id)))
  const [result, setResult] = useState<{ ok: boolean; message: string; withdrawn?: boolean } | null>(null)
  const [pending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectable = options.filter((o) => o.isOpen || o.chosen)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    const trigger = triggerRef.current
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      trigger?.focus()
    }
  }, [open])

  function openSheet() {
    setSelected(new Set(options.filter((o) => o.chosen).map((o) => o.id)))
    setResult(null)
    setOpen(true)
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit() {
    startTransition(async () => {
      try {
        setResult(await saveParticipation(projectId, [...selected]))
      } catch {
        setResult({ ok: false, message: 'Sin conexión. Comprueba tu red e inténtalo de nuevo.' })
      }
    })
  }

  function withdraw() {
    startTransition(async () => {
      try {
        const r = await withdrawParticipation(projectId)
        setResult({ ...r, withdrawn: r.ok })
      } catch {
        setResult({ ok: false, message: 'Sin conexión. Comprueba tu red e inténtalo de nuevo.' })
      }
    })
  }

  const noOptions = selectable.length === 0

  return (
    <>
      {participating ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={openSheet}
          className={cn(
            'press flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-btn)] px-5 text-[0.95rem] font-bold',
            block && 'w-full',
            tone === 'light' ? 'bg-success-50 text-success hover:bg-success-50/70' : 'bg-white/10 text-white hover:bg-white/15',
          )}
        >
          <span className="inline-flex items-center gap-2.5">
            <span className={cn('flex size-6 items-center justify-center rounded-full', tone === 'light' ? 'bg-success text-white' : 'bg-sky text-night')}>
              <Icon name="check" size={14} strokeWidth={3} />
            </span>
            Ya participas
          </span>
          <span className={cn('text-xs font-semibold', tone === 'light' ? 'text-success/70' : 'text-white/60')}>Editar</span>
        </button>
      ) : (
        <Button
          ref={triggerRef}
          block={block}
          arrow
          onClick={openSheet}
          disabled={noOptions}
          variant={noOptions ? 'secondary' : tone === 'brand' ? 'onDark' : 'primary'}
        >
          {noOptions ? 'Participación cerrada' : 'Quiero participar'}
        </Button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <div className="absolute inset-0 animate-fade bg-night/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`participa-${projectId}`}
            tabIndex={-1}
            className="pb-safe relative max-h-[92dvh] w-full max-w-lg animate-sheet overflow-y-auto rounded-t-[1.75rem] bg-white text-ink outline-none sm:animate-rise sm:rounded-[1.75rem]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-white px-6 pb-3 pt-6">
              <div>
                <p className="eyebrow text-electric">Quiero participar</p>
                <h2 id={`participa-${projectId}`} className="display mt-2 text-2xl text-night">
                  {projectTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="press -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-slate hover:bg-mist"
                aria-label="Cerrar"
              >
                <Icon name="x" size={22} />
              </button>
            </div>

            {result?.ok ? (
              <div className="px-6 pb-8 pt-4 text-center">
                <span className="mx-auto flex size-16 animate-pop items-center justify-center rounded-full bg-electric text-white">
                  <Icon name={result.withdrawn ? 'check' : 'participa'} size={30} strokeWidth={2.2} />
                </span>
                <p className="display mt-5 text-2xl text-night">{result.withdrawn ? 'Hecho.' : '¡Cuenta contigo!'}</p>
                <p className="mx-auto mt-2 max-w-xs text-[0.95rem] leading-relaxed text-slate">{result.message}</p>
                <div className="mt-6 grid gap-2">
                  {!result.withdrawn ? (
                    <Link href="/perfil#participaciones" className="press inline-flex min-h-12 items-center justify-center rounded-[var(--radius-btn)] bg-night px-5 text-sm font-bold text-white">
                      Ver mis participaciones
                    </Link>
                  ) : null}
                  <Button variant="secondary" size="md" onClick={() => setOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <p className="text-[0.95rem] leading-relaxed text-slate">
                  Elige en qué te gustaría participar. Puedes marcar todos los ámbitos que quieras. Quien lo está preparando se pondrá en contacto contigo.
                </p>
                <fieldset className="mt-5 grid gap-2.5">
                  <legend className="sr-only">Ámbitos de colaboración</legend>
                  {options.map((o) => {
                    const disabled = !o.isOpen && !o.chosen
                    const checked = selected.has(o.id)
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          'press flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-colors',
                          checked ? 'border-electric bg-electric-50' : 'border-line hover:border-line-strong',
                          disabled && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(o.id)}
                        />
                        <span
                          aria-hidden
                          className={cn(
                            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
                            checked ? 'border-electric bg-electric text-white' : 'border-line-strong bg-white',
                          )}
                        >
                          {checked ? <Icon name="check" size={15} strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <span className="font-bold text-night">{o.name}</span>
                            {disabled ? <span className="eyebrow !text-[0.6rem] text-slate">Cerrado</span> : null}
                          </span>
                          {o.description ? <span className="mt-1 block text-sm leading-relaxed text-slate">{o.description}</span> : null}
                          {o.deadline && !disabled ? (
                            <span className="mt-1.5 block text-xs font-semibold text-slate">Hasta el {formatDayMonth(o.deadline)}</span>
                          ) : null}
                        </span>
                      </label>
                    )
                  })}
                </fieldset>

                {result && !result.ok ? (
                  <div className="mt-4">
                    <Notice tone="danger">{result.message}</Notice>
                  </div>
                ) : null}

                <div className="sticky bottom-0 -mx-6 mt-6 bg-white px-6 pb-2 pt-3">
                  <Button block arrow onClick={submit} disabled={pending || selected.size === 0} aria-busy={pending}>
                    {pending
                      ? 'Enviando…'
                      : selected.size === 0
                        ? 'Elige al menos un ámbito'
                        : participating
                          ? 'Guardar cambios'
                          : `Confirmar participación (${selected.size})`}
                  </Button>
                  {participating ? (
                    <button
                      type="button"
                      onClick={withdraw}
                      disabled={pending}
                      className="press mt-3 w-full text-center text-sm font-semibold text-slate underline decoration-line-strong underline-offset-4 hover:text-danger"
                    >
                      Dejar de participar
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
