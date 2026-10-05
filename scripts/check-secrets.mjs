/**
 * Revisa los archivos versionados en git en busca de secretos que no deberían estar en el repositorio.
 * Uso: npm run check:secrets  (también se ejecuta en CI)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PATTERNS = [
  { name: 'Clave privada PEM', re: /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/ },
  { name: 'JWT (posible clave de Supabase)', re: /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'Clave secreta de Supabase', re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: 'API key de Google', re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Token de GitHub', re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'Variable secreta con valor', re: /^(SUPABASE_SERVICE_ROLE_KEY|GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY|INTERNAL_API_TOKEN)=\S+/m },
]

const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !/\.(png|jpg|ico|woff2?|lock)$/.test(f) && f !== 'package-lock.json' && f !== 'scripts/check-secrets.mjs')

const findings = []
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const { name, re } of PATTERNS) if (re.test(text)) findings.push(`${file}: ${name}`)
  if (/^\.env(\.|$)/.test(file) && file !== '.env.example') findings.push(`${file}: archivo .env versionado`)
}

if (findings.length) {
  console.error('✗ Posibles secretos en el repositorio:\n  ' + findings.join('\n  '))
  process.exit(1)
}
console.log(`✓ Sin secretos detectados en ${files.length} archivos.`)
