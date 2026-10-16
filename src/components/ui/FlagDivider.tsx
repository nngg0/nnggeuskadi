import { cn } from '@/lib/cn'

/** Franja fina con la bandera de España para separar secciones. Decorativa. */
export function FlagDivider({ className }: { className?: string }) {
  return <div aria-hidden className={cn('flag-stripe opacity-90', className)} />
}
