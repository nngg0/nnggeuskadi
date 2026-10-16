/*
 * Acceso con nombre de usuario.
 *
 * Supabase Auth solo entiende emails, así que cada usuario se guarda como
 * `usuario@usuarios.nnggeuskadi.vercel.app`: una dirección que nunca recibe correo.
 * Las cuentas antiguas siguen usando su email real.
 */

export const USERNAME_DOMAIN = 'usuarios.nnggeuskadi.vercel.app'
export const USERNAME_MIN = 3
export const USERNAME_MAX = 30

/** Minúsculas sin tildes, números, `.`, `_` y `-`. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/

export const USERNAME_HINT = 'De 3 a 30 caracteres: minúsculas sin tildes, números, punto, guion bajo o guion.'

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value)
}

/** `ane.ruiz` → `ane.ruiz@usuarios.nnggeuskadi.vercel.app`. Lanza si el usuario no es válido. */
export function usernameToEmail(username: string): string {
  const normalized = normalizeUsername(username)
  if (!isValidUsername(normalized)) throw new Error(`Nombre de usuario no válido: ${username}`)
  return `${normalized}@${USERNAME_DOMAIN}`
}

/** Devuelve el usuario si el email es una dirección de usuario; si no (email antiguo), `null`. */
export function usernameFromEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  const suffix = `@${USERNAME_DOMAIN}`
  if (!normalized.endsWith(suffix)) return null
  const username = normalized.slice(0, -suffix.length)
  return isValidUsername(username) ? username : null
}

/** Lo que se enseña de una cuenta: el usuario, o el email si es una cuenta antigua. */
export function accountLabel(email: string | null | undefined): string {
  return usernameFromEmail(email) ?? email ?? ''
}

/**
 * Lo que escribe la persona en «Usuario» → email de Supabase Auth.
 * Si lleva @ es el email de una cuenta antigua. `null` si no es válido.
 */
export function loginIdentifierToEmail(identifier: string): string | null {
  const value = identifier.trim().toLowerCase()
  if (!value) return null
  if (value.includes('@')) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= 254 ? value : null
  return isValidUsername(value) ? `${value}@${USERNAME_DOMAIN}` : null
}
