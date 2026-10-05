import { describe, expect, it } from 'vitest'
import { demoWorkbook } from '@/demo/content'
import { parseWorkbook } from '@/lib/sheets/parse'
import {
  documentCategories,
  homeUpcoming,
  openOpportunities,
  opportunityAvailability,
  preparingProjects,
  searchDocuments,
  upcomingActivities,
} from '@/lib/domain/selectors'
import { territoryRank } from '@/lib/domain/territories'

const now = new Date('2026-10-05T10:00:00Z')
const content = parseWorkbook(demoWorkbook(now))

describe('personalización por territorio', () => {
  it('prioriza: propio, Euskadi, resto', () => {
    expect(territoryRank('alava', 'alava')).toBe(0)
    expect(territoryRank('euskadi', 'alava')).toBe(1)
    expect(territoryRank('bizkaia', 'alava')).toBe(2)
  })

  it('Próximamente muestra primero lo relevante y nunca borradores, pasadas ni canceladas', () => {
    const { items } = homeUpcoming(content.activities, 'alava', now)
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((a) => a.status !== 'borrador' && a.status !== 'cancelada')).toBe(true)
    expect(items.every((a) => territoryRank(a.territory, 'alava') <= 1)).toBe(true)
  })

  it('el calendario solo incluye actividades futuras y visibles, ordenadas', () => {
    const list = upcomingActivities(content.activities, now)
    expect(list.some((a) => a.id === 'ACT-030')).toBe(false)
    expect(list.some((a) => a.id === 'ACT-099')).toBe(false)
    const dates = list.map((a) => a.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('En preparación ordena por territorio del usuario', () => {
    const list = preparingProjects(content.projects, 'gipuzkoa')
    expect(list[0]?.territory).toBe('gipuzkoa')
    expect(list.every((p) => p.status === 'en_preparacion')).toBe(true)
  })
})

describe('oportunidades', () => {
  const opp = content.opportunities.find((o) => o.id === 'OP-003')!

  it('cierra la oportunidad cuando se cubren las plazas', () => {
    expect(opportunityAvailability(opp, 2, '2026-10-05')).toMatchObject({ remaining: 1, isOpen: true })
    expect(opportunityAvailability(opp, 3, '2026-10-05')).toMatchObject({ remaining: 0, isOpen: false })
  })

  it('cierra la oportunidad pasada la fecha límite', () => {
    expect(opportunityAvailability({ ...opp, deadline: '2026-10-01' }, 0, '2026-10-05').isOpen).toBe(false)
  })

  it('Puedes participar en... excluye cubiertas', () => {
    const list = openOpportunities(content, new Map(), 'bizkaia', '2026-10-05')
    expect(list.some((o) => o.opportunity.id === 'OP-014')).toBe(false)
    expect(list[0]?.project.territory).toBe('bizkaia')
  })
})

describe('documentos', () => {
  it('busca sin tildes ni mayúsculas y combina filtros', () => {
    expect(searchDocuments(content.documents, { q: 'IDENTIDAD visual' }, 'alava').map((d) => d.id)).toEqual(['DOC-002'])
    expect(searchDocuments(content.documents, { q: 'organizacion' }, 'alava').length).toBeGreaterThan(0)
    expect(searchDocuments(content.documents, { territory: 'bizkaia' }, 'alava').every((d) => d.territory === 'bizkaia')).toBe(true)
    expect(searchDocuments(content.documents, { category: 'Formación', q: 'xyz' }, 'alava')).toEqual([])
  })

  it('las categorías respetan el orden configurado', () => {
    expect(documentCategories(content.documents, ['Formación', 'Organización'])[0]).toBe('Formación')
  })
})
