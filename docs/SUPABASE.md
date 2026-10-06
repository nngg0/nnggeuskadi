# Supabase

Supabase guarda **solo** datos personales: usuarios, perfiles, inscripciones, participaciones y documentos guardados.

## 1. Crear el proyecto

1. Crea un proyecto en <https://supabase.com> (región UE recomendada, p. ej. Frankfurt).
2. **Authentication → Sign In / Providers → Email**: activado.
3. **Authentication → Sign In / Providers**: desactiva **«Allow new users to sign up»**. El alta es solo por invitación.
4. **Authentication → URL Configuration**:
   - *Site URL*: la URL de producción (p. ej. `https://intranet.nngg-euskadi.example`).
   - *Redirect URLs*: añade `https://TU-DOMINIO/auth/callback` (y `http://localhost:3000/auth/callback` para desarrollo).
5. **Project Settings → API**: copia `Project URL`, la clave `anon`/publishable y la `service_role`/secret a tus variables de entorno.

## 2. Aplicar las migraciones

Con la CLI de Supabase:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push        # aplica supabase/migrations/*.sql
```

O bien pega el contenido de `supabase/migrations/20261005000000_init.sql` en **SQL Editor** y ejecútalo.

## 3. Probar la migración en local (opcional)

Con cualquier PostgreSQL 15+ desechable:

```bash
docker run -d --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
```

`supabase/tests/10_rls_test.sql` comprueba: alta solo por lista, aforo, duplicados, que un afiliado no ve datos
de otros ni puede cambiarse el rol ni saltarse el aforo, y que la dirección solo ve su territorio.

## Esquema

| Tabla | Contenido | Claves y restricciones |
|---|---|---|
| `territories` | euskadi, alava, bizkaia, gipuzkoa | Catálogo |
| `roles` | afiliado, direccion_euskadi, direccion_provincial | Catálogo extensible |
| `member_allowlist` | Emails autorizados con nombre, territorio y rol | Solo service role. Email en minúsculas |
| `profiles` | 1:1 con `auth.users`: nombre visible, territorio, rol (`afiliado`, `direccion_provincial`, `direccion_euskadi`, `administracion`), ajustes e intereses (máx. 3) | `provincial_needs_province` |
| `event_registrations` | Inscripción de un usuario a una actividad del Sheet | `unique (event_id, user_id)`, `answers jsonb` para preguntas futuras |
| `project_participations` | Ofrecimiento a un proyecto con los ámbitos elegidos | `unique (project_id, user_id)`, `opportunity_ids text[]` (1–20) |
| `saved_documents` | Documentos guardados | PK `(user_id, document_id)` |

Todas con UUID/timestamps, claves foráneas con `on delete cascade` hacia el usuario e índices por usuario y territorio.

### RLS (resumen)

- Todas las tablas tienen RLS activado; las políticas son solo para `authenticated`.
- Cada usuario **lee** sus propias filas. Nadie lee perfiles ajenos.
- `profiles`: el usuario solo puede actualizar `display_name` y `settings` (privilegios de columna). Rol y territorio los fija la organización.
- `event_registrations`: sin INSERT/UPDATE/DELETE para usuarios. Se escribe con `register_for_event` /
  `cancel_event_registration`, ejecutables **solo por service role** desde el servidor, que antes ha validado
  plazos y aforo contra el Sheet. Así nadie puede saltarse el aforo llamando a la API directamente.
- `project_participations` y `saved_documents`: el usuario gestiona las suyas (`user_id = auth.uid()`).
- `member_allowlist`: sin políticas (inaccesible salvo service role).

### Funciones

| Función | Quién | Para qué |
|---|---|---|
| `handle_new_user()` (trigger) | sistema | Crea el perfil solo si el email está en `member_allowlist` |
| `event_registration_counts(ids)` | authenticated | Inscritos por actividad (sin nombres) |
| `participation_counts(ids)` | authenticated | Personas por proyecto y oportunidad (sin nombres) |
| `register_for_event(...)` | service_role | Inscripción atómica con bloqueo y control de aforo |
| `cancel_event_registration(...)` | service_role | Cancelación |
| `list_event_registrants(id)` | authenticated | Nombres de inscritos, **solo** si `can_manage_territory` |
| `list_project_participants(id)` | authenticated | Nombres de quienes se ofrecen, **solo** si `can_manage_territory` |
| `aggregate_counts()` | service_role | Cifras para `/api/agregados` |

## Alta de afiliados

### Solicitar acceso (recomendado, sin servidor de correo)

1. La persona entra en `/solicitar-acceso` (enlace en la pantalla de entrada) y deja nombre, email, territorio y una
   contraseña. Se crea su cuenta en Supabase **sin perfil**, así que no ve nada; si intenta entrar, ve «Tu solicitud está
   pendiente». Se guarda en `access_requests`.
2. **Solo Administración** la revisa en `/solicitudes` (aviso en Inicio y en Perfil → Gestión): aprueba eligiendo rol o
   rechaza. Aprobar añade el email a `member_allowlist` y crea el perfil; rechazar borra la cuenta creada.
3. La dirección ve el listado de miembros en `/miembros`: la provincial, su territorio; la regional y Administración, todos.

El email no se verifica (no hay SMTP): aprueba solo a quien conozcas. Si el email ya estaba autorizado, la persona entra
directamente.

### Otras formas de dar de alta

El procedimiento exacto de autorización está por decidir; la arquitectura lo deja preparado:

1. Alguien con acceso de confianza ejecuta:
   ```bash
   npm run invite -- --email ane@ejemplo.org --name "Ane Ruiz" --territory alava
   npm run invite -- --email jon@ejemplo.org --name "Jon Arana" --territory bizkaia --role direccion_provincial
   ```
2. El script añade el email a `member_allowlist` y Supabase envía la invitación.
3. Al abrir el enlace, la persona vuelve a la app (`/login`), que recoge la sesión del enlace y la lleva a
   `/actualizar-clave` para elegir contraseña.

También se puede invitar desde el panel: añadir la fila en `member_allowlist` (Table Editor) y después
**Authentication → Users → Add user → Send invitation**. O crear la cuenta con contraseña
(**Create new user**, marcando *Auto Confirm User*) y que la persona la cambie en Perfil.

### Envío de emails (importante)

El servidor de correo que trae Supabase por defecto **solo envía a los miembros del equipo del proyecto**
y tiene un límite muy bajo por hora. Para invitar a afiliados o que funcione «Recuperar acceso», configura
un SMTP propio en **Authentication → Emails → SMTP Settings**, por ejemplo:

- **Gmail** con una contraseña de aplicación (`smtp.gmail.com`, puerto 587). Sencillo para pocos envíos.
- **Resend**, **Brevo** u otro proveedor, con el dominio de la organización. Mejor para producción.

Si alguien consigue una cuenta sin estar en la lista, ve «Acceso pendiente» y no accede a nada (sin perfil, RLS no le devuelve datos).

Alternativas futuras sin tocar la app: importar `member_allowlist` desde el censo, o un formulario de solicitud que
la dirección apruebe insertando en esa tabla.

## Baja

Borrar el usuario en **Authentication → Users** elimina en cascada su perfil, inscripciones, participaciones y guardados.
Elimina también su fila de `member_allowlist`.
