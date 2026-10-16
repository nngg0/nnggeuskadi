'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { can } from '@/lib/auth/permissions'
import { contentWriter } from '@/lib/content/writer'
import { madridDate } from '@/lib/domain/dates'
import {
  activityRecord,
  newActivitySchema,
  newProjectSchema,
  nextId,
  opportunitiesFromForm,
  projectRecords,
} from '@/lib/domain/new-content'
import type { ActionResult } from '@/lib/domain/types'
import { SHEETS_CACHE_TAG } from '@/lib/sheets/client'
import { idsOf } from '@/lib/sheets/rows'
import { actionUser, failure, NOT_AUTHENTICATED, UNEXPECTED } from './helpers'

/*
 * Alta de actividades y proyectos desde la web (botón «+» de Calendario y Participa).
 * Administración y dirección regional crean en cualquier territorio; la dirección provincial, solo en el suyo.
 * El permiso se comprueba aquí, con el territorio enviado, aunque el formulario solo ofrezca los permitidos.
 */

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '')
const FORBIDDEN = failure('No puedes crear contenido en ese territorio.')

function refreshContent() {
  updateTag(SHEETS_CACHE_TAG)
  revalidatePath('/', 'layout')
}

export async function createActivity(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const today = madridDate(new Date())
  const input = newActivitySchema(today).safeParse({
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
