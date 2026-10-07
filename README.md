# NNGG Euskadi · Intranet de afiliados

Aplicación web privada (PWA) para los afiliados de **Nuevas Generaciones Euskadi**.

No es una intranet de noticias. Una intranet convencional dice *«Esto ya está organizado. Puedes asistir.»*
Esta dice: **«Estamos preparando esto. ¿Quieres participar?»**

Al abrirla, un afiliado entiende en segundos:

1. **¿Qué viene?** — actividades confirmadas e inscripción en dos pulsaciones.
2. **¿Qué estamos preparando?** — iniciativas todavía abiertas.
3. **¿Dónde puedo participar?** — oportunidades concretas de colaboración, con «Quiero participar».

Y además: calendario común, repositorio documental con búsqueda y perfil con sus planes, participaciones y documentos guardados.
Sin chat, foros, comentarios, seguidores ni gamificación: no sustituye a WhatsApp ni es una red social.

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Instalación local](#instalación-local)
- [Datos demo](#datos-demo)
- [Variables de entorno](#variables-de-entorno)
- [Supabase y migraciones](#supabase-y-migraciones)
- [Google Sheets](#google-sheets)
- [Desarrollo, calidad y build](#desarrollo-calidad-y-build)
- [Despliegue](#despliegue)
- [Seguridad](#seguridad)
- [Estructura del repositorio](#estructura-del-repositorio)

## Funcionalidades

| Sección | Qué permite |
|---|---|
| **Inicio** | Panel personal: tu próximo plan, el bloque de la **campaña principal**, *Próximamente* (lo de tu territorio y Euskadi primero), *En preparación* (iniciativas abiertas) y *Puedes participar en…* (ámbitos abiertos). |
| **Calendario** | Lista de próximas actividades o vista mensual, filtro Todos/Euskadi/Álava/Bizkaia/Gipuzkoa, disponibilidad de plazas. |
| **Actividad** | Ficha con fecha, hora, lugar, inscritos/plazas. Inscribirse y cancelar. Control de aforo, apertura y cierre (automático por fecha o manual), evento completo, cancelado o finalizado. **Añadir a mi calendario** (.ics para iPhone/Android/Outlook o Google Calendar). |
| **Participa** | Bloque principal de campaña (p. ej. Campaña 29N) y proyectos en preparación y en marcha con sus ámbitos. Sin cupos: participa quien quiera y la organización cierra cada ámbito cuando lo decide. «Quiero participar» → elegir uno o varios ámbitos → confirmación inmediata. |
| **Documentos** | Búsqueda instantánea (sin tildes), filtros por territorio y categoría, destacados, recientes, guardados. |
| **Perfil** | Mis intereses (hasta 3 temas), próximas actividades, histórico de inscripciones, participaciones, documentos guardados y configuración (nombre visible, preferencia de avisos, instalar la app, contraseña, salir). |
| **Dirección** | En fichas de su territorio, la dirección ve quién se ha inscrito o se ha ofrecido (solo nombre visible) para poder contactar. Listado de **Miembros**: la provincial, su territorio; la regional, todos. |
| **Altas** | «Solicitar acceso» en la pantalla de entrada (nombre, nombre de usuario y contraseña). **Administración** aprueba, eligiendo provincia (Álava, Bizkaia o Gipuzkoa) y rol, o rechaza en Solicitudes. |
| **PWA** | Instalable en móvil y escritorio, iconos, página sin conexión, aviso offline, preparada para notificaciones push. |

## Stack

**Next.js 16** (App Router, Server Components, Server Actions) · **React 19** · **TypeScript** estricto ·
**Tailwind CSS 4** · **Supabase** (Auth + Postgres + RLS) · **Google Sheets API** · **zod** · **Vitest** · **Playwright**.

Sin dependencias de UI ni de iconos: componentes e iconos propios. Tipografía Montserrat servida localmente.
Las decisiones técnicas están razonadas en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#decisiones-técnicas).

## Arquitectura

```
          Google Sheet (CMS)                      Supabase (datos personales)
  ACTIVIDADES · PROYECTOS · OPORTUNIDADES     auth.users · profiles · event_registrations
  DOCUMENTOS · CONFIGURACION · TERRITORIOS    project_participations · saved_documents
                │  lectura + validación (zod)              │  RLS + funciones atómicas
                ▼                                          ▼
     lib/sheets → lib/content/source.ts        lib/personal (PersonalStore)
                └──────────────┬───────────────────────────┘
                     lib/domain (reglas puras) · lib/view
                               │
            Server Components (páginas) + Server Actions (escrituras)
                               │
                 proxy.ts (rutas protegidas) · PWA
```

**Regla fundamental:** el Sheet **nunca** contiene datos personales. Se relaciona con la base de datos por ids
(`ACT-031`). El Sheet puede recibir cifras agregadas («80 plazas · 62 inscritos»), nunca listas de nombres.

Detalle de capas, flujo de inscripción, permisos y puntos de extensión: **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**.

## Instalación local

Requisitos: **Node.js 20.9+** (recomendado 22) y npm.

```bash
git clone <repo> && cd nnggeuskadi
npm install
cp .env.example .env.local      # en modo demo no hace falta rellenar nada
npm run dev                     # http://localhost:3000
```

## Datos demo

Con `NEXT_PUBLIC_APP_MODE=demo` (valor por defecto) la app es **completamente navegable sin servicios externos**:

- En `/login` eliges un usuario ficticio: Adrián (dirección regional), Alba (afiliada de Álava), Pablo Folgado (afiliado de Bizkaia) y Miguel (dirección provincial de Bizkaia).
- El contenido sale de `src/demo/content.ts`, escrito **con el mismo formato que el Sheet** y validado por el mismo código.
  Las fechas son relativas a hoy, así la demo nunca se queda desfasada.
- Inscripciones, participaciones y guardados se guardan en una cookie del navegador (`src/demo/personal-store.ts`);
  los contadores de «otros afiliados» son ficticios (`src/demo/personal-seed.ts`).
- La cabecera muestra la etiqueta **DEMO**.

Separación de producción: todo lo demo vive en `src/demo/`. En modo `live` no se usa (salvo `CONTENT_SOURCE=demo`, útil
para probar Supabase antes de tener el Sheet). Para **eliminar la demo**: borrar `src/demo/`, quitar el
`demoWorkbook` de `src/lib/content/source.ts`, el `demoPersonalStore` de `src/lib/personal/index.ts`, la rama demo de
`src/lib/auth/session.ts`, `signInDemo` de `src/lib/actions/auth.ts`, el bloque demo de `/login` y de `/api/agregados`.

## Variables de entorno

Todas documentadas en [`.env.example`](.env.example). Las `NEXT_PUBLIC_*` son visibles en el navegador; los secretos nunca llevan ese prefijo.

| Variable | Obligatoria en live | Secreta | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_APP_MODE` | sí (`live`) | | `demo` o `live` |
| `NEXT_PUBLIC_SITE_URL` | sí | | URL pública para los enlaces de email |
| `CONTENT_SOURCE` | | | `sheets` (por defecto en live) o `demo` |
| `NEXT_PUBLIC_SUPABASE_URL` | sí | | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | | Clave pública (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | **sí** | Inscripción con aforo, agregados, alta de afiliados |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | sí | | Id del Sheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | sí | | Cuenta de servicio con acceso de lectura |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | sí | **sí** | Clave privada de la cuenta de servicio |
| `SHEETS_REVALIDATE_SECONDS` | | | Caché del Sheet (60 s) |
| `INTERNAL_API_TOKEN` | | **sí** | Protege `/api/agregados` y `/api/revalidar` |

## Supabase y migraciones

Guía completa en **[docs/SUPABASE.md](docs/SUPABASE.md)**: creación del proyecto, `npx supabase db push`, esquema,
políticas RLS, funciones y **alta de afiliados** (`npm run invite`). La migración está en
[`supabase/migrations/`](supabase/migrations/) y tiene pruebas de seguridad en [`supabase/tests/`](supabase/tests/) (`npm run test:db`).

Autenticación: email y contraseña, sesión persistente por cookies, recuperación de acceso por email y rutas protegidas.
**No hay registro público**: solo entran los emails autorizados en `member_allowlist`.

## Google Sheets

Guía completa en **[docs/GOOGLE_SHEETS.md](docs/GOOGLE_SHEETS.md)**: cuenta de servicio, pestañas, columnas, valores
aceptados, validación, refresco y cifras agregadas. Plantillas CSV en [`docs/plantilla-sheet/`](docs/plantilla-sheet/).

## Desarrollo, calidad y build

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` | ESLint (config Next + TypeScript) |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Tests unitarios (reglas de inscripción, validación del Sheet, permisos, personalización, fechas, JWT) |
| `npm run test:e2e` | Playwright en móvil y escritorio sobre la build demo (login, rutas protegidas, inscripción, cancelación, aforo, estados, Quiero participar, filtros, búsqueda, permisos, PWA, sin scroll horizontal) |
| `npm run test:db` | Migración + RLS en un PostgreSQL desechable (`DATABASE_URL`) |
| `npm run check:secrets` | Busca secretos en los archivos versionados |
| `npm run check` | lint + typecheck + test + build |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run icons` | Regenera los iconos de la PWA desde el logotipo oficial (`public/brand/nngg-euskadi-blanco.png`) |
| `npm run invite` | Alta autorizada de un afiliado |

La CI de GitHub (`.github/workflows/ci.yml`) ejecuta todo lo anterior en cada PR.

## Despliegue

Guía en **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)** (Vercel + Supabase + Google Sheets, checklist de producción).

## Seguridad

- **Privada por defecto**: `proxy.ts` redirige a `/login` cualquier ruta interna sin sesión; cada página
  (`requireUser`) y cada Server Action (`actionUser`) vuelven a verificar al usuario en servidor.
- **Permisos en backend**: `lib/auth/permissions.ts` en la app y RLS + `can_manage_territory()` en la base de datos. Ocultar botones no es el control.
- **Aforo a prueba de manipulación**: las inscripciones solo se escriben mediante una función SQL con bloqueo, ejecutable únicamente por el servidor.
- **No confiar en el Sheet**: cada fila se valida (tipos, territorios, fechas, URLs solo `https`); las inválidas se descartan.
- **Validación server-side** de todas las entradas con zod; redirecciones internas saneadas; CSV protegido contra inyección de fórmulas.
- **Secretos solo en servidor** (`server-only`), nunca en GitHub (`.gitignore`, `check:secrets`).
- **Datos mínimos**: los afiliados nunca ven datos de otros; la dirección ve solo el nombre visible de quien se inscribe en su territorio.
- **Cabeceras** de seguridad y `noindex`; el service worker no cachea páginas ni datos.

## Estructura del repositorio

```
├─ src/
│  ├─ app/            Rutas (zona privada, acceso, API, manifest)
│  ├─ components/     UI reutilizable
│  ├─ lib/            Dominio, Sheets, Supabase, auth, acciones, vistas, config
│  ├─ demo/           Datos y almacén demo (eliminable)
│  └─ proxy.ts        Protección de rutas
├─ supabase/          migrations/ y tests/ SQL
├─ public/            sw.js, offline.html, iconos, robots.txt
├─ tests/             unit/ (Vitest) y e2e/ (Playwright)
├─ scripts/           iconos, alta de afiliados, test de BD, detección de secretos
└─ docs/              Arquitectura, Supabase, Google Sheets, despliegue, plantillas del Sheet
```
