import { cn } from '@/lib/cn'

/**
 * Banderita de España (rojo · amarillo · rojo) sobre el borde entre dos secciones,
 * alineada a la izquierda con el contenido, como en los folletos. No ocupa espacio. Decorativa.
 */
export function FlagDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative z-10 mx-auto h-0 max-w-6xl px-4 sm:px-6', className)}>
      <div className="flex h-3 w-20 -translate-y-1/2 sm:h-3.5 sm:w-24">
        <span className="flex-1 bg-flag-red" />
        <span className="flex-[2] bg-flag-yellow" />
        <span className="flex-1 bg-flag-red" />
      </div>
    </div>
  )
}
