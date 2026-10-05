import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { buttonClasses } from '@/components/ui/Button'
import { signOut } from '@/lib/actions/auth'
import { getSession } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Acceso pendiente' }

/** Usuario autenticado cuyo email no está en la lista de alta autorizada. */
export default async function PendingPage() {
  const session = await getSession()
  if (session.status === 'anonymous') redirect('/login')
  if (session.status === 'member') redirect('/')
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="eyebrow text-sky">Acceso pendiente</p>
      <h1 className="display mt-3 text-4xl">Todavía no tienes acceso.</h1>
      <p className="mt-4 text-sm leading-relaxed text-white/65">
        Has entrado como <strong className="text-white">{session.email}</strong>, pero este email aún no está autorizado como
        afiliado. Pide a tu dirección provincial que te dé de alta y vuelve a intentarlo.
      </p>
      <form action={signOut} className="mt-8">
        <button type="submit" className={buttonClasses('onDark', 'md')}>
          Salir
        </button>
      </form>
    </div>
  )
}
