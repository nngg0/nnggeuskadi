export const TERRITORY_IDS = ['euskadi', 'alava', 'bizkaia', 'gipuzkoa'] as const

export type TerritoryId = (typeof TERRITORY_IDS)[number]

/** Cada afiliado pertenece a una provincia: Euskadi no es un territorio de afiliación. */
export const PROVINCE_IDS = ['alava', 'bizkaia', 'gipuzkoa'] as const satisfies readonly TerritoryId[]
export type ProvinceId = (typeof PROVINCE_IDS)[number]

export interface Territory {
  id: TerritoryId
  name: string
  active: boolean
}

/** Nombres por defecto. La hoja TERRITORIOS puede sobrescribirlos o desactivarlos. */
export const DEFAULT_TERRITORIES: Territory[] = [
  { id: 'euskadi', name: 'Euskadi', active: true },
  { id: 'alava', name: 'Álava', active: true },
  { id: 'bizkaia', name: 'Bizkaia', active: true },
  { id: 'gipuzkoa', name: 'Gipuzkoa', active: true },
]

const ALIASES: Record<string, TerritoryId> = {
  euskadi: 'euskadi',
  'pais vasco': 'euskadi',
  general: 'euskadi',
  alava: 'alava',
  araba: 'alava',
  'araba/alava': 'alava',
  'alava/araba': 'alava',
  bizkaia: 'bizkaia',
  vizcaya: 'bizkaia',
  gipuzkoa: 'gipuzkoa',
  guipuzcoa: 'gipuzkoa',
}

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Convierte cualquier escritura razonable ("Álava", "ARABA", "alava") en un id válido. */
export function parseTerritory(value: unknown): TerritoryId | null {
  if (typeof value !== 'string') return null
  const key = stripAccents(value).trim().toLowerCase()
  return ALIASES[key] ?? null
}

export function isTerritoryId(value: unknown): value is TerritoryId {
  return typeof value === 'string' && (TERRITORY_IDS as readonly string[]).includes(value)
}

export function territoryName(id: TerritoryId, territories: Territory[] = DEFAULT_TERRITORIES): string {
  return territories.find((t) => t.id === id)?.name ?? DEFAULT_TERRITORIES.find((t) => t.id === id)?.name ?? id
}

/**
 * Prioridad de un contenido para un usuario:
 * 0 = su territorio, 1 = Euskadi (general), 2 = resto de territorios.
 * Personaliza el orden; nunca restringe el acceso.
 */
export function territoryRank(contentTerritory: TerritoryId, userTerritory: TerritoryId): number {
  if (contentTerritory === userTerritory) return 0
  if (contentTerritory === 'euskadi') return 1
  return 2
}

export function isRelevantTo(contentTerritory: TerritoryId, userTerritory: TerritoryId): boolean {
  return territoryRank(contentTerritory, userTerritory) <= 1
}

export type TerritoryFilter = TerritoryId | 'todos'

export function parseTerritoryFilter(value: unknown): TerritoryFilter {
  return isTerritoryId(value) ? value : 'todos'
}

export function matchesTerritoryFilter(territory: TerritoryId, filter: TerritoryFilter): boolean {
  return filter === 'todos' || territory === filter
}
