import { describe, expect, it } from 'vitest'
import { INTERESTS, sanitizeInterests } from '@/lib/domain/interests'

describe('intereses del perfil', () => {
  it('ofrece los 8 temas acordados', () => {
    expect(INTERESTS.map((i) => i.label)).toEqual([
      'Campañas a pie de calle',
      'Inmigración',
      'Seguridad',
      'Justicia y política penitenciaria',
      'Economía y fiscalidad',
      'Vivienda',
      'Debate y oratoria',
      'Organización interna',
    ])
  })

  it('deja como máximo 3, sin repetidos ni valores desconocidos', () => {
    expect(sanitizeInterests(['debate', 'debate', 'astrologia', 'vivienda', 'calle', 'seguridad'])).toEqual([
      'debate',
      'vivienda',
      'calle',
    ])
    expect(sanitizeInterests(null)).toEqual([])
  })
})
