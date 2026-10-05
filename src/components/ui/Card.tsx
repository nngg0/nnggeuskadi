import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Tarjeta base: fondo blanco, esquinas generosas, borde sutil, sin sombra, mucho aire. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[var(--radius-card)] border border-line bg-white p-6', className)} {...rest} />
}
