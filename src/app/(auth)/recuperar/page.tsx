import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { RecoverForm } from '../AuthForms'

export const metadata: Metadata = { title: 'Recuperar acceso' }

export default function RecoverPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <Link href="/login" className="press -ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-semibold text-white/60 hover:text-white">
        <Icon name="arrowLeft" size={18} /> Volver
      </Link>
      <p className="eyebrow mt-6 text-sky">Recuperar acceso</p>
      <h1 className="display mt-3 text-4xl">Te enviamos un enlace.</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        Escribe el email con el que te dieron de alta. Si eres afiliado, recibirás un enlace para crear una nueva contraseña.
      </p>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-white/60">
        ¿Entras con nombre de usuario? Esas cuentas no reciben correo: pide a Administración que te restablezca la contraseña.
      </p>
      <RecoverForm />
    </div>
  )
}
