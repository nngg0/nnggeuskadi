'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { can } from '@/lib/auth/permissions'
import type { ActionResult } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'
import { actionUser, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(80, 'El nombre es demasiado largo.')
    .refine((v) => !/[<>]/.test(v), 'El nombre contiene caracteres no permitidos.'),
  notifyNewInitiatives: z.boolean(),
})

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  if (!can(user, 'profile.edit')) return failure('No tienes permiso para editar el perfil.')
  const input = profileSchema.safeParse({
    displayName: formData.get('displayName'),
    notifyNewInitiatives: formData.get('notifyNewInitiatives') === 'on',
  })
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Datos no válidos.')
  try {
    await personalStore().updateProfile(user.id, {
      displayName: input.data.displayName,
      settings: { notifyNewInitiatives: input.data.notifyNewInitiatives },
    })
    revalidatePath('/', 'layout')
    return success('Cambios guardados.')
  } catch (error) {
    console.error('[perfil]', error)
    return UNEXPECTED
  }
}
