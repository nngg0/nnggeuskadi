import type { IconName } from '@/components/ui/Icon'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  /** Rutas que también activan esta sección. */
  match: (pathname: string) => boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: 'home', match: (p) => p === '/' },
  { href: '/calendario', label: 'Calendario', icon: 'calendar', match: (p) => p.startsWith('/calendario') || p.startsWith('/actividades') },
  { href: '/participa', label: 'Participa', icon: 'participa', match: (p) => p.startsWith('/participa') },
  { href: '/documentos', label: 'Documentos', icon: 'document', match: (p) => p.startsWith('/documentos') },
  { href: '/perfil', label: 'Perfil', icon: 'user', match: (p) => p.startsWith('/perfil') },
]
