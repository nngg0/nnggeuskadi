-- =====================================================================
-- NNGG Euskadi · Esquema inicial
--
-- Principio: aquí viven SOLO los datos personales y sus relaciones.
-- Actividades, proyectos, oportunidades y documentos viven en Google Sheets;
-- se referencian por su id de texto (p. ej. 'ACT-031', 'PRY-001').
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------

create table public.territories (
  id   text primary key,
  name text not null
);

insert into public.territories (id, name) values
  ('euskadi', 'Euskadi'), ('alava', 'Álava'), ('bizkaia', 'Bizkaia'), ('gipuzkoa', 'Gipuzkoa');

-- Roles extensibles: añadir un rol = insertar una fila + definir sus permisos en
-- src/lib/auth/permissions.ts y, si gestiona datos, en public.can_manage_territory().
create table public.roles (
  id          text primary key,
  description text not null
);

insert into public.roles (id, description) values
  ('afiliado', 'Afiliado de NNGG Euskadi'),
  ('direccion_euskadi', 'Dirección de NNGG Euskadi: gestiona el conjunto de Euskadi'),
  ('direccion_provincial', 'Dirección provincial: gestiona su territorio');

-- ---------------------------------------------------------------------
-- Alta autorizada de afiliados
-- Nadie entra solo por registrarse: el email debe estar en esta lista.
-- La gestionan personas con la service role (script `npm run invite`) o el panel de Supabase.
-- ---------------------------------------------------------------------

create table public.member_allowlist (
  -- Siempre en minúsculas para comparar sin ambigüedad.
  email        text primary key check (email = lower(email) and position('@' in email) > 1),
  display_name text not null check (char_length(display_name) between 1 and 80),
  territory    text not null references public.territories (id),
  role         text not null default 'afiliado' references public.roles (id),
  created_at   timestamptz not null default now(),
  constraint provincial_needs_province check (role <> 'direccion_provincial' or territory <> 'euskadi')
);

-- ---------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  territory    text not null references public.territories (id),
  role         text not null default 'afiliado' references public.roles (id),
  settings     jsonb not null default '{"notifyNewInitiatives": true}'::jsonb
                 check (jsonb_typeof(settings) = 'object'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint provincial_needs_province check (role <> 'direccion_provincial' or territory <> 'euskadi')
);

-- ---------------------------------------------------------------------
-- Inscripciones a actividades
-- ---------------------------------------------------------------------

create table public.event_registrations (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null check (event_id ~ '^[A-Za-z0-9_.-]{1,64}$'),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  -- Territorio de la actividad en el momento de inscribirse (para permisos de gestión).
  territory  text not null references public.territories (id),
  -- Respuestas a preguntas adicionales configurables por evento (transporte, acompañante...).
  answers    jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  -- Una persona solo puede estar inscrita una vez en cada actividad.
  constraint event_registrations_unique unique (event_id, user_id)
);

create index event_registrations_user_idx on public.event_registrations (user_id);
create index event_registrations_territory_idx on public.event_registrations (territory);

-- ---------------------------------------------------------------------
-- Participación en proyectos ("Quiero participar")
-- ---------------------------------------------------------------------

create table public.project_participations (
  id              uuid primary key default gen_random_uuid(),
  project_id      text not null check (project_id ~ '^[A-Za-z0-9_.-]{1,64}$'),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  territory       text not null references public.territories (id),
  -- Oportunidades (ámbitos) elegidas: ids de la hoja OPORTUNIDADES.
  opportunity_ids text[] not null check (cardinality(opportunity_ids) between 1 and 20),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint project_participations_unique unique (project_id, user_id)
);

create index project_participations_user_idx on public.project_participations (user_id);
create index project_participations_opps_idx on public.project_participations using gin (opportunity_ids);

-- ---------------------------------------------------------------------
-- Documentos guardados
-- ---------------------------------------------------------------------

create table public.saved_documents (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  document_id text not null check (document_id ~ '^[A-Za-z0-9_.-]{1,64}$'),
  created_at  timestamptz not null default now(),
  primary key (user_id, document_id)
);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger project_participations_touch before update on public.project_participations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Alta: al crearse un usuario en auth.users, se crea su perfil SOLO si está autorizado.
-- Los metadatos que envía el usuario NO se usan para rol ni territorio.
-- ---------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  allowed public.member_allowlist%rowtype;
begin
  select * into allowed from public.member_allowlist where email = lower(new.email);
  if found then
    insert into public.profiles (id, display_name, territory, role)
    values (new.id, allowed.display_name, allowed.territory, allowed.role)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------

create function public.current_role_id() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ¿Puede el usuario actual gestionar (ver listados nominales de) un territorio?
-- Debe coincidir con src/lib/auth/permissions.ts
create function public.can_manage_territory(t text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'direccion_euskadi'
        or (p.role = 'direccion_provincial' and p.territory = t)
      )
  )
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.territories enable row level security;
alter table public.roles enable row level security;
alter table public.member_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.event_registrations enable row level security;
alter table public.project_participations enable row level security;
alter table public.saved_documents enable row level security;

create policy "catálogo legible" on public.territories for select to authenticated using (true);
create policy "roles legibles" on public.roles for select to authenticated using (true);
-- member_allowlist: sin políticas => inaccesible salvo service role.

-- Perfiles: cada uno ve y edita el suyo. Nadie ve perfiles ajenos directamente.
create policy "ver mi perfil" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "editar mi perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Permisos de tabla explícitos (no depender de los privilegios por defecto del proyecto).
-- RLS decide además QUÉ filas ve o modifica cada usuario.
revoke all on public.territories, public.roles, public.member_allowlist, public.profiles,
  public.event_registrations, public.project_participations, public.saved_documents from anon, authenticated;
grant select on public.territories, public.roles, public.profiles, public.event_registrations,
  public.project_participations, public.saved_documents to authenticated;
grant insert, update, delete on public.project_participations, public.saved_documents to authenticated;
grant all on public.territories, public.roles, public.member_allowlist, public.profiles,
  public.event_registrations, public.project_participations, public.saved_documents to service_role;

-- Solo se pueden modificar nombre visible y ajustes: rol y territorio los fija la organización.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, settings) on public.profiles to authenticated;

-- Inscripciones: el usuario ve las suyas. Altas y bajas pasan por funciones que controlan plazas.
create policy "ver mis inscripciones" on public.event_registrations for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.event_registrations from authenticated, anon;

-- Participaciones: el usuario gestiona las suyas.
create policy "ver mis participaciones" on public.project_participations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "crear mi participación" on public.project_participations for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "editar mi participación" on public.project_participations for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "retirar mi participación" on public.project_participations for delete to authenticated
  using (user_id = (select auth.uid()));

-- Documentos guardados: solo los propios.
create policy "mis documentos guardados" on public.saved_documents for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Agregados (sin datos personales): visibles para cualquier afiliado.
-- ---------------------------------------------------------------------

create function public.event_registration_counts(event_ids text[])
returns table (event_id text, registered integer)
language sql stable security definer set search_path = '' as $$
  select r.event_id, count(*)::integer
  from public.event_registrations r
  where r.event_id = any (event_ids)
    and exists (select 1 from public.profiles where id = auth.uid())
  group by r.event_id
$$;

create function public.participation_counts(project_ids text[])
returns table (project_id text, opportunity_id text, participants integer)
language sql stable security definer set search_path = '' as $$
  -- opportunity_id null = total de personas del proyecto
  select pp.project_id, null::text, count(*)::integer
  from public.project_participations pp
  where pp.project_id = any (project_ids)
    and exists (select 1 from public.profiles where id = auth.uid())
  group by pp.project_id
  union all
  select pp.project_id, o.opportunity_id, count(*)::integer
  from public.project_participations pp
  cross join lateral unnest(pp.opportunity_ids) as o (opportunity_id)
  where pp.project_id = any (project_ids)
    and exists (select 1 from public.profiles where id = auth.uid())
  group by pp.project_id, o.opportunity_id
$$;

-- ---------------------------------------------------------------------
-- Inscripción atómica con control de plazas.
-- El aforo y los plazos están en el Sheet: el servidor los valida y llama a esta función
-- con la service role. No es ejecutable por usuarios, para que nadie pueda saltarse el aforo.
-- ---------------------------------------------------------------------

create function public.register_for_event(
  p_user_id uuid, p_event_id text, p_territory text, p_capacity integer, p_answers jsonb default '{}'::jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  current_count integer;
begin
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'capacidad no válida';
  end if;
  -- Serializa las inscripciones de una misma actividad para que el aforo no se supere.
  perform pg_advisory_xact_lock(hashtextextended('event:' || p_event_id, 0));

  if exists (select 1 from public.event_registrations where event_id = p_event_id and user_id = p_user_id) then
    return 'already';
  end if;

  if p_capacity is not null then
    select count(*) into current_count from public.event_registrations where event_id = p_event_id;
    if current_count >= p_capacity then
      return 'full';
    end if;
  end if;

  insert into public.event_registrations (event_id, user_id, territory, answers)
  values (p_event_id, p_user_id, p_territory, coalesce(p_answers, '{}'::jsonb));
  return 'ok';
end $$;

create function public.cancel_event_registration(p_user_id uuid, p_event_id text) returns void
language sql security definer set search_path = '' as $$
  delete from public.event_registrations where event_id = p_event_id and user_id = p_user_id
$$;

revoke all on function public.register_for_event(uuid, text, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_event_registration(uuid, text) from public, anon, authenticated;
grant execute on function public.register_for_event(uuid, text, text, integer, jsonb) to service_role;
grant execute on function public.cancel_event_registration(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- Listados nominales para la dirección (solo nombre visible, nunca email ni teléfono).
-- El permiso se comprueba aquí, en base de datos, además de en la aplicación.
-- ---------------------------------------------------------------------

create function public.list_event_registrants(p_event_id text)
returns table (display_name text, territory text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.display_name, p.territory, r.created_at
  from public.event_registrations r
  join public.profiles p on p.id = r.user_id
  where r.event_id = p_event_id
    and public.can_manage_territory(r.territory)
  order by r.created_at
$$;

create function public.list_project_participants(p_project_id text)
returns table (display_name text, territory text, opportunity_ids text[], created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.display_name, p.territory, pp.opportunity_ids, pp.created_at
  from public.project_participations pp
  join public.profiles p on p.id = pp.user_id
  where pp.project_id = p_project_id
    and public.can_manage_territory(pp.territory)
  order by pp.created_at
$$;

-- Funciones de lectura: solo para usuarios autenticados.
revoke all on function public.event_registration_counts(text[]) from public, anon;
revoke all on function public.participation_counts(text[]) from public, anon;
revoke all on function public.list_event_registrants(text) from public, anon;
revoke all on function public.list_project_participants(text) from public, anon;
revoke all on function public.can_manage_territory(text) from public, anon;
revoke all on function public.current_role_id() from public, anon;
grant execute on function public.event_registration_counts(text[]) to authenticated;
grant execute on function public.participation_counts(text[]) to authenticated;
grant execute on function public.list_event_registrants(text) to authenticated;
grant execute on function public.list_project_participants(text) to authenticated;
grant execute on function public.can_manage_territory(text) to authenticated;
grant execute on function public.current_role_id() to authenticated;

-- ---------------------------------------------------------------------
-- Agregados para el Sheet (endpoint /api/agregados, service role): sin nombres.
-- ---------------------------------------------------------------------

create function public.aggregate_counts()
returns table (kind text, content_id text, total integer)
language sql stable security definer set search_path = '' as $$
  select 'actividad', event_id, count(*)::integer from public.event_registrations group by event_id
  union all
  select 'oportunidad', o.opportunity_id, count(*)::integer
  from public.project_participations pp cross join lateral unnest(pp.opportunity_ids) as o (opportunity_id)
  group by o.opportunity_id
$$;

revoke all on function public.aggregate_counts() from public, anon, authenticated;
grant execute on function public.aggregate_counts() to service_role;
