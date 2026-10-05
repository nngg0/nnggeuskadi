import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/montserrat'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'
import { OfflineBanner } from '@/components/pwa/OfflineBanner'

export const metadata: Metadata = {
  title: { default: 'NNGG Euskadi', template: '%s · NNGG Euskadi' },
  description: 'Qué viene, qué estamos preparando y dónde puedes participar. Aplicación privada para afiliados de NNGG Euskadi.',
  applicationName: 'NNGG Euskadi',
  appleWebApp: { capable: true, title: 'NNGG Euskadi', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  // Intranet privada: no indexar.
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#071330',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-dvh">
        <OfflineBanner />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
