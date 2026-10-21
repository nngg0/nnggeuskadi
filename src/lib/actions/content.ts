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
  newActivitySchema,
  newProjectSchema,
  nextId,
  opportunitiesFromForm,
  projectRecords,
} from '@/lib/domain/new-content'
import type { ActionResult } from '@/lib/domain/types'
import { SHEETS_CACHE_TAG } from '@/lib/sheets/client'
import { idsOf } from '@/lib/sheets/rows'
import { actionUser, contentIdSchema, failure, NOT_AUTHENTICATED, UNEXPECTED } from './helpers'

/*
 * Alta de actos y proyectos desde la web (botón «+» de Actos y Proyectos) y edición de actos.
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
})
const FORBIDDEN = failure('No puedes crear ni editar contenido en ese territorio.')

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
    return UNEXPECTED
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
    return UNEXPECTED
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
