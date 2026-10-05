'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { NAV_ITEMS } from './nav-items'

/** Barra inferior móvil: azul noche, elemento activo con píldora azul eléctrico. */
export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="press group flex flex-col items-center gap-1 pb-2 pt-2.5"
              >
                <span
                  className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200',
                    active ? 'bg-electric text-white' : 'text-white/55 group-hover:text-white',
                  )}
                >
                  <Icon name={item.icon} size={21} strokeWidth={active ? 2.1 : 1.75} />
                </span>
                <span className={cn('text-[0.62rem] tracking-[0.02em]', active ? 'font-bold text-white' : 'font-medium text-white/55')}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
