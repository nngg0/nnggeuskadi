import 'server-only'
import { isDemoMode } from '@/lib/config/mode'
import { demoPersonalStore } from '@/demo/personal-store'
import { supabasePersonalStore } from './supabase-store'
import type { PersonalStore } from './store'

/** Almacén de datos personales según el modo (demo o Supabase). */
export function personalStore(): PersonalStore {
  return isDemoMode ? demoPersonalStore : supabasePersonalStore
}
