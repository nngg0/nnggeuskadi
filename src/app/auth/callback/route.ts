import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const OTP_TYPES: EmailOtpType[] = ['recovery', 'invite', 'magiclink', 'email', 'signup', 'email_change']

/**
 * Destino de los enlaces de email de Supabase (invitación, recuperación).
 * Admite el flujo PKCE (?code=) y el de token_hash (?token_hash=&type=).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'
  const supabase = await createSupabaseServerClient()

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  let ok = false
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error
  }
  if (!ok) return NextResponse.redirect(new URL('/recuperar?error=enlace', origin))
  // Una invitación lleva a crear la contraseña.
  return NextResponse.redirect(new URL(type === 'invite' ? '/actualizar-clave' : next, origin))
}
