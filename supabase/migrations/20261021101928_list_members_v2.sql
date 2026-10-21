-- =====================================================================
-- Listado de miembros con id (para cambiar roles) y marca de Junta Directiva.
-- Es una función nueva en lugar de cambiar list_members(): así no hay que borrar nada y la versión
-- anterior de la web sigue funcionando hasta que se despliegue la nueva. list_members() queda sin uso.
-- Mismo criterio de acceso: la provincial, su territorio; la regional y Administración, todos.
-- =====================================================================

create or replace function public.list_members_v2()
returns table (id uuid, display_name text, email text, territory text, role text, interests text[], created_at timestamptz, junta_directiva boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, u.email::text, p.territory, p.role, p.interests, p.created_at, p.junta_directiva
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.can_manage_territory(p.territory)
  order by p.territory, p.display_name
$$;

revoke all on function public.list_members_v2() from public, anon;
grant execute on function public.list_members_v2() to authenticated;
