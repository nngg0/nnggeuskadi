import { describe, expect, it } from 'vitest'
import { can, canListMembers, managedTerritories } from '@/lib/auth/permissions'

describe('permisos', () => {
  const afiliado = { role: 'afiliado' as const, territory: 'alava' as const }
  const bizkaia = { role: 'direccion_provincial' as const, territory: 'bizkaia' as const }
  const euskadi = { role: 'direccion_euskadi' as const, territory: 'euskadi' as const }

  it('todos los afiliados pueden leer, inscribirse, participar y guardar', () => {
    for (const p of ['content.read', 'activity.register', 'project.participate', 'document.save', 'profile.edit'] as const) {
      expect(can(afiliado, p)).toBe(true)
    }
  })

  it('un afiliado nunca ve listados nominales', () => {
    expect(can(afiliado, 'manage.viewPeople', { territory: 'alava' })).toBe(false)
  })

  it('la dirección provincial solo gestiona su territorio', () => {
    expect(can(bizkaia, 'manage.viewPeople', { territory: 'bizkaia' })).toBe(true)
    expect(can(bizkaia, 'manage.viewPeople', { territory: 'alava' })).toBe(false)
    expect(can(bizkaia, 'manage.viewPeople', { territory: 'euskadi' })).toBe(false)
  })

  it('la dirección de Euskadi gestiona el conjunto', () => {
    expect(managedTerritories(euskadi)).toEqual(['euskadi', 'alava', 'bizkaia', 'gipuzkoa'])
    expect(can(euskadi, 'manage.viewPeople', { territory: 'gipuzkoa' })).toBe(true)
  })

  it('sin usuario o sin recurso no hay permiso', () => {
    expect(can(null, 'content.read')).toBe(false)
    expect(can(euskadi, 'manage.viewPeople')).toBe(false)
  })
})

describe('administración', () => {
  it('tiene los permisos de la dirección regional', () => {
    const admin = { role: 'administracion' as const, territory: 'euskadi' as const }
    expect(managedTerritories(admin)).toEqual(['euskadi', 'alava', 'bizkaia', 'gipuzkoa'])
    expect(can(admin, 'manage.viewPeople', { territory: 'alava' })).toBe(true)
    expect(can(admin, 'activity.register')).toBe(true)
  })
})

describe('altas y listado de miembros', () => {
  const admin = { role: 'administracion' as const, territory: 'euskadi' as const }
  const regional = { role: 'direccion_euskadi' as const, territory: 'euskadi' as const }
  const bizkaia = { role: 'direccion_provincial' as const, territory: 'bizkaia' as const }
  const afiliado = { role: 'afiliado' as const, territory: 'alava' as const }

  it('solo Administración aprueba solicitudes', () => {
    expect(can(admin, 'members.approve')).toBe(true)
    expect(can(regional, 'members.approve')).toBe(false)
    expect(can(bizkaia, 'members.approve')).toBe(false)
    expect(can(afiliado, 'members.approve')).toBe(false)
  })

  it('la dirección tiene listado de miembros; los afiliados no', () => {
    expect(canListMembers(admin)).toBe(true)
    expect(canListMembers(regional)).toBe(true)
    expect(canListMembers(bizkaia)).toBe(true)
    expect(managedTerritories(bizkaia)).toEqual(['bizkaia'])
    expect(canListMembers(afiliado)).toBe(false)
    expect(canListMembers(null)).toBe(false)
  })
})
