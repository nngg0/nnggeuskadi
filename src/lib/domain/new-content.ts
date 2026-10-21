import { z } from 'zod'
import { isIsoDate, isTime } from './dates'
import { TERRITORY_IDS, type TerritoryId } from './territories'
import type { ActivityStatus, Opportunity } from './types'

/*
 * Alta de actividades y proyectos desde la web.
 * Reglas puras: validación del formulario, ids nuevos y filas con el formato del Sheet.
 * El permiso (quién y en qué territorio) se comprueba en la acción con `can(user, 'content.create', …)`.
 */

export const NEW_ACTIVITY_STATUSES = ['confirmada', 'borrador'] as const
/** Al editar también se puede cerrar la inscripción o cancelar el acto. */
export const EDIT_ACTIVITY_STATUSES = ['confirmada', 'borrador', 'cerrada', 'cancelada'] as const
export const NEW_PROJECT_STATUSES = ['en_preparacion', 'en_marcha'] as const
export const MAX_NEW_OPPORTUNITIES = 12
/** Al editar, el proyecto también se puede cerrar y cada ámbito, abrir o cerrar. */
export const EDIT_PROJECT_STATUSES = ['en_preparacion', 'en_marcha', 'cerrado'] as const
export const EDIT_OPPORTUNITY_STATUSES = ['abierta', 'cerrada'] as const

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`)
const optionalIsoDate = z
  .string()
  .trim()
  .refine((v) => v === '' || isIsoDate(v), 'Fecha no válida.')
  .transform((v) => v || null)

const territory = z.enum(TERRITORY_IDS, { message: 'Elige un territorio.' })

export function newActivitySchema(today: string) {
  return activitySchema({ minDate: today, statuses: NEW_ACTIVITY_STATUSES })
}

/** Edición: admite todos los estados y conservar la fecha original aunque ya haya pasado. */
export function editActivitySchema(today: string, originalDate: string) {
  return activitySchema({ minDate: originalDate < today ? originalDate : today, statuses: EDIT_ACTIVITY_STATUSES })
}

function activitySchema({ minDate, statuses }: { minDate: string; statuses: readonly [ActivityStatus, ...ActivityStatus[]] }) {
  return z
    .object({
      titulo: text(160).min(3, 'Escribe un título.'),
      descripcion: text(4000),
      territorio: territory,
      fecha: z
        .string()
        .trim()
        .refine(isIsoDate, 'Elige la fecha.')
        .refine((v) => v >= minDate, 'La fecha no puede ser anterior a hoy.'),
      hora: z
        .string()
        .trim()
        .refine((v) => v === '' || isTime(v), 'Hora no válida.')
        .transform((v) => v || null),
      lugar: text(200),
      plazas: z
        .string()
        .trim()
        .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100000), 'Plazas: un número entre 1 y 100000, o vacío.')
        .transform((v) => (v ? Number(v) : null)),
      inscripcion_fin: optionalIsoDate,
      estado: z.enum(statuses).default('confirmada'),
    })
    .refine((v) => !v.inscripcion_fin || v.inscripcion_fin <= v.fecha, {
      message: 'El cierre de inscripción no puede ser posterior a la actividad.',
      path: ['inscripcion_fin'],
    })
}
export type NewActivityInput = z.output<ReturnType<typeof newActivitySchema>>

export function newProjectSchema(today: string) {
  return z.object({
    titulo: text(160).min(3, 'Escribe un título.'),
    descripcion: text(4000),
    tipo: text(40),
    territorio: territory,
    estado: z.enum(NEW_PROJECT_STATUSES).default('en_preparacion'),
    fecha_prevista: optionalIsoDate.refine((v) => !v || v >= today, 'La fecha prevista no puede ser anterior a hoy.'),
    ambitos: z
      .array(z.object({ nombre: text(80).min(2, 'Cada ámbito necesita un nombre.'), descripcion: text(1000) }))
      .min(1, 'Añade al menos un ámbito en el que se pueda participar.')
      .max(MAX_NEW_OPPORTUNITIES, `Máximo ${MAX_NEW_OPPORTUNITIES} ámbitos.`),
  })
}
export type NewProjectInput = z.output<ReturnType<typeof newProjectSchema>>

/** Ámbitos del formulario (campos repetidos), descartando las filas totalmente vacías. */
export function opportunitiesFromForm(names: unknown[], descriptions: unknown[]): { nombre: string; descripcion: string }[] {
  return names
    .map((name, i) => ({ nombre: String(name ?? ''), descripcion: String(descriptions[i] ?? '') }))
    .filter((o) => o.nombre.trim() !== '' || o.descripcion.trim() !== '')
}

/** Edición de un proyecto: todos los estados, ámbitos existentes (con id) y nuevos (id vacío). */
export function editProjectSchema(today: string, originalExpected: string | null) {
  const minDate = originalExpected && originalExpected < today ? originalExpected : today
  return z.object({
    titulo: text(160).min(3, 'Escribe un título.'),
    descripcion: text(4000),
    tipo: text(40),
    territorio: territory,
    estado: z.enum(EDIT_PROJECT_STATUSES).default('en_preparacion'),
    fecha_prevista: optionalIsoDate.refine((v) => !v || v >= minDate, 'La fecha prevista no puede ser anterior a hoy.'),
    ambitos: z
      .array(
        z.object({
          id: z.string().trim().regex(/^[A-Za-z0-9_.-]{0,64}$/, 'Ámbito no válido.'),
          nombre: text(80).min(2, 'Cada ámbito necesita un nombre.'),
          descripcion: text(1000),
          estado: z.enum(EDIT_OPPORTUNITY_STATUSES).default('abierta'),
        }),
      )
      .min(1, 'Deja al menos un ámbito en el que se pueda participar.')
      .max(MAX_NEW_OPPORTUNITIES, `Máximo ${MAX_NEW_OPPORTUNITIES} ámbitos.`),
  })
}
export type EditProjectInput = z.output<ReturnType<typeof editProjectSchema>>

/** Ámbitos del formulario de edición (campos repetidos), descartando las filas nuevas totalmente vacías. */
export function editedOpportunitiesFromForm(ids: unknown[], names: unknown[], descriptions: unknown[], states: unknown[]) {
  return names
    .map((name, i) => ({
      id: String(ids[i] ?? ''),
      nombre: String(name ?? ''),
      descripcion: String(descriptions[i] ?? ''),
      estado: String(states[i] ?? '') || undefined,
    }))
    .filter((o) => o.id !== '' || o.nombre.trim() !== '' || o.descripcion.trim() !== '')
}

export function projectEditRecord(input: EditProjectInput): SheetRecord {
  return {
    titulo: input.titulo,
    descripcion: input.descripcion,
    tipo: input.tipo,
    territorio: TERRITORY_LABEL[input.territorio],
    estado: input.estado,
    fecha_prevista: sheetDate(input.fecha_prevista),
  }
}

/**
 * Qué hay que escribir en OPORTUNIDADES al editar los ámbitos de un proyecto:
 * - los que siguen: nombre, descripción y estado;
 * - los que se han quitado: visible = no (no se borran, para no perder a quien ya se apuntó);
 * - los nuevos: filas nuevas con ids libres.
 * `unknownIds` son ids enviados que no pertenecen al proyecto (formulario manipulado o desfasado).
 */
export function planOpportunityChanges(
  projectId: string,
  current: Pick<Opportunity, 'id'>[],
  ambitos: EditProjectInput['ambitos'],
  takenIds: string[],
) {
  const currentIds = new Set(current.map((o) => o.id))
  const keptIds = new Set(ambitos.filter((a) => a.id).map((a) => a.id))
  const unknownIds = [...keptIds].filter((id) => !currentIds.has(id))
  const taken = [...takenIds]
  const updates = [
    ...ambitos.filter((a) => a.id).map((a) => ({ id: a.id, record: { nombre: a.nombre, descripcion: a.descripcion, estado: a.estado } as SheetRecord })),
    ...current.filter((o) => !keptIds.has(o.id)).map((o) => ({ id: o.id, record: { visible: 'no' } as SheetRecord })),
  ]
  const creates: SheetRecord[] = ambitos
    .filter((a) => !a.id)
    .map((a) => {
      const id = nextId('OP-', taken)
      taken.push(id)
      return { id, proyecto_id: projectId, nombre: a.nombre, descripcion: a.descripcion, fecha_limite: '', estado: a.estado, visible: 'sí' }
    })
  return { updates, creates, unknownIds }
}

/** Siguiente id libre con el patrón del Sheet: ACT-031 → ACT-032. Ignora ids con otro formato. */
export function nextId(prefix: string, existing: Iterable<string>): string {
  const taken = new Set([...existing].map((id) => id.trim().toUpperCase()))
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`, 'i')
  let max = 0
  for (const id of taken) {
    const m = pattern.exec(id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  let n = max + 1
  while (taken.has(`${prefix}${String(n).padStart(3, '0')}`.toUpperCase())) n++
  return `${prefix}${String(n).padStart(3, '0')}`
}

/** YYYY-MM-DD → DD/MM/YYYY, el formato habitual del Sheet. */
export function sheetDate(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const TERRITORY_LABEL: Record<TerritoryId, string> = { euskadi: 'Euskadi', alava: 'Álava', bizkaia: 'Bizkaia', gipuzkoa: 'Gipuzkoa' }

export type SheetRecord = Record<string, string>

export function activityRecord(id: string, input: NewActivityInput): SheetRecord {
  return {
    id,
    titulo: input.titulo,
    descripcion: input.descripcion,
    territorio: TERRITORY_LABEL[input.territorio],
    fecha: sheetDate(input.fecha),
    hora: input.hora ?? '',
    lugar: input.lugar,
    plazas: input.plazas ? String(input.plazas) : '',
    inscripcion_inicio: '',
    inscripcion_fin: sheetDate(input.inscripcion_fin),
    estado: input.estado,
    visible: 'sí',
    destacado: 'no',
  }
}

/**
 * Columnas que cambia una edición. Se conservan las que el formulario no muestra
 * (inscripcion_inicio, visible, destacado) y, si no se ha tocado, el cierre de inscripción original
 * (puede llevar una hora distinta de 23:59).
 */
export function activityEditRecord(input: NewActivityInput, original: { closesOnDate: string | null }): SheetRecord {
  const record = activityRecord('', input)
  for (const key of ['id', 'inscripcion_inicio', 'visible', 'destacado']) delete record[key]
  if (input.inscripcion_fin === original.closesOnDate) delete record.inscripcion_fin
  return record
}

export function projectRecords(
  ids: { project: string; opportunities: string[] },
  input: NewProjectInput,
  today: string,
): { project: SheetRecord; opportunities: SheetRecord[] } {
  return {
    project: {
      id: ids.project,
      titulo: input.titulo,
      descripcion: input.descripcion,
      tipo: input.tipo,
      territorio: TERRITORY_LABEL[input.territorio],
      estado: input.estado,
      fecha_inicio: sheetDate(today),
      fecha_prevista: sheetDate(input.fecha_prevista),
      visible: 'sí',
      destacado: 'no',
    },
    opportunities: input.ambitos.map((o, i) => ({
      id: ids.opportunities[i]!,
      proyecto_id: ids.project,
      nombre: o.nombre,
      descripcion: o.descripcion,
      fecha_limite: '',
      estado: 'abierta',
      visible: 'sí',
    })),
  }
}
