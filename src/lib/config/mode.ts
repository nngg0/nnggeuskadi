/**
 * Modo de la aplicación. Se puede importar desde cliente y servidor.
 * - demo: sin servicios externos. Acceso con usuarios ficticios y datos de ejemplo.
 * - live: autenticación y datos personales en Supabase.
 */
export type AppMode = 'demo' | 'live'

export const APP_MODE: AppMode = process.env.NEXT_PUBLIC_APP_MODE === 'live' ? 'live' : 'demo'

export const isDemoMode = APP_MODE === 'demo'
