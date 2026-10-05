import Image from 'next/image'
import { cn } from '@/lib/cn'
import logo from '@/assets/nngg-euskadi-blanco.png'

/** Logotipo oficial de NNGG Euskadi en blanco (para zonas de identidad en azul). */
export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <Image
      src={logo}
      alt="NNGG Euskadi"
      priority
      className={cn('w-auto', size === 'lg' ? 'h-16 sm:h-20' : 'h-9 md:h-10', className)}
      sizes={size === 'lg' ? '112px' : '56px'}
    />
  )
}
