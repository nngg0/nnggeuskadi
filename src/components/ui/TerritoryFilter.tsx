'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/cn'
import type { TerritoryFilter as Filter, Territory } from '@/lib/domain/territories'

/** Selector "Todos | Euskadi | Álava | Bizkaia | Gipuzkoa". Guarda la elección en la URL (?t=). */
export function TerritoryFilter({
  value,
  territories,
  userTerritory,
  resetParams = [],
}: {
  value: Filter
  territories: Territory[]
  userTerritory?: string
  resetParams?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const options: { id: Filter; name: string }[] = [
    { id: 'todos', name: 'Todos' },
    ...territories.filter((t) => t.active).map((t) => ({ id: t.id, name: t.name })),
  ]

  function select(id: Filter) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'todos') params.delete('t')
    else params.set('t', id)
    resetParams.forEach((p) => params.delete(p))
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  return (
    <div
      role="radiogroup"
      aria-label="Filtrar por territorio"
      data-pending={pending || undefined}
      className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 transition-opacity data-[pending]:opacity-60 sm:mx-0 sm:px-0"
    >
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => select(o.id)}
            className={cn(
              'press eyebrow relative shrink-0 rounded-full border px-4 py-2.5 !text-[0.68rem]',
              active ? 'border-night bg-night text-white' : 'border-line-strong bg-white text-slate hover:border-night/40 hover:text-night',
            )}
          >
            {o.name}
            {userTerritory === o.id ? (
              <span className={cn('ml-1.5 inline-block size-1.5 rounded-full align-middle', active ? 'bg-sky' : 'bg-electric')} aria-label="(tu territorio)" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
