import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Eyebrow({ children, className, tone = 'electric' }: { children: ReactNode; className?: string; tone?: 'electric' | 'slate' | 'sky' | 'white' }) {
  const tones = { electric: 'text-electric', slate: 'text-slate', sky: 'text-sky', white: 'text-white/70' }
  return <p className={cn('eyebrow', tones[tone], className)}>{children}</p>
}

/** Cabecera de sección: rótulo + titular editorial + acción opcional. */
export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
  dark = false,
}: {
  eyebrow: string
  title?: ReactNode
  action?: ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div>
        <Eyebrow tone={dark ? 'sky' : 'electric'}>{eyebrow}</Eyebrow>
        {title ? (
          <h2 className={cn('display mt-2 text-[1.75rem] sm:text-[2.1rem]', dark ? 'text-white' : 'text-night')}>{title}</h2>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pb-1">{action}</div> : null}
    </div>
  )
}
