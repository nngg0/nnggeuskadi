import { generateKeyPairSync, createVerify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildServiceAccountJwt } from '@/lib/sheets/client'

describe('cliente de Google Sheets', () => {
  it('firma un JWT RS256 válido de solo lectura para la cuenta de servicio', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const jwt = buildServiceAccountJwt('bot@proyecto.iam.gserviceaccount.com', pem, 1_800_000_000)
    const [header, claims, signature] = jwt.split('.') as [string, string, string]

    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${header}.${claims}`)
    expect(verifier.verify(publicKey, Buffer.from(signature, 'base64url'))).toBe(true)

    const payload = JSON.parse(Buffer.from(claims, 'base64url').toString())
    expect(payload).toMatchObject({
      iss: 'bot@proyecto.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      exp: 1_800_003_600,
    })
  })
})
