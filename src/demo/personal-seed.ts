import type { TerritoryId } from '@/lib/domain/territories'
import type { ManagedPerson } from '@/lib/domain/types'

/*
 * DATOS DEMO — actividad de "otros afiliados" (agregada) y estado inicial del usuario demo.
 * Los nombres son ficticios y solo se muestran a perfiles de dirección.
 */

/** Inscritos de otras personas por actividad. */
export const DEMO_OTHER_REGISTRATIONS: Record<string, number> = {
  'ACT-031': 61,
  'ACT-032': 14,
  'ACT-033': 9,
  'ACT-034': 0,
  'ACT-035': 7,
  'ACT-036': 11,
  'ACT-037': 16,
  'ACT-039': 18,
  'ACT-040': 32,
  'ACT-042': 4,
  'ACT-030': 87,
  'ACT-029': 38,
}

/** Personas ofrecidas por otros afiliados en cada oportunidad. */
export const DEMO_OTHER_PARTICIPATIONS: Record<string, number> = {
  'OP-DEB-1': 2,
  'OP-29N-1': 14,
  'OP-29N-2': 9,
  'OP-29N-3': 21,
  'OP-29N-4': 3,
  'OP-29N-5': 6,
  'OP-29N-6': 5,
  'OP-001': 6,
  'OP-002': 2,
  'OP-003': 2,
  'OP-004': 1,
  'OP-006': 9,
  'OP-007': 2,
  'OP-008': 1,
  'OP-011': 3,
  'OP-013': 1,
  'OP-014': 2,
  'OP-015': 1,
}

/** Estado inicial de cada usuario demo, para que el perfil no aparezca vacío. */
export const DEMO_INITIAL_STATE: Record<string, { registrations: string[]; participations: Record<string, string[]>; saved: string[] }> = {
  default: { registrations: ['ACT-031', 'ACT-036', 'ACT-030'], participations: { 'PRY-002': ['OP-006'] }, saved: ['DOC-001', 'DOC-005'] },
}

const FAKE_NAMES = [
  'Ainhoa M.', 'Unai L.', 'Leire S.', 'Mikel A.', 'Nerea G.', 'Asier P.', 'Irati V.', 'Gorka R.', 'Amaia T.', 'Xabier E.',
  'June O.', 'Aitor B.', 'Maialen C.', 'Oier F.', 'Garazi H.', 'Ibai K.',
]

export function demoPeople(count: number, territory: TerritoryId, opportunityIds?: string[]): ManagedPerson[] {
  return Array.from({ length: Math.min(count, FAKE_NAMES.length) }, (_, i) => ({
    displayName: FAKE_NAMES[i] ?? `Afiliado ${i + 1}`,
    territory,
    createdAt: new Date(Date.now() - (i + 1) * 36e5 * 7).toISOString(),
    opportunityIds: opportunityIds ? [opportunityIds[i % opportunityIds.length] ?? ''] : undefined,
  }))
}
