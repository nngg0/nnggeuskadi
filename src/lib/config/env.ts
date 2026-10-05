import 'server-only'
import { z } from 'zod'
import { APP_MODE } from './mode'

/*
 * Variables de entorno de servidor. Los secretos solo se leen aquí y nunca llevan el prefijo NEXT_PUBLIC_.
 * Se validan de forma perezosa: el modo demo funciona sin ninguna variable configurada.
 */

const supabaseSchema = z.object({
  url: z.url({ message: 'NEXT_PUBLIC_SUPABASE_URL debe ser una URL' }),
  anonKey: z.string().min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada'),
})

export function supabasePublicEnv() {
  return supabaseSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}

export function supabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key.length < 20) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
  return key
}

export type ContentSourceKind = 'demo' | 'sheets'

/**
 * Origen del contenido organizativo.
 * En modo demo solo se permite leer el Sheet real fuera de producción, para no exponer
 * contenido interno a usuarios ficticios.
 */
export function contentSource(): ContentSourceKind {
  const requested = process.env.CONTENT_SOURCE
  if (APP_MODE === 'live') return requested === 'demo' ? 'demo' : 'sheets'
  if (requested === 'sheets' && process.env.NODE_ENV !== 'production') return 'sheets'
  return 'demo'
}

const sheetsSchema = z.object({
  spreadsheetId: z.string().min(10, 'GOOGLE_SHEETS_SPREADSHEET_ID no está configurado'),
  clientEmail: z.email({ message: 'GOOGLE_SERVICE_ACCOUNT_EMAIL no es válido' }),
  privateKey: z.string().includes('PRIVATE KEY', { message: 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no es válida' }),
  revalidateSeconds: z.coerce.number().int().min(0).max(86400).default(60),
})

export function sheetsEnv() {
  return sheetsSchema.parse({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Las plataformas de despliegue suelen guardar los saltos de línea como "\n" literales.
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    revalidateSeconds: process.env.SHEETS_REVALIDATE_SECONDS || undefined,
  })
}

/** Token para los endpoints internos (/api/agregados, /api/revalidar). Null = endpoints desactivados. */
export function internalApiToken(): string | null {
  const token = process.env.INTERNAL_API_TOKEN
  return token && token.length >= 24 ? token : null
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}
