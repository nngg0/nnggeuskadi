import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { requireUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/config/mode'
import { territoryName } from '@/lib/domain/territories'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Zona privada: toda ruta bajo este layout exige un afiliado autorizado. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold">
        Saltar al contenido
      </a>
      <TopBar initials={initials(user.displayName)} territoryName={territoryName(user.territory)} demo={isDemoMode} />
      <main id="contenido" className="pb-28 md:pb-16">
        {children}
      </main>
      <BottomNav />
    </>
  )
}
