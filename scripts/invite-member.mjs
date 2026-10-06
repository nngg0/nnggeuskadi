/**
 * Alta autorizada de un afiliado.
 *
 *   npm run invite -- --email ane@ejemplo.org --name "Ane Ruiz" --territory alava [--role afiliado]
 *
 * 1. Añade (o actualiza) el email en public.member_allowlist.
 * 2. Si la persona no tiene cuenta, Supabase le envía una invitación por email.
 *    Si ya la tenía, se crea/actualiza su perfil directamente.
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SITE_URL
 * (en el entorno o en .env.local). Ejecutar solo desde un equipo de confianza.
 */
import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const TERRITORIES = ['euskadi', 'alava', 'bizkaia', 'gipuzkoa']
const ROLES = ['afiliado', 'direccion_euskadi', 'direccion_provincial', 'administracion']

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    territory: { type: 'string' },
    role: { type: 'string', default: 'afiliado' },
  },
})

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const email = values.email?.trim().toLowerCase()
const name = values.name?.trim()
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Indica un --email válido')
if (!name || name.length > 80) fail('Indica --name (máx. 80 caracteres)')
if (!TERRITORIES.includes(values.territory)) fail(`--territory debe ser uno de: ${TERRITORIES.join(', ')}`)
if (!ROLES.includes(values.role)) fail(`--role debe ser uno de: ${ROLES.join(', ')}`)
if (values.role === 'direccion_provincial' && values.territory === 'euskadi') fail('La dirección provincial necesita un territorio provincial')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
if (!url || !key) fail('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { error: allowError } = await supabase
  .from('member_allowlist')
  .upsert({ email, display_name: name, territory: values.territory, role: values.role })
if (allowError) fail(`No se pudo guardar en la lista de alta: ${allowError.message}`)

async function findUser() {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) fail(error.message)
    const user = data.users.find((u) => u.email?.toLowerCase() === email)
    if (user || data.users.length < 200) return user ?? null
  }
  return null
}

const existing = await findUser()
if (existing) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: existing.id, display_name: name, territory: values.territory, role: values.role })
  if (error) fail(`No se pudo actualizar el perfil: ${error.message}`)
  console.log(`✓ ${email} ya tenía cuenta: perfil actualizado (${values.role}, ${values.territory}).`)
} else {
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/login` })
  if (error) fail(`No se pudo enviar la invitación: ${error.message}`)
  console.log(`✓ Invitación enviada a ${email}. Al aceptarla elegirá su contraseña.`)
}
