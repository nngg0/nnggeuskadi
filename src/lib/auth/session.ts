import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isDemoMode } from '@/lib/config/mode'
import { sanitizeInterests } from '@/lib/domain/interests'
import { isTerritoryId } from '@/lib/domain/territories'
import { USER_ROLES, type CurrentUser, type UserRole } from '@/lib/domain/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { findDemoUser } from '@/demo/users'
import { DEMO_SESSION_COOKIE } from '@/demo/session'
import { demoProfileOverrides } from '@/demo/personal-store'

export type SessionState =
  | { status: 'anonymous' }
  /** Autenticado pero sin perfil autorizado (no está en la lista de alta). */
  | { status: 'pending'; email: string }
  | { status: 'member'; user: CurrentUser }

function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

async function demoSession(): Promise<SessionState> {
  const id = (await cookies()).get(DEMO_SESSION_COOKIE)?.value
  const user = findDemoUser(id)
  if (!user) return { status: 'anonymous' }
  const overrides = await demoProfileOverrides(user.id)
  return {
    status: 'member',
    user: {
      ...user,
      displayName: overrides.displayName ?? user.displayName,
      settings: overrides.settings ?? user.settings,
      interests: overrides.interests ?? user.interests,
    },
  }
}

async function supabaseSession(): Promise<SessionState> {
  const supabase = await createSupabaseServerClient()
  // getUser() valida el token contra Supabase Auth.
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { status: 'anonymous' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, territory, role, settings, interests')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile || !isTerritoryId(profile.territory) || !isRole(profile.role)) {
    return { status: 'pending', email: data.user.email ?? '' }
  }
  const settings = (profile.settings ?? {}) as Record<string, unknown>
  return {
    status: 'member',
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      displayName: String(profile.display_name),
      territory: profile.territory,
      role: profile.role,
      settings: { notifyNewInitiatives: settings.notifyNewInitiatives !== false },
      interests: sanitizeInterests(profile.interests),
    },
  }
}

/** Sesión de la petición actual (memorizada por petición). */
export const getSession = cache(async (): Promise<SessionState> => (isDemoMode ? demoSession() : supabaseSession()))

/** Exige un afiliado autorizado. Redirige a login o a "acceso pendiente" si no lo es. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession()
  if (session.status === 'anonymous') redirect('/login')
  if (session.status === 'pending') redirect('/acceso-pendiente')
  return session.user
}
