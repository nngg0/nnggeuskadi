import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

/** Botón «+» de la cabecera. Solo se pinta para quien puede crear; la acción vuelve a comprobarlo. */
export function CreateButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="press -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-electric text-white shadow-lg shadow-electric/30 hover:bg-electric-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
    >
      <Icon name="plus" size={22} strokeWidth={2.5} />
    </Link>
  )
}
