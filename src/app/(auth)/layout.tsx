import { Wordmark } from '@/components/layout/Wordmark'

/** Pantallas públicas de acceso: zona de identidad a pantalla completa. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-night text-white">
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-electric/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-electric/10 blur-3xl" />
      <header className="pt-safe relative mx-auto w-full max-w-5xl px-5 pt-6 sm:px-8">
        <Wordmark size="lg" />
      </header>
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-10 sm:px-8">{children}</main>
      <footer className="pb-safe relative mx-auto w-full max-w-5xl px-5 pb-6 text-xs text-white/40 sm:px-8">
        Aplicación privada para afiliados de Nuevas Generaciones Euskadi.
      </footer>
    </div>
  )
}
