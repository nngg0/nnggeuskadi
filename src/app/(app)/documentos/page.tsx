import type { Metadata } from 'next'
import Link from 'next/link'
import { DocumentRow } from '@/components/documents/DocumentRow'
import { DocumentSearch } from '@/components/documents/DocumentSearch'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/States'
import { TerritoryFilter } from '@/components/ui/TerritoryFilter'
import { requireUser } from '@/lib/auth/session'
import { cn } from '@/lib/cn'
import { getContent } from '@/lib/content/source'
import { documentCategories, featuredDocuments, recentDocuments, searchDocuments } from '@/lib/domain/selectors'
import { parseTerritoryFilter } from '@/lib/domain/territories'
import type { DocumentItem } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'

export const metadata: Metadata = { title: 'Documentos' }

type Search = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function DocumentsPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser()
  const params = await searchParams
  const content = await getContent()
  const savedIds = await personalStore().savedDocumentIds(user.id)
  const saved = new Set(savedIds)

  const q = (first(params.q) ?? '').slice(0, 100)
  const territory = parseTerritoryFilter(first(params.t))
  const categories = documentCategories(content.documents, content.config.documentCategories)
  const category = categories.find((c) => c === first(params.cat)) ?? null
  const onlySaved = first(params.guardados) === '1'
  const filtering = Boolean(q || category || onlySaved || territory !== 'todos')

  let results: DocumentItem[] = searchDocuments(content.documents, { q, territory, category }, user.territory)
  if (onlySaved) results = results.filter((d) => saved.has(d.id))

  const chipHref = (next: { cat?: string | null; guardados?: boolean }) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (territory !== 'todos') p.set('t', territory)
    const cat = next.cat === undefined ? category : next.cat
    if (cat) p.set('cat', cat)
    if (next.guardados ?? onlySaved) p.set('guardados', '1')
    const qs = p.toString()
    return qs ? `/documentos?${qs}` : '/documentos'
  }

  const chip = (active: boolean) =>
    cn(
      'press shrink-0 rounded-full border px-4 py-2 text-[0.8rem] font-semibold',
      active ? 'border-electric bg-electric text-white' : 'border-line-strong bg-white text-night hover:border-night/40',
    )

  const featured = featuredDocuments(content.documents, user.territory)
  const recent = recentDocuments(content.documents, 6)

  return (
    <>
      <PageHeader eyebrow="Documentos" title="Todo a mano.">
        Argumentarios, manuales, plantillas y material de campaña. Busca por palabra o filtra por categoría.
      </PageHeader>

      <Container className="py-6 md:py-8">
        <div className="grid gap-4">
          <DocumentSearch initial={q} />
          <TerritoryFilter value={territory} territories={content.territories} userTerritory={user.territory} />
          <nav aria-label="Categorías" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href={chipHref({ guardados: !onlySaved })} className={chip(onlySaved)} aria-pressed={onlySaved} scroll={false}>
              <Icon name="bookmark" size={14} filled={onlySaved} className="-mt-0.5 mr-1 inline" />
              Guardados{savedIds.length ? ` · ${savedIds.length}` : ''}
            </Link>
            <span className="mx-1 w-px shrink-0 bg-line-strong" aria-hidden />
            <Link href={chipHref({ cat: null })} className={chip(!category)} aria-pressed={!category} scroll={false}>
              Todas
            </Link>
            {categories.map((c) => (
              <Link key={c} href={chipHref({ cat: category === c ? null : c })} className={chip(category === c)} aria-pressed={category === c} scroll={false}>
                {c}
              </Link>
            ))}
          </nav>
        </div>

        {filtering ? (
          <section className="mt-8" aria-live="polite">
            <Eyebrow tone="slate">
              {results.length === 1 ? '1 documento' : `${results.length} documentos`}
              {q ? ` para «${q}»` : ''}
            </Eyebrow>
            {results.length > 0 ? (
              <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
                {results.map((d) => (
                  <DocumentRow key={d.id} document={d} saved={saved.has(d.id)} className="animate-rise" />
                ))}
              </ul>
            ) : onlySaved && !q && !category ? (
              <EmptyState className="mt-3" title="Aún no has guardado documentos" icon="bookmark" action={{ href: '/documentos', label: 'Ver todos los documentos' }}>
                Pulsa el marcador de cualquier documento para tenerlo a mano aquí y en tu perfil.
              </EmptyState>
            ) : (
              <EmptyState className="mt-3" title="Sin resultados" icon="search" action={{ href: '/documentos', label: 'Quitar filtros' }}>
                No encontramos documentos con esos criterios. Prueba con otra palabra o quita algún filtro.
              </EmptyState>
            )}
          </section>
        ) : content.documents.length === 0 ? (
          <EmptyState className="mt-8" title="Todavía no hay documentos" icon="document">
            Cuando la organización comparta material aparecerá aquí.
          </EmptyState>
        ) : (
          <>
            {featured.length > 0 ? (
              <section className="mt-8">
                <Eyebrow>Destacados</Eyebrow>
                <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
                  {featured.map((d) => (
                    <DocumentRow key={d.id} document={d} saved={saved.has(d.id)} />
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="mt-10">
              <Eyebrow>Recientes</Eyebrow>
              <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
                {recent.map((d) => (
                  <DocumentRow key={d.id} document={d} saved={saved.has(d.id)} />
                ))}
              </ul>
            </section>
          </>
        )}
      </Container>
    </>
  )
}
