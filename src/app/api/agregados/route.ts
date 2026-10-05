import { NextResponse, type NextRequest } from 'next/server'
import { isValidInternalToken } from '@/lib/auth/token'
import { isDemoMode } from '@/lib/config/mode'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { DEMO_OTHER_PARTICIPATIONS, DEMO_OTHER_REGISTRATIONS } from '@/demo/personal-seed'

/*
 * Cifras agregadas para el Google Sheet (nunca nombres):
 *   tipo,id,total
 *   actividad,ACT-031,62
 *   oportunidad,OP-003,2
 * Uso en el Sheet: =IMPORTDATA("https://.../api/agregados?token=...")
 */
export const dynamic = 'force-dynamic'

function csvCell(value: string | number): string {
  const s = String(value)
  // Evita inyección de fórmulas al importar en hojas de cálculo.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.nextUrl.searchParams.get('token')
  if (!isValidInternalToken(token)) return new NextResponse('No autorizado', { status: 401 })

  let rows: { kind: string; content_id: string; total: number }[]
  if (isDemoMode) {
    rows = [
      ...Object.entries(DEMO_OTHER_REGISTRATIONS).map(([id, total]) => ({ kind: 'actividad', content_id: id, total })),
      ...Object.entries(DEMO_OTHER_PARTICIPATIONS).map(([id, total]) => ({ kind: 'oportunidad', content_id: id, total })),
    ]
  } else {
    const { data, error } = await createSupabaseAdminClient().rpc('aggregate_counts')
    if (error) {
      console.error('[agregados]', error.message)
      return new NextResponse('Error', { status: 500 })
    }
    rows = (data ?? []) as typeof rows
  }

  const csv = ['tipo,id,total', ...rows.map((r) => [r.kind, r.content_id, r.total].map(csvCell).join(','))].join('\n')
  return new NextResponse(csv, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' },
  })
}
