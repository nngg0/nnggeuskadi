import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Eyebrow } from '@/components/ui/Eyebrow'

/** Banda de identidad compacta para secciones internas: rótulo + titular editorial. */
export function PageHeader({
  eyebrow,
  title,
  children,
  action,
  className,
}: {
  eyebrow: string
  title: ReactNode
  children?: ReactNode
  /** Acción principal de la sección (p. ej. el botón «+»), arriba a la derecha. */
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('bg-night text-white', className)}>
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 md:pb-10 md:pt-10">
        <div className="flex items-start justify-between gap-4">
          <Eyebrow tone="sky">{eyebrow}</Eyebrow>
          {action}
        </div>
        <h1 className="display mt-3 text-[2.35rem] sm:text-5xl">{title}</h1>
        {children ? <div className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-white/70">{children}</div> : null}
      </div>
    </section>
  )
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-6xl px-4 sm:px-6', className)}>{children}</div>
}
