import 'server-only'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import type { ActionResult, CurrentUser } from '@/lib/domain/types'

export const contentIdSchema = z.string().trim().regex(/^[A-Za-z0-9_.-]{1,64}$/)

export function failure(message: string): ActionResult {
  return { ok: false, message }
}

export function success(message: string): ActionResult {
  return { ok: true, message }
}

/** Usuario autorizado de la acción, o null. Las acciones nunca confían en datos enviados por el cliente sobre el usuario. */
export async function actionUser(): Promise<CurrentUser | null> {
  const session = await getSession()
  return session.status === 'member' ? session.user : null
}

export const NOT_AUTHENTICATED = failure('Tu sesión ha caducado. Vuelve a entrar.')
export const UNEXPECTED = failure('No hemos podido completar la acción. Inténtalo de nuevo en unos segundos.')
