import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ButtonLink } from './Button'
import { Icon, type IconName } from './Icon'

/** Estado vacío útil: explica qué pasará y ofrece el siguiente paso. */
export function EmptyState({
  title,
  children,
  action,
  icon = 'spark',
  className,
}: {
  title: string
  children?: ReactNode
  action?: { href: string; label: string }
  icon?: IconName
  className?: string
}) {
  return (
    <div className={cn('rounded-[var(--radius-card)] border border-dashed border-line-strong bg-white/60 px-6 py-8', className)}>
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-full bg-electric-50 text-electric">
        <Icon name={icon} size={22} />
      </span>
      <p className="eyebrow text-night">{title}</p>
      {children ? <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-slate">{children}</p> : null}
      {action ? (
        <ButtonLink href={action.href} variant="secondary" size="md" arrow className="mt-5">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  )
}

export function Notice({ tone = 'warning', icon = 'alert', children }: { tone?: 'warning' | 'danger' | 'success' | 'electric'; icon?: IconName; children: ReactNode }) {
  const tones = {
    warning: 'bg-warning-50 text-warning',
    danger: 'bg-danger-50 text-danger',
    success: 'bg-success-50 text-success',
    electric: 'bg-electric-50 text-electric',
  }
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold', tones[tone])}>
      <Icon name={icon} size={20} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-2xl bg-line/70', className)} />
}

export function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white p-6">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-6 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-6 h-12 w-full" />
    </div>
  )
}
