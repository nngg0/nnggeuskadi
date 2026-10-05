import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { supabasePublicEnv, supabaseServiceRoleKey } from '@/lib/config/env'

/**
 * Cliente con la service role: ignora RLS. Solo para operaciones que ya han sido validadas en
 * servidor (inscripción con control de plazas, agregados). Nunca se expone al navegador.
 */
export function createSupabaseAdminClient() {
  const { url } = supabasePublicEnv()
  return createClient(url, supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
