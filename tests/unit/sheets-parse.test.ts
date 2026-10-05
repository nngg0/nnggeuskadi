import { describe, expect, it } from 'vitest'
import { parseActivities, parseConfig, parseDocuments, parseWorkbook, tableToRecords } from '@/lib/sheets/parse'
import { demoWorkbook } from '@/demo/content'

const HEADER = ['id', 'titulo', 'descripcion', 'territorio', 'fecha', 'hora', 'lugar', 'plazas', 'inscripcion_inicio', 'inscripcion_fin', 'estado', 'visible', 'destacado']

describe('validación del Sheet', () => {
  it('normaliza cabeceras y omite filas vacías', () => {
    const rows = tableToRecords([['ID', 'Título '], ['A', 'x'], ['', ''], ['B', 'y']])
    expect(rows.map((r) => r.data)).toEqual([{ id: 'A', titulo: 'x' }, { id: 'B', titulo: 'y' }])
    expect(rows[1]?.row).toBe(4)
  })

  it('acepta variantes habituales de escritura', () => {
    const { items, issues } = parseActivities([
      HEADER,
      ['ACT-1', 'Cena', '', 'ARABA', '17/10/2026', '21.00h', 'Gasteiz', '80', '01/10/2026', '15/10/2026 20:00', 'Confirmada', 'VERDADERO', 'sí'],
    ])
    expect(issues).toEqual([])
    expect(items[0]).toMatchObject({
      territory: 'alava',
      date: '2026-10-17',
      time: '21:00',
      capacity: 80,
      registrationClosesAt: '2026-10-15T18:00:00.000Z',
      status: 'confirmada',
      visible: true,
      featured: true,
    })
  })

  it('valores por defecto: visible sí, sin límite de plazas, estado confirmada', () => {
    const { items } = parseActivities([HEADER, ['ACT-2', 'Charla', '', 'Bizkaia', '2026-11-01', '', '', '', '', '', '', '', '']])
    expect(items[0]).toMatchObject({ capacity: null, time: null, status: 'confirmada', visible: true, featured: false, registrationOpensAt: null })
  })

  it('descarta filas inválidas sin romper el resto e informa del motivo', () => {
    const { items, issues } = parseActivities([
      HEADER,
      ['ACT-1', 'OK', '', 'Euskadi', '2026-10-17', '', '', '', '', '', '', '', ''],
      ['ACT-2', 'Mal territorio', '', 'Madrid', '2026-10-17', '', '', '', '', '', '', '', ''],
      ['ACT-3', 'Mala fecha', '', 'Euskadi', '31/02/2026', '', '', '', '', '', '', '', ''],
      ['ACT-4', 'Mal aforo', '', 'Euskadi', '2026-10-17', '', '', '-3', '', '', '', '', ''],
      ['ACT 5', 'Mal id', '', 'Euskadi', '2026-10-17', '', '', '', '', '', '', '', ''],
      ['ACT-1', 'Duplicado', '', 'Euskadi', '2026-10-17', '', '', '', '', '', '', '', ''],
      ['ACT-6', 'Estado raro', '', 'Euskadi', '2026-10-17', '', '', '', '', '', 'quizás', '', ''],
    ])
    expect(items.map((i) => i.id)).toEqual(['ACT-1'])
    expect(issues).toHaveLength(6)
    expect(issues[0]?.message).toContain('territorio no reconocido')
  })

  it('solo admite enlaces https en documentos', () => {
    const header = ['id', 'titulo', 'descripcion', 'categoria', 'territorio', 'url', 'fecha', 'destacado', 'visible']
    const { items, issues } = parseDocuments([
      header,
      ['D1', 'Bueno', '', 'Formación', 'Euskadi', 'https://drive.google.com/file/x', '', '', ''],
      ['D2', 'Script', '', 'Formación', 'Euskadi', 'javascript:alert(1)', '', '', ''],
      ['D3', 'Http', '', 'Formación', 'Euskadi', 'http://inseguro.example', '', '', ''],
    ])
    expect(items.map((i) => i.id)).toEqual(['D1'])
    expect(issues).toHaveLength(2)
  })

  it('configuración con valores por defecto y categorías', () => {
    const config = parseConfig([['clave', 'valor'], ['categorias_documentos', 'A; B ,C']]).items[0]!
    expect(config.documentCategories).toEqual(['A', 'B', 'C'])
    expect(config.heroTitle).toBe('Lo que estamos haciendo juntos.')
  })

  it('aplica reglas entre hojas: territorios inactivos y oportunidades huérfanas', () => {
    const wb = demoWorkbook(new Date('2026-10-05T10:00:00Z'))
    wb.TERRITORIOS = [['id', 'nombre', 'activo'], ['gipuzkoa', 'Gipuzkoa', 'no']]
    wb.OPORTUNIDADES = [...(wb.OPORTUNIDADES ?? []), ['OP-X', 'PRY-NO', 'Huérfana', '', '', '', '', '']]
    const content = parseWorkbook(wb)
    expect(content.activities.some((a) => a.territory === 'gipuzkoa')).toBe(false)
    expect(content.territories.find((t) => t.id === 'gipuzkoa')?.active).toBe(false)
    expect(content.opportunities.some((o) => o.id === 'OP-X')).toBe(false)
    expect(content.issues.some((i) => i.message.includes('PRY-NO'))).toBe(true)
  })

  it('los datos demo son válidos de principio a fin', () => {
    const content = parseWorkbook(demoWorkbook())
    expect(content.issues).toEqual([])
    expect(content.activities.length).toBeGreaterThan(10)
    for (const t of ['euskadi', 'alava', 'bizkaia', 'gipuzkoa']) {
      expect(content.activities.some((a) => a.territory === t)).toBe(true)
      expect(content.projects.some((p) => p.territory === t)).toBe(true)
    }
  })
})
