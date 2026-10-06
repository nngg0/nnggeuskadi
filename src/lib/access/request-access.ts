import 'server-only'
import { isDemoMode } from '@/lib/config/mode'
import type { TerritoryId } from '@/lib/domain/territories'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface AccessRequestInput {
  displayName: string
  email: string
  territory: TerritoryId
  password: string
}

/**
 * "Solicitar acceso": crea la cuenta (sin perfil, por tanto sin acceso) y registra la solicitud
 * para que Administración la apruebe. Nunca revela si un email ya tenía cuenta.
 *
 * - 'pending': solicitud registrada.
 * - 'member': el email ya estaba autorizado; puede entrar directamente.
 */
export async function submitAccessRequest(input: AccessRequestInput): Promise<'pending' | 'member'> {
  if (isDemoMode) return 'pending'
  const admin = createSupabaseAdminClient()
  const email = input.email.toLowerCase()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    // Sin servidor de correo propio no se puede verificar el email: lo valida Administración al aprobar.
    email_confirm: true,
  })
  if (error || !data.user) {
    // Normalmente: ya existe una cuenta con ese email. Misma respuesta para no revelarlo.
    console.warn('[solicitar acceso]', error?.message)
    return 'pending'
  }

  // Si el email ya estaba en la lista de alta, el trigger le ha creado el perfil: ya es miembro.
  const { data: profile } = await admin.from('profiles').select('id').eq('id', data.user.id).maybeSingle()
  if (profile) return 'member'

  const { error: insertError } = await admin.from('access_requests').insert({
    user_id: data.user.id,
    email,
    display_name: input.displayName,
    territory: input.territory,
  })
  if (insertError) {
    // Sin solicitud la cuenta quedaría huérfana: se deshace.
    await admin.auth.admin.deleteUser(data.user.id)
    throw new Error(`No se pudo registrar la solicitud: ${insertError.message}`)
  }
  return 'pending'
}
