import { cn } from '@/lib/cn'

/** Identidad de la app en texto (sin reproducir logotipos oficiales). */
export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2 text-white', className)}>
      <span className={cn('font-extrabold tracking-[-0.04em]', size === 'lg' ? 'text-3xl' : 'text-xl')}>
        NNGG<span className="text-electric">.</span>
      </span>
      <span className={cn('eyebrow text-white/70', size === 'lg' ? '!text-[0.8rem]' : '!text-[0.62rem]')}>Euskadi</span>
    </span>
  )
}
