import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'electric' | 'success' | 'warning' | 'danger' | 'dark'

const TONES: Record<Tone, string> = {
  neutral: 'bg-mist text-slate',
  electric: 'bg-electric-50 text-electric',
  success: 'bg-success-50 text-success',
  warning: 'bg-warning-50 text-warning',
  danger: 'bg-danger-50 text-danger',
  dark: 'bg-white/10 text-white',
}

export function Tag({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn('eyebrow inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 !text-[0.625rem]', TONES[tone], className)}>
      {children}
    </span>
  )
}
