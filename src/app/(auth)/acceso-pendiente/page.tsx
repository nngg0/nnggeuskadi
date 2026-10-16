import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { buttonClasses } from '@/components/ui/Button'
import { signOut } from '@/lib/actions/auth'
import { getSession } from '@/lib/auth/session'
import { accountLabel } from '@/lib/auth/username'

export const metadata: Metadata = { title: 'Acceso pendiente' }

/** Usuario autenticado cuya cuenta no está en la lista de alta autorizada. */
export default async function PendingPage() {
  const session = await getSession()
  if (session.status === 'anonymous') redirect('/login')
  if (session.status === 'member') redirect('/')
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="eyebrow text-sky">Acceso pendiente</p>
      <h1 className="display mt-3 text-4xl">Tu solicitud está pendiente.</h1>
      <p className="mt-4 text-sm leading-relaxed text-white/65">
        Has entrado como <strong className="text-white">{accountLabel(session.email)}</strong>. Tu acceso todavía no se ha aprobado. En cuanto
        lo aprueben podrás entrar con este mismo usuario y contraseña.
      </p>
      <form action={signOut} className="mt-8">
        <button type="submit" className={buttonClasses('onDark', 'md')}>
          Salir
        </button>
      </form>
    </div>
  )
}
