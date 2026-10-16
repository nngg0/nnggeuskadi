import type { CurrentUser } from '@/lib/domain/types'

/*
 * DATOS DEMO — usuarios ficticios para recorrer la aplicación sin Supabase.
 * Permiten probar los tres roles y la personalización por territorio.
 */
export const DEMO_USERS: CurrentUser[] = [
  {
    id: '00000000-0000-4000-8000-000000000005',
    email: 'adrian@usuarios.nnggeuskadi.vercel.app',
    displayName: 'Adrián',
    territory: 'euskadi',
    role: 'direccion_euskadi',
    settings: { notifyNewInitiatives: true },
    interests: ['organizacion', 'economia'],
  },
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'alba@usuarios.nnggeuskadi.vercel.app',
    displayName: 'Alba',
    territory: 'alava',
    role: 'afiliado',
    settings: { notifyNewInitiatives: true },
    interests: ['debate', 'vivienda', 'calle'],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'pablo.folgado@usuarios.nnggeuskadi.vercel.app',
    displayName: 'Pablo Folgado',
    territory: 'bizkaia',
    role: 'afiliado',
    settings: { notifyNewInitiatives: false },
    interests: ['seguridad'],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'miguel@usuarios.nnggeuskadi.vercel.app',
    displayName: 'Miguel',
    territory: 'bizkaia',
    role: 'direccion_provincial',
    settings: { notifyNewInitiatives: true },
    interests: ['calle', 'organizacion'],
  },
]

// Cuenta de Administración para probar la aprobación de solicitudes.
DEMO_USERS.push({
  id: '00000000-0000-4000-8000-000000000006',
  email: 'administracion@usuarios.nnggeuskadi.vercel.app',
  displayName: 'Administración',
  territory: 'euskadi',
  role: 'administracion',
  settings: { notifyNewInitiatives: true },
  interests: [],
})

export function findDemoUser(id: string | undefined): CurrentUser | null {
  return DEMO_USERS.find((u) => u.id === id) ?? null
}
