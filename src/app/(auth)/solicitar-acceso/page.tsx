import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { RequestAccessForm } from '../AuthForms'

export const metadata: Metadata = { title: 'Solicitar acceso' }

export default function RequestAccessPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <Link href="/login" className="press -ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-semibold text-white/60 hover:text-white">
        <Icon name="arrowLeft" size={18} /> Volver
      </Link>
      <p className="eyebrow mt-6 text-sky">Solicitar acceso</p>
      <h1 className="display mt-3 text-4xl">Únete a la intranet.</h1>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-white/60">
        Para afiliados de NNGG Euskadi. Deja tus datos y elige una contraseña: cuando revisemos tu solicitud podrás entrar con
        ellos.
      </p>
      <RequestAccessForm />
    </div>
  )
}
