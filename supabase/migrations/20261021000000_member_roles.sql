-- =====================================================================
-- Administración cambia desde la web el rol (y, si hace falta, la provincia) de un miembro.
-- - Solo Administración (is_admin). Nadie puede quitarse a sí mismo el rol de Administración,
--   para que la intranet nunca se quede sin quien apruebe altas.
-- - Afiliados y direcciones provinciales pertenecen a una provincia (Álava, Bizkaia, Gipuzkoa);
--   Euskadi solo para la dirección regional y Administración.
-- - Se actualiza también member_allowlist para que el alta autorizada sea coherente.
-- list_members devuelve ahora el id del perfil para poder dirigirse a cada persona.
-- =====================================================================

drop function public.list_members();

create function public.list_members()
returns table (id uuid, display_name text, email text, territory text, role text, interests text[], created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, u.email::text, p.territory, p.role, p.interests, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.can_manage_territory(p.territory)
  order by p.territory, p.display_name
$$;

create function public.set_member_role(p_user_id uuid, p_role text, p_territory text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_territory text;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Solo Administración cambia roles' using errcode = '42501';
  end if;
  if not exists (select 1 from public.roles where id = p_role) then
    raise exception 'invalid_role: rol no válido' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() and p_role <> 'administracion' then
    raise exception 'cannot_demote_self: no puedes quitarte el rol de Administración' using errcode = '42501';
  end if;

  select coalesce(p_territory, p.territory) into v_territory from public.profiles p where p.id = p_user_id for update;
  if not found then
    raise exception 'member_not_found: miembro no encontrado' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.territories where id = v_territory) then
    raise exception 'invalid_territory: territorio no válido' using errcode = '22023';
  end if;
  if p_role in ('afiliado', 'direccion_provincial') and v_territory = 'euskadi' then
    raise exception 'missing_province: elige Álava, Bizkaia o Gipuzkoa' using errcode = '22023';
  end if;

  update public.profiles set role = p_role, territory = v_territory where id = p_user_id;

  select lower(u.email) into v_email from auth.users u where u.id = p_user_id;
  update public.member_allowlist set role = p_role, territory = v_territory where email = v_email;
end $$;

revoke all on function public.list_members() from public, anon;
grant execute on function public.list_members() to authenticated;
revoke all on function public.set_member_role(uuid, text, text) from public, anon;
grant execute on function public.set_member_role(uuid, text, text) to authenticated;
