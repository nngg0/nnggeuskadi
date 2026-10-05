import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { signInDemo } from '@/lib/actions/auth'
import { ROLE_LABELS } from '@/lib/auth/permissions'
import { getSession } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/config/mode'
import { territoryName } from '@/lib/domain/territories'
import { DEMO_USERS } from '@/demo/users'
import { LoginForm } from '../AuthForms'

export const metadata: Metadata = { title: 'Entrar' }

type Search = Promise<Record<string, string | string[] | undefined>>

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const session = await getSession()
  if (session.status === 'member') redirect('/')
  if (session.status === 'pending') redirect('/acceso-pendiente')
  const next = safeNext((await searchParams).next)

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div>
        <p className="eyebrow text-sky">Intranet de afiliados</p>
        <h1 className="display mt-4 text-[3rem] sm:text-6xl lg:text-7xl">
          Lo que estamos
          <br />
          haciendo juntos.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
          Qué viene, qué estamos preparando y dónde puedes participar. Todo en un sitio.
        </p>
      </div>

      <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-night-2/80 p-6 backdrop-blur sm:p-8">
        {isDemoMode ? (
          <>
            <p className="eyebrow text-sky">Modo demo</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.02em]">Entra como…</h2>
            <p className="mt-2 text-sm text-white/60">
              Datos de ejemplo, sin servicios externos. Prueba distintos territorios y roles.
            </p>
            <ul className="mt-6 grid gap-2">
              {DEMO_USERS.map((u) => (
                <li key={u.id}>
                  <form action={signInDemo}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="next" value={next} />
                    <button
                      type="submit"
                      className="press group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left hover:border-electric hover:bg-electric/15"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-electric text-sm font-bold">
                        {u.displayName.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{u.displayName}</span>
                        <span className="block text-xs text-white/55">
                          {ROLE_LABELS[u.role]} · {territoryName(u.territory)}
                        </span>
                      </span>
                      <Icon name="arrowRight" size={20} className="text-white/40 transition-colors group-hover:text-white" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Entrar</h2>
            <p className="mt-2 mb-6 text-sm text-white/60">El acceso lo autoriza tu dirección provincial. No hay registro abierto.</p>
            <LoginForm next={next} />
          </>
        )}
      </div>
    </div>
  )
}
