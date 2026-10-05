import Link from 'next/link'

export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 text-center text-white">
      <p className="eyebrow text-sky">404</p>
      <h1 className="display mt-3 text-4xl">Página no encontrada.</h1>
      <Link href="/" className="press mt-8 rounded-[var(--radius-btn)] bg-electric px-6 py-4 font-bold">
        Ir a Inicio
      </Link>
    </main>
  )
}
