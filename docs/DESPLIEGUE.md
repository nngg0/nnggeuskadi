# Despliegue

Recomendado: **Vercel** (plan gratuito suficiente para empezar) + **Supabase** + **Google Sheets**.
Cualquier plataforma que ejecute Node 20.9+ sirve (`npm run build && npm start`).

## Checklist de producción

1. **Supabase** configurado según [SUPABASE.md](SUPABASE.md): migración aplicada, registro público desactivado,
   URL de redirección `https://TU-DOMINIO/auth/callback`.
2. **Google Sheet** con las seis pestañas y compartido con la cuenta de servicio ([GOOGLE_SHEETS.md](GOOGLE_SHEETS.md)).
3. **Variables de entorno** en la plataforma (Settings → Environment Variables):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_APP_MODE` | `live` |
   | `NEXT_PUBLIC_SITE_URL` | `https://TU-DOMINIO` |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon/publishable |
   | `SUPABASE_SERVICE_ROLE_KEY` | **secreto** |
   | `GOOGLE_SHEETS_SPREADSHEET_ID` | id del Sheet |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | email de la cuenta de servicio |
   | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | **secreto** |
   | `INTERNAL_API_TOKEN` | **secreto** (opcional) |

   `NEXT_PUBLIC_APP_MODE` se fija en el *build*: tras cambiarla hay que volver a desplegar.
4. **Dominio** con HTTPS (obligatorio para instalar la PWA y para las cookies seguras).
5. Primer usuario de dirección: `npm run invite -- --email ... --name ... --territory euskadi --role direccion_euskadi`
   (desde un equipo con `.env.local` de producción).
6. Comprobar: login, recuperación de contraseña, inscripción, «Quiero participar», instalación en móvil.

## Vercel paso a paso

1. Importa el repositorio en <https://vercel.com/new> (framework detectado: Next.js).
2. Añade las variables de entorno (Production y, si quieres, Preview).
3. Deploy. Cada push a `main` despliega producción; cada PR crea una preview.

### Preview de evaluación (solo demo)

Para enseñar la app sin servicios externos, despliega con solo `NEXT_PUBLIC_APP_MODE=demo`.
En demo nunca se lee el Sheet real en producción ni hay datos personales: cualquiera con el enlace podrá entrar
con los usuarios ficticios. **No uses demo como entorno real.**

## Seguridad en producción

- Recomendado: en Supabase, **Authentication → Providers → Email → Prevent use of leaked passwords** (si tu plan lo incluye).

- Las cabeceras de seguridad (`X-Frame-Options`, `HSTS`, `nosniff`, `noindex`…) se configuran en `next.config.ts`.
- Rota `SUPABASE_SERVICE_ROLE_KEY` y la clave de la cuenta de servicio si alguien que las conocía deja la organización.
- `npm run check:secrets` (también en CI) avisa si se ha versionado un secreto.
