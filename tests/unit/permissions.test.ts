import { describe, expect, it } from 'vitest'
import { can, canListMembers, canSeeActivity, creatableTerritories, managedTerritories } from '@/lib/auth/permissions'

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

describe('alta de actividades y proyectos', () => {
  const admin = { role: 'administracion' as const, territory: 'euskadi' as const }
  const regional = { role: 'direccion_euskadi' as const, territory: 'euskadi' as const }
  const bizkaia = { role: 'direccion_provincial' as const, territory: 'bizkaia' as const }
  const afiliado = { role: 'afiliado' as const, territory: 'alava' as const }

  it('Administración y la dirección regional crean en cualquier territorio', () => {
    for (const user of [admin, regional]) {
      expect(creatableTerritories(user)).toEqual(['euskadi', 'alava', 'bizkaia', 'gipuzkoa'])
      expect(can(user, 'content.create', { territory: 'gipuzkoa' })).toBe(true)
    }
  })

  it('la dirección provincial solo crea en su provincia', () => {
    expect(creatableTerritories(bizkaia)).toEqual(['bizkaia'])
    expect(can(bizkaia, 'content.create', { territory: 'bizkaia' })).toBe(true)
    expect(can(bizkaia, 'content.create', { territory: 'alava' })).toBe(false)
    expect(can(bizkaia, 'content.create', { territory: 'euskadi' })).toBe(false)
  })

  it('un afiliado no crea nada y sin territorio no hay permiso', () => {
    expect(creatableTerritories(afiliado)).toEqual([])
    expect(can(afiliado, 'content.create', { territory: 'alava' })).toBe(false)
    expect(can(admin, 'content.create')).toBe(false)
    expect(creatableTerritories(null)).toEqual([])
  })
})

describe('juntas directivas', () => {
  const junta = (access: 'abierto' | 'cerrado', territory: 'euskadi' | 'bizkaia' = 'euskadi') => ({ kind: 'junta' as const, access, territory })
  const acto = { kind: 'acto' as const, access: 'abierto' as const, territory: 'euskadi' as const }
  const afiliado = { role: 'afiliado' as const, territory: 'alava' as const, junta: false }
  const deLaJunta = { role: 'afiliado' as const, territory: 'alava' as const, junta: true }
  const bizkaia = { role: 'direccion_provincial' as const, territory: 'bizkaia' as const, junta: false }
  const regional = { role: 'direccion_euskadi' as const, territory: 'euskadi' as const, junta: false }

  it('los actos y las juntas abiertas los ve todo el mundo', () => {
    expect(canSeeActivity(afiliado, acto)).toBe(true)
    expect(canSeeActivity(afiliado, junta('abierto'))).toBe(true)
  })

  it('las juntas cerradas solo la Junta Directiva y quien puede editarlas', () => {
    expect(canSeeActivity(afiliado, junta('cerrado'))).toBe(false)
    expect(canSeeActivity(null, junta('cerrado'))).toBe(false)
    expect(canSeeActivity(deLaJunta, junta('cerrado'))).toBe(true)
    expect(canSeeActivity(regional, junta('cerrado'))).toBe(true)
    expect(canSeeActivity(bizkaia, junta('cerrado'))).toBe(false)
    expect(canSeeActivity(bizkaia, junta('cerrado', 'bizkaia'))).toBe(true)
  })

  it('marcan la Junta Directiva Administración y la regional', () => {
    expect(can({ role: 'administracion', territory: 'euskadi' }, 'members.setJunta')).toBe(true)
    expect(can(regional, 'members.setJunta')).toBe(true)
    expect(can(bizkaia, 'members.setJunta')).toBe(false)
    expect(can(afiliado, 'members.setJunta')).toBe(false)
  })
})
