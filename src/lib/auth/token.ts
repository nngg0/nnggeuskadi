import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { internalApiToken } from '@/lib/config/env'

/** Compara el token recibido con INTERNAL_API_TOKEN en tiempo constante. */
export function isValidInternalToken(received: string | null): boolean {
  const expected = internalApiToken()
  if (!expected || !received) return false
  const a = createHash('sha256').update(received).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}
