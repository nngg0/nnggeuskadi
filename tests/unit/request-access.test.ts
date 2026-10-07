import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/config/mode', () => ({ isDemoMode: false }))

const createUser = vi.fn()
const deleteUser = vi.fn()
const maybeSingle = vi.fn()
const insert = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { createUser, deleteUser } },
    from: (table: string) =>
      table === 'profiles' ? { select: () => ({ eq: () => ({ maybeSingle }) }) } : { insert },
  }),
}))

const { submitAccessRequest } = await import('@/lib/access/request-access')

const input = { displayName: 'Ane Ruiz', username: 'ane.ruiz', territory: 'alava' as const, password: 'una-clave-larga' }

beforeEach(() => {
  vi.clearAllMocks()
  maybeSingle.mockResolvedValue({ data: null })
  insert.mockResolvedValue({ error: null })
})

describe('solicitar acceso con nombre de usuario', () => {
  it('crea la cuenta con la dirección del usuario y registra la solicitud', async () => {
    createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    await expect(submitAccessRequest(input)).resolves.toBe('pending')
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ane.ruiz@usuarios.nnggeuskadi.vercel.app', email_confirm: true }),
    )
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', email: 'ane.ruiz@usuarios.nnggeuskadi.vercel.app' }))
  })

  it('avisa si el nombre de usuario ya existe', async () => {
    createUser.mockResolvedValue({ data: { user: null }, error: { code: 'email_exists', message: 'A user with this email address has already been registered' } })
    await expect(submitAccessRequest(input)).resolves.toBe('taken')
    expect(insert).not.toHaveBeenCalled()
  })

  it('lanza cualquier otro error de createUser en vez de dar la solicitud por enviada', async () => {
    createUser.mockResolvedValue({ data: { user: null }, error: { code: 'unexpected_failure', message: 'Database error' } })
    await expect(submitAccessRequest(input)).rejects.toThrow(/Database error/)
    expect(insert).not.toHaveBeenCalled()
  })

  it('si la cuenta ya estaba autorizada, ya es miembro', async () => {
    createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    maybeSingle.mockResolvedValue({ data: { id: 'u1' } })
    await expect(submitAccessRequest(input)).resolves.toBe('member')
    expect(insert).not.toHaveBeenCalled()
  })

  it('deshace la cuenta si no se puede registrar la solicitud', async () => {
    createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    insert.mockResolvedValue({ error: { message: 'fallo' } })
    await expect(submitAccessRequest(input)).rejects.toThrow(/fallo/)
    expect(deleteUser).toHaveBeenCalledWith('u1')
  })
})
