/** Temas de interés que cada afiliado puede marcar en su perfil (máximo 3). */
export const INTERESTS = [
  { id: 'calle', label: 'Campañas a pie de calle' },
  { id: 'inmigracion', label: 'Inmigración' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'justicia', label: 'Justicia y política penitenciaria' },
  { id: 'economia', label: 'Economía y fiscalidad' },
  { id: 'vivienda', label: 'Vivienda' },
  { id: 'debate', label: 'Debate y oratoria' },
  { id: 'organizacion', label: 'Organización interna' },
] as const

export type InterestId = (typeof INTERESTS)[number]['id']

export const INTEREST_IDS = INTERESTS.map((i) => i.id) as InterestId[]
export const MAX_INTERESTS = 3

export function isInterestId(value: unknown): value is InterestId {
  return typeof value === 'string' && (INTEREST_IDS as string[]).includes(value)
}

/** Limpia una lista: solo valores conocidos, sin repetidos y como máximo 3. */
export function sanitizeInterests(values: unknown): InterestId[] {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter(isInterestId))].slice(0, MAX_INTERESTS)
}

export function interestLabel(id: InterestId): string {
  return INTERESTS.find((i) => i.id === id)?.label ?? id
}
