'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'

/** Búsqueda instantánea: actualiza ?q= tras una breve pausa al escribir. */
export function DocumentSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) params.set('q', value.trim().slice(0, 100))
      else params.delete('q')
      const qs = params.toString()
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
      <label htmlFor="doc-search" className="sr-only">
        Buscar documentos
      </label>
      <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate" />
      <input
        id="doc-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar argumentario, manual, plantilla…"
        autoComplete="off"
        maxLength={100}
        className="h-14 w-full rounded-2xl border border-line-strong bg-white pl-12 pr-12 text-[0.95rem] font-medium text-night placeholder:text-slate/70 focus:border-electric focus:outline-none focus:ring-4 focus:ring-electric/15"
      />
      {pending ? (
        <span className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-electric border-t-transparent" aria-label="Buscando" />
      ) : value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className="press absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-slate hover:bg-mist"
          aria-label="Borrar búsqueda"
        >
          <Icon name="x" size={18} />
        </button>
      ) : null}
    </form>
  )
}
