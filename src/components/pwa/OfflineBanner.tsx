'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/ui/Icon'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/** Aviso discreto cuando se pierde la conexión. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online) return null
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[60] flex animate-fade items-center justify-center gap-2 bg-warning px-4 py-2 text-xs font-bold text-white">
      <Icon name="offline" size={16} />
      Sin conexión. Lo que ves puede no estar actualizado.
    </div>
  )
}
