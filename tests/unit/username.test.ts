import { describe, expect, it } from 'vitest'
import {
  accountLabel,
  isValidUsername,
  loginIdentifierToEmail,
  USERNAME_DOMAIN,
  usernameFromEmail,
  usernameToEmail,
} from '@/lib/auth/username'

describe('nombre de usuario', () => {
  it('acepta de 3 a 30 caracteres: minúsculas, números, punto, guion bajo y guion', () => {
    for (const ok of ['ane', 'ane.ruiz', 'ane_ruiz-92', 'a'.repeat(30)]) expect(isValidUsername(ok)).toBe(true)
  })

  it('rechaza mayúsculas, tildes, espacios, @ y longitudes fuera de rango', () => {
    for (const bad of ['an', 'a'.repeat(31), 'Ane', 'iñaki', 'josé', 'ane ruiz', 'ane@x', '', 'ane+1']) {
      expect(isValidUsername(bad)).toBe(false)
    }
  })

  it('se guarda como una dirección del dominio que no recibe correo', () => {
    expect(USERNAME_DOMAIN).toBe('usuarios.nnggeuskadi.vercel.app')
    expect(usernameToEmail('ane.ruiz')).toBe('ane.ruiz@usuarios.nnggeuskadi.vercel.app')
    expect(usernameToEmail('  Ane.Ruiz ')).toBe('ane.ruiz@usuarios.nnggeuskadi.vercel.app')
    expect(() => usernameToEmail('josé')).toThrow()
  })

  it('recupera el usuario solo de las direcciones de usuario', () => {
    expect(usernameFromEmail('ane.ruiz@usuarios.nnggeuskadi.vercel.app')).toBe('ane.ruiz')
    expect(usernameFromEmail('ANE@USUARIOS.NNGGEUSKADI.VERCEL.APP')).toBe('ane')
    expect(usernameFromEmail('ane@ejemplo.org')).toBeNull()
    expect(usernameFromEmail('ane@otro.usuarios.nnggeuskadi.vercel.app')).toBeNull()
    expect(usernameFromEmail('a@usuarios.nnggeuskadi.vercel.app')).toBeNull()
    expect(usernameFromEmail(null)).toBeNull()
    expect(usernameFromEmail('')).toBeNull()
  })

  it('muestra el usuario o, en cuentas antiguas, el email', () => {
    expect(accountLabel('ane.ruiz@usuarios.nnggeuskadi.vercel.app')).toBe('ane.ruiz')
    expect(accountLabel('ane@ejemplo.org')).toBe('ane@ejemplo.org')
    expect(accountLabel(undefined)).toBe('')
  })

  it('en la entrada, un usuario se convierte en su dirección y un email antiguo se respeta', () => {
    expect(loginIdentifierToEmail('ane.ruiz')).toBe('ane.ruiz@usuarios.nnggeuskadi.vercel.app')
    expect(loginIdentifierToEmail(' Ane.Ruiz ')).toBe('ane.ruiz@usuarios.nnggeuskadi.vercel.app')
    expect(loginIdentifierToEmail('Ane@Ejemplo.org')).toBe('ane@ejemplo.org')
    expect(loginIdentifierToEmail('no valido')).toBeNull()
    expect(loginIdentifierToEmail('ane@')).toBeNull()
    expect(loginIdentifierToEmail('')).toBeNull()
  })
})
