'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { submitAccessRequest } from '@/lib/access/request-access'
import { can } from '@/lib/auth/permissions'
import { normalizeUsername, USERNAME_HINT, USERNAME_PATTERN } from '@/lib/auth/username'
import { TERRITORY_IDS } from '@/lib/domain/territories'
import { USER_ROLES, type ActionResult } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'
import { actionUser, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

const requestSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Escribe tu nombre.')
      .max(80, 'El nombre es demasiado largo.')
      .refine((v) => !/[<>]/.test(v), 'El nombre contiene caracteres no permitidos.'),
    username: z
      .string()
      .transform(normalizeUsername)
      .pipe(z.string().regex(USERNAME_PATTERN, `Nombre de usuario no válido. ${USERNAME_HINT}`)),
    password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(200),
    confirm: z.string(),
    // Campo trampa para bots: los humanos no lo ven ni lo rellenan.
    website: z.string().max(0).optional(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Las contraseñas no coinciden.' })

/** Pública: no requiere sesión. */
export async function requestAccess(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = requestSchema.safeParse({
    displayName: formData.get('displayName'),
    username: formData.get('username') ?? '',
    password: formData.get('password'),
    confirm: formData.get('confirm'),
    website: formData.get('website') ?? '',
  })
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Revisa los datos.')
  try {
    const outcome = await submitAccessRequest(input.data)
    if (outcome === 'taken') return failure('Ese nombre de usuario ya existe. Elige otro.')
    return success(
      outcome === 'member'
        ? 'Tu cuenta ya estaba autorizada: ya puedes entrar con tu usuario y la contraseña que acabas de elegir.'
        : 'Solicitud enviada. Cuando la aprueben podrás entrar con tu usuario y la contraseña que acabas de elegir.',
    )
  } catch (error) {
    console.error('[solicitar acceso]', error)
    return failure('No hemos podido registrar la solicitud. Inténtalo de nuevo en unos minutos.')
  }
}

const idSchema = z.uuid()
const roleSchema = z.enum(USER_ROLES)

const territorySchema = z.enum(TERRITORY_IDS)

export async function approveAccessRequest(id: string, role: string, territory: string): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  if (!can(user, 'members.approve')) return failure('Solo Administración puede aprobar solicitudes.')
  const parsedId = idSchema.safeParse(id)
  const parsedRole = roleSchema.safeParse(role)
  const parsedTerritory = territorySchema.safeParse(territory)
  if (!parsedTerritory.success) return failure('Elige su territorio.')
  if (!parsedId.success || !parsedRole.success) return failure('Datos no válidos.')
  try {
    await personalStore().approveAccessRequest(parsedId.data, parsedRole.data, parsedTerritory.data)
    revalidatePath('/', 'layout')
    return success('Solicitud aprobada. Ya puede entrar.')
  } catch (error) {
    console.error('[aprobar solicitud]', error)
    const message = error instanceof Error && /provincial_needs_province/.test(error.message)
      ? 'La dirección provincial necesita un territorio provincial (no Euskadi).'
      : UNEXPECTED.message
    return failure(message)
  }
}

export async function rejectAccessRequest(id: string): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  if (!can(user, 'members.approve')) return failure('Solo Administración puede rechazar solicitudes.')
  const parsedId = idSchema.safeParse(id)
  if (!parsedId.success) return failure('Datos no válidos.')
  try {
    await personalStore().rejectAccessRequest(parsedId.data)
    revalidatePath('/', 'layout')
    return success('Solicitud rechazada.')
  } catch (error) {
    console.error('[rechazar solicitud]', error)
    return UNEXPECTED
  }
}
