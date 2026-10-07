import 'server-only'
import { usernameToEmail } from '@/lib/auth/username'
import { isDemoMode } from '@/lib/config/mode'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface AccessRequestInput {
  displayName: string
  username: string
  password: string
}

/** Errores de `createUser` que significan «ya hay una cuenta con ese email». */
const ALREADY_EXISTS_CODES = new Set(['email_exists', 'user_already_exists', 'identity_already_exists'])

function isAlreadyRegistered(error: { code?: string; message?: string }): boolean {
  if (error.code && ALREADY_EXISTS_CODES.has(error.code)) return true
  return /already (been )?registered|already exists/i.test(error.message ?? '')
}

/**
 * "Solicitar acceso": crea la cuenta (sin perfil, por tanto sin acceso) y registra la solicitud
 * para que Administración la apruebe.
 *
 * - 'pending': solicitud registrada.
 * - 'member': la cuenta ya estaba autorizada; puede entrar directamente.
 * - 'taken': ese nombre de usuario ya existe.
 *
 * Cualquier otro error se lanza: no se responde «solicitud enviada» si no se ha registrado.
 */
export async function submitAccessRequest(input: AccessRequestInput): Promise<'pending' | 'member' | 'taken'> {
  if (isDemoMode) return 'pending'
  const admin = createSupabaseAdminClient()
  const email = usernameToEmail(input.username)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    // La dirección nunca recibe correo: la valida Administración al aprobar.
    email_confirm: true,
  })
  if (error) {
    if (isAlreadyRegistered(error)) return 'taken'
    throw new Error(`No se pudo crear la cuenta: ${error.message}`)
  }
  if (!data.user) throw new Error('No se pudo crear la cuenta: respuesta sin usuario')

  // Si la cuenta ya estaba en la lista de alta, el trigger le ha creado el perfil: ya es miembro.
  const { data: profile } = await admin.from('profiles').select('id').eq('id', data.user.id).maybeSingle()
  if (profile) return 'member'

  const { error: insertError } = await admin.from('access_requests').insert({
    user_id: data.user.id,
    email,
    display_name: input.displayName,
    // El territorio lo elige Administración al aprobar.
  })
  if (insertError) {
    // Sin solicitud la cuenta quedaría huérfana: se deshace.
    await admin.auth.admin.deleteUser(data.user.id)
    throw new Error(`No se pudo registrar la solicitud: ${insertError.message}`)
  }
  return 'pending'
}
