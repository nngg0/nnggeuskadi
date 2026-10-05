'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Cliente de navegador (solo para flujos de autenticación en páginas públicas). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
