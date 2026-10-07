'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isDemoMode } from '@/lib/config/mode'
import { siteUrl } from '@/lib/config/env'
import type { ActionResult } from '@/lib/domain/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loginIdentifierToEmail, usernameFromEmail } from '@/lib/auth/username'
import { findDemoUser } from '@/demo/users'
import { DEMO_SESSION_COOKIE } from '@/demo/session'
import { failure, success } from './helpers'

const credentialsSchema = z.object({
  // Nombre de usuario; las cuentas antiguas pueden seguir escribiendo su email.
  username: z.string().trim().min(1, 'Introduce tu nombre de usuario.').max(254),
  password: z.string().min(1, 'Introduce tu contraseña.').max(200),
})

/** Solo permite volver a rutas internas (evita redirecciones abiertas). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '/'
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (isDemoMode) return failure('En modo demo elige uno de los usuarios de ejemplo.')
  const input = credentialsSchema.safeParse({ username: formData.get('username'), password: formData.get('password') })
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Datos no válidos.')
  const invalid = 'Usuario o contraseña incorrectos.'
  const email = loginIdentifierToEmail(input.data.username)
  if (!email) return failure(invalid)
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: input.data.password })
  if (error) {
    // Mensaje genérico: no revelar si la cuenta existe.
    return failure(invalid)
  }
  redirect(safeNext(formData.get('next')))
}

export async function signInDemo(formData: FormData): Promise<void> {
  if (!isDemoMode) redirect('/login')
  const user = findDemoUser(String(formData.get('userId') ?? ''))
  if (!user) redirect('/login')
  ;(await cookies()).set(DEMO_SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  redirect(safeNext(formData.get('next')))
}

export async function signOut(): Promise<void> {
  if (isDemoMode) {
    const store = await cookies()
    store.delete(DEMO_SESSION_COOKIE)
    store.delete('nngg_demo_state')
  } else {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  }
  redirect('/login')
}

export async function requestPasswordReset(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const value = formData.get('email')
  const raw = typeof value === 'string' ? value.trim() : ''
  // Las cuentas con nombre de usuario no tienen buzón: la contraseña la restablece Administración.
  if (raw && (!raw.includes('@') || usernameFromEmail(raw))) {
    return failure('Si entras con nombre de usuario, pide a Administración que te restablezca la contraseña.')
  }
  const email = z.email('Introduce un email válido.').max(254).safeParse(raw)
  if (!email.success) return failure(email.error.issues[0]?.message ?? 'Email no válido.')
  const message = 'Si el email corresponde a un afiliado, recibirás un enlace para recuperar el acceso.'
  if (isDemoMode) return success(message)
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/actualizar-clave`,
  })
  if (error) console.error('[recuperar acceso]', error.message)
  // Misma respuesta exista o no la cuenta.
  return success(message)
}

const passwordSchema = z
  .object({
    password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Las contraseñas no coinciden.' })

export async function updatePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (isDemoMode) return failure('En modo demo no hay contraseñas.')
  const input = passwordSchema.safeParse({ password: formData.get('password'), confirm: formData.get('confirm') })
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Datos no válidos.')
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return failure('El enlace ha caducado. Solicita uno nuevo.')
  const { error } = await supabase.auth.updateUser({ password: input.data.password })
  if (error) return failure('No hemos podido actualizar la contraseña. Prueba con otra distinta.')
  redirect('/')
}
