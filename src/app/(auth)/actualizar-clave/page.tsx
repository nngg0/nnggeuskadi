import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/config/mode'
import { NewPasswordForm } from '../AuthForms'

export const metadata: Metadata = { title: 'Nueva contraseña' }

export default async function UpdatePasswordPage() {
  if (isDemoMode) redirect('/perfil')
  // Llega aquí tras el enlace de recuperación o invitación (sesión ya creada por /auth/callback).
  const session = await getSession()
  if (session.status === 'anonymous') redirect('/recuperar')
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="eyebrow text-sky">Contraseña</p>
      <h1 className="display mt-3 text-4xl">Elige una nueva contraseña.</h1>
      <p className="mb-8 mt-3 text-sm text-white/60">Mínimo 10 caracteres. Mejor una frase que solo tú recuerdes.</p>
      <NewPasswordForm />
    </div>
  )
}
