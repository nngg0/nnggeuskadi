import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { siteUrl } from '@/lib/config/env'
import { getContent } from '@/lib/content/source'
import { buildIcs } from '@/lib/domain/ics'
import { publicActivities } from '@/lib/domain/selectors'

/** Descarga la actividad como evento de calendario (.ics) para el móvil o el ordenador. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (session.status !== 'member') return new NextResponse('No autorizado', { status: 401 })

  const id = decodeURIComponent((await params).id)
  const content = await getContent()
  const activity = publicActivities(content.activities).find((a) => a.id === id)
  if (!activity) return new NextResponse('No encontrada', { status: 404 })

  const ics = buildIcs(activity, { url: `${siteUrl()}/actividades/${encodeURIComponent(activity.id)}` })
  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      // inline: iPhone abre directamente «Añadir al calendario»; Android/escritorio lo descargan.
      'content-disposition': `inline; filename="${activity.id}.ics"`,
      'cache-control': 'private, no-store',
    },
  })
}
