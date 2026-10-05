import { z } from 'zod'
import { isIsoDate, isTime, madridToInstant } from '@/lib/domain/dates'
import {
  DEFAULT_TERRITORIES,
  isTerritoryId,
  parseTerritory,
  stripAccents,
  type Territory,
} from '@/lib/domain/territories'
import {
  ACTIVITY_STATUSES,
  OPPORTUNITY_STATUSES,
  PROJECT_STATUSES,
  type Activity,
  type AppConfig,
  type ContentBundle,
  type ContentIssue,
  type DocumentItem,
  type Opportunity,
  type Project,
} from '@/lib/domain/types'
import { CONFIG_KEYS, type RawTable, type RawWorkbook, type SheetName } from './columns'

/*
 * Validación de los datos del Sheet. Principio: no confiar en el Sheet.
 * - Cada fila se valida por separado; una fila inválida se descarta y se informa, sin romper la app.
 * - Se aceptan variantes habituales de escritura (Sí/TRUE/VERDADERO, 17/10/2026, Álava/Araba...).
 */

const MAX_TEXT = 4000

function normalizeHeader(value: string): string {
  return stripAccents(value).trim().toLowerCase().replace(/[\s-]+/g, '_')
}

/** Convierte una tabla (cabeceras + filas) en objetos clave/valor, ignorando filas vacías. */
export function tableToRecords(table: RawTable | undefined): { row: number; data: Record<string, string> }[] {
  if (!table || table.length === 0) return []
  const [header = [], ...rows] = table
  const keys = header.map((h) => normalizeHeader(String(h ?? '')))
  const records: { row: number; data: Record<string, string> }[] = []
  rows.forEach((cells, index) => {
    const data: Record<string, string> = {}
    keys.forEach((key, i) => {
      if (key) data[key] = String(cells[i] ?? '').trim()
    })
    if (Object.values(data).some((v) => v !== '')) records.push({ row: index + 2, data })
  })
  return records
}

/* ------------------------------ Coerciones ------------------------------ */

const TRUE_VALUES = new Set(['si', 'true', 'verdadero', '1', 'x', 'yes'])
const FALSE_VALUES = new Set(['no', 'false', 'falso', '0', ''])

const bool = (defaultValue: boolean) =>
  z.string().transform((v, ctx) => {
    const key = stripAccents(v).trim().toLowerCase()
    if (key === '') return defaultValue
    if (TRUE_VALUES.has(key)) return true
    if (FALSE_VALUES.has(key)) return false
    ctx.addIssue({ code: 'custom', message: `valor booleano no reconocido: "${v}"` })
    return z.NEVER
  })

/** Acepta YYYY-MM-DD y DD/MM/YYYY. Devuelve YYYY-MM-DD. */
export function parseDate(value: string): string | null {
  const v = value.trim()
  if (isIsoDate(v)) return v
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v)
  if (m) {
    const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
    if (isIsoDate(iso)) return iso
  }
  return null
}

export function parseTime(value: string): string | null {
  const v = value.trim().replace('.', ':').replace(/h$/i, '')
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(v)
  if (!m) return null
  const t = `${m[1]!.padStart(2, '0')}:${m[2]}`
  return isTime(t) ? t : null
}

const requiredText = (max = 300) => z.string().trim().min(1, 'obligatorio').max(max)
const optionalText = (max = MAX_TEXT) => z.string().trim().max(max)

const id = z
  .string()
  .trim()
  .min(1, 'id obligatorio')
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/, 'id con caracteres no permitidos (usa letras, números, guiones)')

const territory = z.string().transform((v, ctx) => {
  const t = parseTerritory(v)
  if (!t) {
    ctx.addIssue({ code: 'custom', message: `territorio no reconocido: "${v}"` })
    return z.NEVER
  }
  return t
})

const requiredDate = z.string().transform((v, ctx) => {
  const d = parseDate(v)
  if (!d) {
    ctx.addIssue({ code: 'custom', message: `fecha no válida: "${v}"` })
    return z.NEVER
  }
  return d
})

const optionalDate = z.string().transform((v, ctx) => {
  if (v.trim() === '') return null
  const d = parseDate(v)
  if (!d) {
    ctx.addIssue({ code: 'custom', message: `fecha no válida: "${v}"` })
    return z.NEVER
  }
  return d
})

const optionalTime = z.string().transform((v, ctx) => {
  if (v.trim() === '') return null
  const t = parseTime(v)
  if (!t) {
    ctx.addIssue({ code: 'custom', message: `hora no válida: "${v}"` })
    return z.NEVER
  }
  return t
})

/** Fecha con hora opcional ("17/10/2026" o "17/10/2026 18:00") convertida en instante ISO. */
const optionalInstant = (endOfDay: boolean) =>
  z.string().transform((v, ctx) => {
    const raw = v.trim()
    if (raw === '') return null
    const [datePart = '', timePart] = raw.split(/[ T]+/)
    const date = parseDate(datePart)
    const time = timePart ? parseTime(timePart) : endOfDay ? '23:59' : '00:00'
    if (!date || !time) {
      ctx.addIssue({ code: 'custom', message: `fecha/hora no válida: "${v}"` })
      return z.NEVER
    }
    return madridToInstant(date, time).toISOString()
  })

const optionalPositiveInt = z.string().transform((v, ctx) => {
  const raw = v.trim()
  if (raw === '' || /^(abierto|sin limite|sin límite|-)$/i.test(raw)) return null
  const n = Number(raw.replace(/\./g, ''))
  if (!Number.isInteger(n) || n < 1 || n > 100000) {
    ctx.addIssue({ code: 'custom', message: `número de plazas no válido: "${v}"` })
    return z.NEVER
  }
  return n
})

function enumOf<T extends readonly string[]>(values: T, fallback?: T[number]) {
  return z.string().transform((v, ctx) => {
    const key = stripAccents(v).trim().toLowerCase().replace(/\s+/g, '_')
    if (key === '' && fallback) return fallback
    if ((values as readonly string[]).includes(key)) return key as T[number]
    ctx.addIssue({ code: 'custom', message: `estado no reconocido: "${v}" (válidos: ${values.join(', ')})` })
    return z.NEVER
  })
}

const httpsUrl = z
  .string()
  .trim()
  .refine((v) => {
    try {
      return new URL(v).protocol === 'https:'
    } catch {
      return false
    }
  }, 'la url debe empezar por https://')

/* ------------------------------- Esquemas ------------------------------- */

const cell = <S extends z.ZodType>(s: S) => z.preprocess((v) => v ?? '', s)

const activitySchema = z.object({
  id: cell(id),
  titulo: cell(requiredText(160)),
  descripcion: cell(optionalText()),
  territorio: cell(territory),
  fecha: cell(requiredDate),
  hora: cell(optionalTime),
  lugar: cell(optionalText(200)),
  plazas: cell(optionalPositiveInt),
  inscripcion_inicio: cell(optionalInstant(false)),
  inscripcion_fin: cell(optionalInstant(true)),
  estado: cell(enumOf(ACTIVITY_STATUSES, 'confirmada')),
  visible: cell(bool(true)),
  destacado: cell(bool(false)),
})

const projectSchema = z.object({
  id: cell(id),
  titulo: cell(requiredText(160)),
  descripcion: cell(optionalText()),
  tipo: cell(optionalText(40)),
  territorio: cell(territory),
  estado: cell(enumOf(PROJECT_STATUSES, 'en_preparacion')),
  fecha_inicio: cell(optionalDate),
  fecha_prevista: cell(optionalDate),
  visible: cell(bool(true)),
  destacado: cell(bool(false)),
})

const opportunitySchema = z.object({
  id: cell(id),
  proyecto_id: cell(id),
  nombre: cell(requiredText(80)),
  descripcion: cell(optionalText(1000)),
  plazas: cell(optionalPositiveInt),
  fecha_limite: cell(optionalDate),
  estado: cell(enumOf(OPPORTUNITY_STATUSES, 'abierta')),
  visible: cell(bool(true)),
})

const documentSchema = z.object({
  id: cell(id),
  titulo: cell(requiredText(160)),
  descripcion: cell(optionalText(1000)),
  categoria: cell(requiredText(60)),
  territorio: cell(territory),
  url: cell(httpsUrl),
  fecha: cell(optionalDate),
  destacado: cell(bool(false)),
  visible: cell(bool(true)),
})

const territorySchema = z.object({
  id: cell(territory),
  nombre: cell(requiredText(60)),
  activo: cell(bool(true)),
})

type Parsed<T> = { items: T[]; issues: ContentIssue[] }

function parseSheet<S extends z.ZodType, T>(
  sheet: SheetName,
  table: RawTable | undefined,
  schema: S,
  map: (v: z.output<S>) => T,
  getId: (v: T) => string,
): Parsed<T> {
  const items: T[] = []
  const issues: ContentIssue[] = []
  const seen = new Set<string>()
  for (const { row, data } of tableToRecords(table)) {
    const result = schema.safeParse(data)
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.') || 'fila'}: ${i.message}`)
        .join('; ')
      issues.push({ sheet, row, message })
      continue
    }
    const item = map(result.data)
    const key = getId(item)
    if (seen.has(key)) {
      issues.push({ sheet, row, message: `id duplicado "${key}"; se ignora esta fila` })
      continue
    }
    seen.add(key)
    items.push(item)
  }
  return { items, issues }
}

export function parseActivities(table: RawTable | undefined): Parsed<Activity> {
  return parseSheet('ACTIVIDADES', table, activitySchema, (r) => ({
    id: r.id,
    title: r.titulo,
    description: r.descripcion,
    territory: r.territorio,
    date: r.fecha,
    time: r.hora,
    place: r.lugar,
    capacity: r.plazas,
    registrationOpensAt: r.inscripcion_inicio,
    registrationClosesAt: r.inscripcion_fin,
    status: r.estado,
    visible: r.visible,
    featured: r.destacado,
  }), (a) => a.id)
}

export function parseProjects(table: RawTable | undefined): Parsed<Project> {
  return parseSheet('PROYECTOS', table, projectSchema, (r) => ({
    id: r.id,
    title: r.titulo,
    description: r.descripcion,
    kind: r.tipo || null,
    territory: r.territorio,
    status: r.estado,
    startDate: r.fecha_inicio,
    expectedDate: r.fecha_prevista,
    visible: r.visible,
    featured: r.destacado,
  }), (p) => p.id)
}

export function parseOpportunities(table: RawTable | undefined): Parsed<Opportunity> {
  return parseSheet('OPORTUNIDADES', table, opportunitySchema, (r) => ({
    id: r.id,
    projectId: r.proyecto_id,
    name: r.nombre,
    description: r.descripcion,
    capacity: r.plazas,
    deadline: r.fecha_limite,
    status: r.estado,
    visible: r.visible,
  }), (o) => o.id)
}

export function parseDocuments(table: RawTable | undefined): Parsed<DocumentItem> {
  return parseSheet('DOCUMENTOS', table, documentSchema, (r) => ({
    id: r.id,
    title: r.titulo,
    description: r.descripcion,
    category: r.categoria,
    territory: r.territorio,
    url: r.url,
    date: r.fecha,
    featured: r.destacado,
    visible: r.visible,
  }), (d) => d.id)
}

export function parseTerritories(table: RawTable | undefined): Parsed<Territory> {
  const parsed = parseSheet('TERRITORIOS', table, territorySchema, (r) => ({
    id: r.id,
    name: r.nombre,
    active: r.activo,
  }), (t) => t.id)
  // Los cuatro ámbitos existen siempre; la hoja solo cambia nombre o estado.
  const items = DEFAULT_TERRITORIES.map((d) => parsed.items.find((t) => t.id === d.id) ?? d)
  return { items, issues: parsed.issues }
}

export const DEFAULT_CONFIG: AppConfig = {
  heroTitle: 'Lo que estamos haciendo juntos.',
  heroSubtitle: 'Qué viene, qué estamos preparando y dónde puedes participar.',
  documentCategories: ['Organización', 'Argumentarios', 'Comunicación', 'Campañas', 'Formación', 'Material gráfico'],
  raw: {},
}

export function parseConfig(table: RawTable | undefined): Parsed<AppConfig> {
  const raw: Record<string, string> = {}
  for (const { data } of tableToRecords(table)) {
    const key = normalizeHeader(data.clave ?? '')
    if (key) raw[key] = (data.valor ?? '').slice(0, MAX_TEXT)
  }
  const categories = (raw[CONFIG_KEYS.documentCategories] ?? '')
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean)
  return {
    items: [
      {
        heroTitle: raw[CONFIG_KEYS.heroTitle]?.trim() || DEFAULT_CONFIG.heroTitle,
        heroSubtitle: raw[CONFIG_KEYS.heroSubtitle]?.trim() || DEFAULT_CONFIG.heroSubtitle,
        documentCategories: categories.length > 0 ? categories : DEFAULT_CONFIG.documentCategories,
        raw,
      },
    ],
    issues: [],
  }
}

/** Valida el libro completo y aplica reglas entre hojas (territorios activos, proyectos existentes). */
export function parseWorkbook(workbook: RawWorkbook): ContentBundle {
  const territories = parseTerritories(workbook.TERRITORIOS)
  const activities = parseActivities(workbook.ACTIVIDADES)
  const projects = parseProjects(workbook.PROYECTOS)
  const opportunities = parseOpportunities(workbook.OPORTUNIDADES)
  const documents = parseDocuments(workbook.DOCUMENTOS)
  const config = parseConfig(workbook.CONFIGURACION)

  const active = new Set(territories.items.filter((t) => t.active).map((t) => t.id))
  const inActive = <T extends { territory: string }>(items: T[]) =>
    items.filter((i) => isTerritoryId(i.territory) && active.has(i.territory))

  const visibleProjects = inActive(projects.items)
  const projectIds = new Set(projects.items.map((p) => p.id))
  const issues: ContentIssue[] = [
    ...territories.issues,
    ...activities.issues,
    ...projects.issues,
    ...opportunities.issues,
    ...documents.issues,
  ]
  const validOpportunities = opportunities.items.filter((o) => {
    if (projectIds.has(o.projectId)) return true
    issues.push({ sheet: 'OPORTUNIDADES', row: 0, message: `la oportunidad "${o.id}" apunta a un proyecto inexistente "${o.projectId}"` })
    return false
  })

  return {
    territories: territories.items,
    activities: inActive(activities.items),
    projects: visibleProjects,
    opportunities: validOpportunities,
    documents: inActive(documents.items),
    config: config.items[0] ?? DEFAULT_CONFIG,
    issues,
  }
}
