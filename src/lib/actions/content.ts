'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { can } from '@/lib/auth/permissions'
import { getContent } from '@/lib/content/source'
import { contentWriter } from '@/lib/content/writer'
import { madridDate } from '@/lib/domain/dates'
import {
  activityEditRecord,
  activityRecord,
  editActivitySchema,
  editedOpportunitiesFromForm,
  editProjectSchema,
  newActivitySchema,
  newProjectSchema,
  nextId,
  opportunitiesFromForm,
  planOpportunityChanges,
  projectEditRecord,
  projectRecords,
} from '@/lib/domain/new-content'
import type { ActionResult } from '@/lib/domain/types'
import { SHEETS_CACHE_TAG } from '@/lib/sheets/client'
import { idsOf } from '@/lib/sheets/rows'
import { actionUser, contentIdSchema, failure, NOT_AUTHENTICATED, UNEXPECTED } from './helpers'

/*
 * Alta de actos y proyectos desde la web (botón «+» de Actos y Proyectos) y edición de actos y proyectos.
 * Administración y dirección regional crean y editan en cualquier territorio; la dirección provincial, solo en el suyo.
 * El permiso se comprueba aquí, con el territorio enviado, aunque el formulario solo ofrezca los permitidos.
 */

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '')
const activityFields = (formData: FormData) => ({
  titulo: field(formData, 'titulo'),
  descripcion: field(formData, 'descripcion'),
  territorio: field(formData, 'territorio'),
  fecha: field(formData, 'fecha'),
  hora: field(formData, 'hora'),
  lugar: field(formData, 'lugar'),
  plazas: field(formData, 'plazas'),
  inscripcion_fin: field(formData, 'inscripcion_fin'),
  estado: field(formData, 'estado') || undefined,
  tipo: field(formData, 'tipo') || undefined,
  acceso: field(formData, 'acceso') || undefined,
})
const FORBIDDEN = failure('No puedes crear ni editar contenido en ese territorio.')

/** Error de escritura explicado si es por columnas que faltan en el Sheet; si no, el genérico. */
function writeFailure(error: unknown): ActionResult {
  const missing = error instanceof Error ? /Faltan columnas en el Sheet: (.+)$/.exec(error.message)?.[1] : undefined
  return missing ? failure(`Faltan columnas en el Sheet (${missing}). Añádelas en la fila 1 de la pestaña y vuelve a intentarlo.`) : UNEXPECTED
}

function refreshContent() {
  updateTag(SHEETS_CACHE_TAG)
  revalidatePath('/', 'layout')
}

export async function createActivity(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const today = madridDate(new Date())
  const input = newActivitySchema(today).safeParse(activityFields(formData))
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Revisa los datos.')
  if (!can(user, 'content.create', { territory: input.data.territorio })) return FORBIDDEN

  let id: string
  try {
    const writer = contentWriter()
    id = nextId('ACT-', idsOf(await writer.read('ACTIVIDADES')))
    await writer.append('ACTIVIDADES', [activityRecord(id, input.data)])
    console.info(`[alta] ${user.id} creó la actividad ${id} (${input.data.territorio})`)
  } catch (error) {
    console.error('[crear actividad]', error)
    return writeFailure(error)
  }
  refreshContent()
  redirect(input.data.estado === 'borrador' ? '/calendario' : `/actividades/${encodeURIComponent(id)}`)
}

/** Edición de un acto existente. Se usa con `updateActivity.bind(null, id)` en el formulario. */
export async function updateActivity(activityId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const id = contentIdSchema.safeParse(activityId)
  if (!id.success) return failure('Acto no válido.')
  const original = (await getContent()).activities.find((a) => a.id === id.data)
  if (!original) return failure('Este acto ya no existe.')
  // Hace falta permiso sobre el territorio actual del acto y sobre el nuevo.
  if (!can(user, 'content.create', { territory: original.territory })) return failure('No puedes editar actos de ese territorio.')

  const today = madridDate(new Date())
  const input = editActivitySchema(today, original.date).safeParse(activityFields(formData))
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Revisa los datos.')
  if (!can(user, 'content.create', { territory: input.data.territorio })) return FORBIDDEN

  try {
    const closesOnDate = original.registrationClosesAt ? madridDate(new Date(original.registrationClosesAt)) : null
    const updated = await contentWriter().update('ACTIVIDADES', original.id, activityEditRecord(input.data, { closesOnDate }))
    if (!updated) return failure('No hemos encontrado este acto en el Sheet. Puede que lo hayan borrado.')
    console.info(`[edición] ${user.id} editó la actividad ${original.id} (${input.data.territorio})`)
  } catch (error) {
    console.error('[editar actividad]', error)
    return writeFailure(error)
  }
  refreshContent()
  redirect(input.data.estado === 'borrador' ? '/calendario' : `/actividades/${encodeURIComponent(original.id)}`)
}

export async function createProject(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const today = madridDate(new Date())
  const input = newProjectSchema(today).safeParse({
    titulo: field(formData, 'titulo'),
    descripcion: field(formData, 'descripcion'),
    tipo: field(formData, 'tipo'),
    territorio: field(formData, 'territorio'),
    estado: field(formData, 'estado') || undefined,
    fecha_prevista: field(formData, 'fecha_prevista'),
    ambitos: opportunitiesFromForm(formData.getAll('ambito_nombre'), formData.getAll('ambito_descripcion')),
  })
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Revisa los datos.')
  if (!can(user, 'content.create', { territory: input.data.territorio })) return FORBIDDEN

  let projectId: string
  try {
    const writer = contentWriter()
    const [projects, opportunities] = await Promise.all([writer.read('PROYECTOS'), writer.read('OPORTUNIDADES')])
    projectId = nextId('PRY-', idsOf(projects))
    const taken = idsOf(opportunities)
    const opportunityIds = input.data.ambitos.map(() => {
      const next = nextId('OP-', taken)
      taken.push(next)
      return next
    })
    const rows = projectRecords({ project: projectId, opportunities: opportunityIds }, input.data, today)
    // Primero el proyecto: un ámbito sin proyecto se descartaría al leer el Sheet.
    await writer.append('PROYECTOS', [rows.project])
    try {
      await writer.append('OPORTUNIDADES', rows.opportunities)
    } catch (error) {
      console.error('[crear ámbitos]', error)
      refreshContent()
      return failure(`El proyecto ${projectId} se ha creado, pero no sus ámbitos. Añádelos en la pestaña OPORTUNIDADES del Sheet.`)
    }
    console.info(`[alta] ${user.id} creó el proyecto ${projectId} (${input.data.territorio}) con ${opportunityIds.length} ámbito(s)`)
  } catch (error) {
    console.error('[crear proyecto]', error)
    return UNEXPECTED
  }
  refreshContent()
  redirect(`/participa/${encodeURIComponent(projectId)}`)
}

/**
 * Edición de un proyecto y de sus ámbitos. Se usa con `updateProject.bind(null, id)` en el formulario.
 * Los ámbitos quitados se ocultan (visible = no) en lugar de borrarse: quien ya se apuntó lo conserva.
 */
export async function updateProject(projectId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const id = contentIdSchema.safeParse(projectId)
  if (!id.success) return failure('Proyecto no válido.')
  const content = await getContent()
  const original = content.projects.find((p) => p.id === id.data)
  if (!original) return failure('Este proyecto ya no existe.')
  if (!can(user, 'content.create', { territory: original.territory })) return failure('No puedes editar proyectos de ese territorio.')

  const today = madridDate(new Date())
  const input = editProjectSchema(today, original.expectedDate).safeParse({
    titulo: field(formData, 'titulo'),
    descripcion: field(formData, 'descripcion'),
    tipo: field(formData, 'tipo'),
    territorio: field(formData, 'territorio'),
    estado: field(formData, 'estado') || undefined,
    fecha_prevista: field(formData, 'fecha_prevista'),
    ambitos: editedOpportunitiesFromForm(
      formData.getAll('ambito_id'),
      formData.getAll('ambito_nombre'),
      formData.getAll('ambito_descripcion'),
      formData.getAll('ambito_estado'),
    ),
  })
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Revisa los datos.')
  if (!can(user, 'content.create', { territory: input.data.territorio })) return FORBIDDEN

  try {
    const writer = contentWriter()
    const current = content.opportunities.filter((o) => o.projectId === original.id && o.visible)
    const plan = planOpportunityChanges(original.id, current, input.data.ambitos, idsOf(await writer.read('OPORTUNIDADES')))
    if (plan.unknownIds.length > 0) return failure('Los ámbitos han cambiado mientras editabas. Recarga la página y vuelve a intentarlo.')

    if (!(await writer.update('PROYECTOS', original.id, projectEditRecord(input.data)))) {
      return failure('No hemos encontrado este proyecto en el Sheet. Puede que lo hayan borrado.')
    }
    const missing = await writer.updateMany('OPORTUNIDADES', plan.updates)
    if (missing.length > 0) {
      refreshContent()
      return failure('Se ha guardado el proyecto, pero no sus ámbitos: alguno ya no está en el Sheet. Recarga y revísalos.')
    }
    if (plan.creates.length > 0) await writer.append('OPORTUNIDADES', plan.creates)
    console.info(`[edición] ${user.id} editó el proyecto ${original.id} (${input.data.territorio})`)
  } catch (error) {
    console.error('[editar proyecto]', error)
    return UNEXPECTED
  }
  refreshContent()
  redirect(input.data.estado === 'cerrado' ? '/participa' : `/participa/${encodeURIComponent(original.id)}`)
}

/**
 * Borra un acto: elimina su fila de ACTIVIDADES. Mismos permisos que editarlo.
 * Las inscripciones que tuviera se quedan en la base de datos, pero ya no se muestran.
 */
export async function deleteActivity(activityId: string): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const id = contentIdSchema.safeParse(activityId)
  if (!id.success) return failure('Acto no válido.')
  const original = (await getContent()).activities.find((a) => a.id === id.data)
  if (!original) return failure('Este acto ya no existe.')
  if (!can(user, 'content.create', { territory: original.territory })) return failure('No puedes eliminar actos de ese territorio.')
  try {
    if (!(await contentWriter().remove('ACTIVIDADES', original.id))) return failure('Este acto ya no está en el Sheet.')
    console.info(`[borrado] ${user.id} eliminó la actividad ${original.id} (${original.territory})`)
  } catch (error) {
    console.error('[eliminar actividad]', error)
    return UNEXPECTED
  }
  refreshContent()
  redirect('/calendario')
}
