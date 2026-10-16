import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'NNGG Euskadi',
    short_name: 'NNGG Euskadi',
    description: 'Qué viene, qué estamos preparando y dónde puedes participar.',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#05080f',
    theme_color: '#05080f',
    categories: ['social', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Calendario', url: '/calendario', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Participa', url: '/participa', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Documentos', url: '/documentos', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
