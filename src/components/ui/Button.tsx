import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'onDark' | 'danger'
type Size = 'lg' | 'md' | 'sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-electric text-white hover:bg-electric-600 disabled:bg-line-strong disabled:text-white',
  secondary: 'bg-white text-ink border border-line-strong hover:border-ink/40 disabled:text-slate',
  ghost: 'text-electric hover:bg-electric-50',
  onDark: 'bg-white text-night hover:bg-electric-50',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger-50',
}

const SIZES: Record<Size, string> = {
  lg: 'min-h-14 px-6 text-[0.95rem] gap-4',
  md: 'min-h-12 px-5 text-sm gap-3',
  sm: 'min-h-10 px-4 text-[0.8rem] gap-2',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'lg', block = false) {
  return cn(
    'press inline-flex items-center justify-between rounded-[var(--radius-btn)] font-bold tracking-[0.01em] select-none',
    'disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
  )
}

interface CommonProps {
  variant?: Variant
  size?: Size
  block?: boolean
  /** Muestra la flecha característica a la derecha. */
  arrow?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'lg',
  block,
  arrow,
  icon,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button className={cn(buttonClasses(variant, size, block), !arrow && !icon && 'justify-center', className)} {...rest}>
      <span className="truncate">{children}</span>
      {icon ?? (arrow ? <Icon name="arrowRight" size={20} className="shrink-0" /> : null)}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'lg',
  block,
  arrow,
  icon,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(buttonClasses(variant, size, block), !arrow && !icon && 'justify-center', className)} {...rest}>
      <span className="truncate">{children}</span>
      {icon ?? (arrow ? <Icon name="arrowRight" size={20} className="shrink-0" /> : null)}
    </Link>
  )
}

/** Enlace de texto con flecha: "Ver calendario →" */
export function ArrowLink({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn('press group inline-flex items-center gap-2 text-sm font-bold text-electric hover:text-electric-600', className)}
      {...rest}
    >
      {children}
      <Icon name="arrowRight" size={18} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
