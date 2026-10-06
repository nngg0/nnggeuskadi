-- =====================================================================
-- Solicitudes de acceso
-- La persona crea su cuenta (email + contraseña) desde "Solicitar acceso", pero no tiene perfil
-- y por tanto no ve nada hasta que Administración la aprueba.
-- Además: listado de miembros para la dirección (provincial: su territorio; regional y admin: todos).
-- =====================================================================

create table public.access_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  email        text not null check (email = lower(email) and position('@' in email) > 1),
  display_name text not null check (char_length(display_name) between 2 and 80),
  territory    text not null references public.territories (id),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles (id) on delete set null
);

create index access_requests_pending_idx on public.access_requests (status, territory);
create index access_requests_reviewed_by_idx on public.access_requests (reviewed_by);

-- Sin políticas: nadie la lee directamente. Las altas las hace el servidor (service role)
-- y la gestión pasa por las funciones de abajo, que comprueban permisos.
alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon, authenticated;
grant all on public.access_requests to service_role;

-- Solo Administración aprueba o rechaza solicitudes (y asigna roles).
-- Debe coincidir con src/lib/auth/permissions.ts ('members.approve')
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administracion')
$$;

create function public.list_access_requests()
returns table (id uuid, email text, display_name text, territory text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.email, r.display_name, r.territory, r.created_at
  from public.access_requests r
  where r.status = 'pending' and public.is_admin()
  order by r.created_at
$$;

create function public.approve_access_request(p_id uuid, p_role text default 'afiliado') returns void
language plpgsql security definer set search_path = '' as $$
declare
  req public.access_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo Administración aprueba solicitudes' using errcode = '42501';
  end if;
  select * into req from public.access_requests where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Solicitud no encontrada o ya revisada' using errcode = 'P0002';
  end if;

  insert into public.member_allowlist (email, display_name, territory, role)
  values (req.email, req.display_name, req.territory, coalesce(p_role, 'afiliado'))
  on conflict (email) do update
    set display_name = excluded.display_name, territory = excluded.territory, role = excluded.role;

  insert into public.profiles (id, display_name, territory, role)
  values (req.user_id, req.display_name, req.territory, coalesce(p_role, 'afiliado'))
  on conflict (id) do update set territory = excluded.territory, role = excluded.role;

  update public.access_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id;
end $$;

-- Rechazar borra la cuenta creada (si no llegó a tener perfil): no se guardan datos de quien no entra.
create function public.reject_access_request(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  req public.access_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo Administración rechaza solicitudes' using errcode = '42501';
  end if;
  select * into req from public.access_requests where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Solicitud no encontrada o ya revisada' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.profiles where id = req.user_id) then
    update public.access_requests
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_id;
  else
    delete from auth.users where id = req.user_id; -- en cascada borra la solicitud
  end if;
end $$;

-- Listado de miembros para la dirección: provincial, su territorio; regional y Administración, todos.
create function public.list_members()
returns table (display_name text, email text, territory text, role text, interests text[], created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.display_name, u.email::text, p.territory, p.role, p.interests, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.can_manage_territory(p.territory)
  order by p.territory, p.display_name
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.list_members() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.list_members() to authenticated;
revoke all on function public.list_access_requests() from public, anon;
revoke all on function public.approve_access_request(uuid, text) from public, anon;
revoke all on function public.reject_access_request(uuid) from public, anon;
grant execute on function public.list_access_requests() to authenticated;
grant execute on function public.approve_access_request(uuid, text) to authenticated;
grant execute on function public.reject_access_request(uuid) to authenticated;
