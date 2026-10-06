/**
 * Enlaces de email de Supabase (invitación, recuperación) en flujo implícito:
 * la sesión llega en el fragmento de la URL (#access_token=…&refresh_token=…&type=invite),
 * que el servidor nunca ve. Esta función lo interpreta en el navegador.
 */
export type AuthHashResult =
  | { kind: 'session'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'error'; description: string }
  | null

export function parseAuthHash(hash: string): AuthHashResult {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const error = params.get('error_description') ?? params.get('error')
  if (error) return { kind: 'error', description: error.replace(/\+/g, ' ') }
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null
  return { kind: 'session', accessToken, refreshToken, type: params.get('type') }
}

/** Tras una invitación o recuperación, la persona debe elegir contraseña. */
export function destinationAfterHash(type: string | null): string {
  return type === 'invite' || type === 'recovery' || type === 'signup' ? '/actualizar-clave' : '/'
}
