'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { NAV_ITEMS } from './nav-items'
import { Wordmark } from './Wordmark'

/** Cabecera compacta azul noche. En escritorio contiene la navegación principal. */
export function TopBar({ initials, territoryName, demo }: { initials: string; territoryName: string; demo: boolean }) {
  const pathname = usePathname()
  return (
    <header className="pt-safe sticky top-0 z-40 bg-night text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6 md:h-16">
        <Link href="/" className="press shrink-0" aria-label="NNGG Euskadi · Inicio">
          <Wordmark />
        </Link>
        {demo ? (
          <span className="eyebrow rounded-full bg-sky/15 px-2 py-0.5 !text-[0.58rem] text-sky" title="Datos de ejemplo">
            Demo
          </span>
        ) : null}
        <nav aria-label="Principal" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'press relative flex items-center gap-2 rounded-full px-4 py-2 text-sm',
                      active ? 'bg-white/10 font-bold text-white' : 'font-medium text-white/65 hover:text-white',
                    )}
                  >
                    <Icon name={item.icon} size={18} className={active ? 'text-sky' : undefined} />
                    {item.label}
                    {active ? <span className="absolute inset-x-4 -bottom-[13px] h-[3px] rounded-full bg-electric" /> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <Link
          href="/perfil"
          className="press ml-auto flex items-center gap-2 md:ml-2"
          aria-label={`Mi perfil · ${territoryName}`}
        >
          <span className="eyebrow hidden !text-[0.6rem] text-white/60 sm:inline">{territoryName}</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-electric text-[0.8rem] font-bold">{initials}</span>
        </Link>
      </div>
    </header>
  )
}
