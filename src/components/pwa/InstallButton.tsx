'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Ofrece instalar la app cuando el navegador lo permite. En iOS explica cómo hacerlo. */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<'installed' | 'ios' | 'other' | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    // Detección única al montar: solo existe en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(standalone ? 'installed' : ios ? 'ios' : 'other')
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (platform === 'installed') {
    return <p className="text-sm text-slate">La aplicación ya está instalada en este dispositivo.</p>
  }
  if (promptEvent) {
    return (
      <Button
        variant="secondary"
        size="md"
        icon={<Icon name="download" size={18} />}
        onClick={async () => {
          await promptEvent.prompt()
          setPromptEvent(null)
        }}
      >
        Instalar la app
      </Button>
    )
  }
  if (platform === 'ios') {
    return <p className="text-sm text-slate">En iPhone: pulsa «Compartir» y después «Añadir a pantalla de inicio».</p>
  }
  return <p className="text-sm text-slate">Desde el menú del navegador, elige «Instalar aplicación» o «Añadir a pantalla de inicio».</p>
}
