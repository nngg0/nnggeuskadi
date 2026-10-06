import { describe, expect, it } from 'vitest'
import { destinationAfterHash, parseAuthHash } from '@/lib/auth/hash'

describe('enlaces de invitación y recuperación', () => {
  it('lee la sesión del fragmento', () => {
    expect(parseAuthHash('#access_token=aaa&refresh_token=bbb&expires_in=3600&type=invite')).toEqual({
      kind: 'session',
      accessToken: 'aaa',
      refreshToken: 'bbb',
      type: 'invite',
    })
  })

  it('detecta enlaces caducados', () => {
    expect(parseAuthHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid')).toEqual({
      kind: 'error',
      description: 'Email link is invalid',
    })
  })

  it('ignora fragmentos que no son de autenticación', () => {
    expect(parseAuthHash('#proximamente')).toBeNull()
    expect(parseAuthHash('')).toBeNull()
  })

  it('tras invitar o recuperar, lleva a elegir contraseña', () => {
    expect(destinationAfterHash('invite')).toBe('/actualizar-clave')
    expect(destinationAfterHash('recovery')).toBe('/actualizar-clave')
    expect(destinationAfterHash('magiclink')).toBe('/')
  })
})
