# Arquitectura

## Principio rector

La aplicación responde a tres preguntas: **¿Qué viene? ¿Qué estamos preparando? ¿Dónde puedo participar?**
Cada pantalla y cada funcionalidad se justifica por una de ellas. La participación es el centro del producto.

## Separación de datos (regla fundamental)

| Dónde | Qué | Por qué |
|---|---|---|
| **Google Sheets** | Actividades, proyectos, oportunidades, documentos, configuración, territorios | Lo gestiona la organización sin CMS. **Nunca** datos personales. |
| **Supabase (Postgres)** | Usuarios, perfiles, territorio del afiliado, inscripciones, participaciones, documentos guardados | Datos personales protegidos con RLS. |

Ambos mundos se relacionan solo por **ids de texto** (`ACT-031`, `PRY-001`, `OP-003`, `DOC-001`).
El Sheet puede recibir **cifras agregadas** (`/api/agregados`: «ACT-031 → 62 inscritos»), nunca listas nominales.

## Capas

```
src/
├─ app/                      UI: rutas (App Router)
│  ├─ (app)/                 Zona privada: layout con requireUser()
│  │  ├─ page.tsx            Inicio
│  │  ├─ calendario/         Calendario (lista y mes)
│  │  ├─ actividades/[id]/   Ficha de actividad + inscripción
│  │  ├─ participa/          Proyectos en preparación
│  │  ├─ participa/[id]/     Ficha de proyecto + oportunidades
│  │  ├─ documentos/         Repositorio documental
│  │  └─ perfil/             Perfil
│  ├─ (auth)/                Login, recuperar acceso, nueva contraseña, acceso pendiente
│  ├─ auth/callback/         Destino de los enlaces de email de Supabase
│  ├─ api/agregados|revalidar  Endpoints internos con token
│  └─ manifest.ts            Manifest PWA
├─ components/               Componentes reutilizables (ui, layout, activities, projects, documents…)
├─ lib/
│  ├─ domain/                Lógica de negocio PURA (sin E/S): tipos, territorios, fechas, reglas de inscripción, selectores
│  ├─ sheets/                Contrato del Sheet (columns.ts), validación (parse.ts) y cliente API (client.ts)
│  ├─ content/source.ts      Punto único de acceso al contenido (Sheet o demo)
│  ├─ personal/              Interfaz PersonalStore + implementación Supabase
│  ├─ supabase/              Clientes: servidor (sesión), admin (service role), navegador, proxy
│  ├─ auth/                  Sesión, permisos, token interno
│  ├─ actions/               Server Actions: validan, comprueban permisos y reglas, y escriben
│  ├─ view/                  Combina contenido + datos personales para pintar
│  └─ config/                Modo (demo/live) y variables de entorno validadas
├─ demo/                     DATOS DEMO (contenido, usuarios, almacén por cookie). Eliminable.
└─ proxy.ts                  Protección de rutas (antes "middleware")
```

## Flujo de una inscripción

1. El afiliado pulsa **Inscribirme** (`RegistrationPanel`, cliente).
2. Server Action `registerForActivity(id)`:
   - obtiene el usuario de la sesión (nunca del cliente);
   - valida el id; carga la actividad del Sheet (visible, no borrador);
   - calcula el estado con `getRegistrationState` (plazos, cierre manual, aforo, ya inscrito);
3. `PersonalStore.register` → función SQL `register_for_event` (service role) que **bloquea por actividad**
   (`pg_advisory_xact_lock`), comprueba duplicado y aforo e inserta. Un `unique (event_id, user_id)` impide duplicados.
4. `revalidatePath` y feedback inmediato en la interfaz.

La misma regla (`getRegistrationState`) pinta la interfaz y decide en servidor: no hay lógica duplicada.

## Permisos

- `src/lib/auth/permissions.ts`: mapa rol → permisos y `managedTerritories()`.
- Base de datos: `public.can_manage_territory()` usada por las funciones de listados nominales.
- Ocultar un botón nunca es el control: páginas y acciones comprueban en servidor y la BD aplica RLS.

| Rol | Puede |
|---|---|
| `afiliado` | Consultar todo, inscribirse/cancelar, participar, guardar documentos, editar su nombre y ajustes |
| `direccion_provincial` | Lo anterior + ver quién se ha inscrito/ofrecido **en su territorio** |
| `direccion_euskadi` | Lo anterior + ver quién se ha inscrito/ofrecido en **todos** los territorios |

Para añadir un rol: `USER_ROLES` (`src/lib/domain/types.ts`), fila en `public.roles`, permisos en
`permissions.ts` y, si gestiona datos, en `public.can_manage_territory()`.

## Personalización territorial

`territoryRank`: 0 = territorio del usuario, 1 = Euskadi, 2 = resto. Se usa para **ordenar**, nunca para restringir.
Todos los listados tienen el selector **Todos | Euskadi | Álava | Bizkaia | Gipuzkoa** (`?t=` en la URL).

## Preguntas adicionales por evento (futuro)

`event_registrations.answers` (jsonb) y `EventRegistrationInput.answers` ya existen. Para añadir el constructor:
una hoja `PREGUNTAS` (evento_id, clave, tipo, etiqueta, obligatoria), su validador en `parse.ts`, el formulario en
`RegistrationPanel` y la validación de respuestas en `registerForActivity`.

## Notificaciones push (futuro)

`public/sw.js` ya gestiona los eventos `push` y `notificationclick`, y el perfil guarda `notifyNewInitiatives`.
Falta: claves VAPID, tabla `push_subscriptions` y el envío desde servidor.

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| Next.js 16 (App Router, Server Actions, `proxy.ts`) | Render en servidor: los secretos y la lógica de permisos nunca llegan al navegador |
| Sin librería de Google (`googleapis`) | Basta un `fetch` y firmar un JWT con `node:crypto`: menos dependencias |
| `zod` | Validación declarativa del Sheet y de entradas de acciones |
| Service worker escrito a mano | Control total: no se cachean páginas ni datos personales |
| Montserrat (vía `@fontsource-variable`) | Sans geométrica servida localmente, sin peticiones a terceros |
| Iconos SVG propios | Coherencia lineal y cero dependencias |
| Demo con cookie | Funciona igual en local y en serverless sin base de datos |
