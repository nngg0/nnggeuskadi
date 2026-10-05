import type { CurrentUser } from '@/lib/domain/types'

/*
 * DATOS DEMO — usuarios ficticios para recorrer la aplicación sin Supabase.
 * Permiten probar los tres roles y la personalización por territorio.
 */
export const DEMO_USERS: CurrentUser[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'ane.demo@nngg.example',
    displayName: 'Ane Ruiz',
    territory: 'alava',
    role: 'afiliado',
    settings: { notifyNewInitiatives: true },
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'iker.demo@nngg.example',
    displayName: 'Iker Etxebarria',
    territory: 'bizkaia',
    role: 'afiliado',
    settings: { notifyNewInitiatives: false },
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'maite.demo@nngg.example',
    displayName: 'Maite Goñi',
    territory: 'gipuzkoa',
    role: 'afiliado',
    settings: { notifyNewInitiatives: true },
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'direccion.bizkaia@nngg.example',
    displayName: 'Jon Arana',
    territory: 'bizkaia',
    role: 'direccion_provincial',
    settings: { notifyNewInitiatives: true },
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    email: 'direccion.euskadi@nngg.example',
    displayName: 'Laura Ibarra',
    territory: 'euskadi',
    role: 'direccion_euskadi',
    settings: { notifyNewInitiatives: true },
  },
]

export function findDemoUser(id: string | undefined): CurrentUser | null {
  return DEMO_USERS.find((u) => u.id === id) ?? null
}
