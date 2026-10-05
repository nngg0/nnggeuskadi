import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { isValidInternalToken } from '@/lib/auth/token'
import { SHEETS_CACHE_TAG } from '@/lib/sheets/client'

/**
 * Fuerza la relectura del Google Sheet sin esperar a la caché.
 * Uso: POST /api/revalidar con cabecera "Authorization: Bearer <INTERNAL_API_TOKEN>".
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
  if (!isValidInternalToken(token)) return NextResponse.json({ ok: false }, { status: 401 })
  revalidateTag(SHEETS_CACHE_TAG, 'max')
  return NextResponse.json({ ok: true })
}
