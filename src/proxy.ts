import { NextResponse, type NextRequest } from 'next/server'
import { updateSupabaseSession } from '@/lib/supabase/proxy-session'

/*
 * Primera barrera de la intranet privada: sin sesión no se accede a ninguna ruta interna.
 * Es una comprobación rápida; cada página y acción vuelve a verificar al usuario en servidor
 * (requireUser / actionUser) y la base de datos aplica RLS.
 */

const PUBLIC_PATHS = ['/login', '/recuperar', '/auth/', '/api/agregados', '/api/revalidar', '/offline']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const demo = process.env.NEXT_PUBLIC_APP_MODE !== 'live'

  let response = NextResponse.next({ request })
  let hasUser: boolean
  if (demo) {
    hasUser = Boolean(request.cookies.get('nngg_demo_user')?.value)
  } else {
    const session = await updateSupabaseSession(request)
    response = session.response
    hasUser = session.hasUser
  }

  if (!hasUser && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname + search)}` : ''
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: [
    // Todo salvo estáticos, iconos, manifest y service worker.
    '/((?!_next/static|_next/image|icons/|favicon.ico|manifest.webmanifest|sw.js|offline.html|robots.txt).*)',
  ],
}
