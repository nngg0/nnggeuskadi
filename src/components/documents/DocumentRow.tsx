import { cn } from '@/lib/cn'
import { formatFullDate } from '@/lib/domain/dates'
import { territoryName } from '@/lib/domain/territories'
import type { DocumentItem } from '@/lib/domain/types'
import { Icon } from '@/components/ui/Icon'
import { SaveDocumentButton } from './SaveDocumentButton'

function extension(url: string): string | null {
  const match = /\.([a-z0-9]{2,4})(?:$|[?#])/i.exec(new URL(url).pathname)
  return match?.[1]?.toUpperCase() ?? null
}

/** Fila de documento: abrir en una pestaña nueva y guardar. */
export function DocumentRow({ document, saved, className }: { document: DocumentItem; saved: boolean; className?: string }) {
  const ext = extension(document.url)
  return (
    <li className={cn('flex items-center gap-3 rounded-[1.25rem] border border-line bg-white p-3 pr-3 sm:gap-4 sm:p-4', className)}>
      <a
        href={document.url}
        target="_blank"
        rel="noopener noreferrer"
        className="press group flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
      >
        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-mist text-electric">
          <Icon name="document" size={20} />
          {ext ? <span className="mt-0.5 text-[0.5rem] font-bold tracking-wider text-slate">{ext}</span> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="eyebrow !text-[0.6rem] text-electric">{document.category}</span>
            <span className="eyebrow !text-[0.58rem] text-slate">{territoryName(document.territory)}</span>
          </span>
          <span className="mt-1 block font-bold leading-snug text-night group-hover:text-electric">
            {document.title}
            <Icon name="external" size={14} className="ml-1.5 inline align-[-1px] text-slate opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
          {document.description ? <span className="mt-0.5 line-clamp-1 block text-sm text-slate">{document.description}</span> : null}
          {document.date ? <span className="mt-0.5 block text-xs text-slate/80">{formatFullDate(document.date)}</span> : null}
        </span>
      </a>
      <SaveDocumentButton documentId={document.id} saved={saved} title={document.title} />
    </li>
  )
}
