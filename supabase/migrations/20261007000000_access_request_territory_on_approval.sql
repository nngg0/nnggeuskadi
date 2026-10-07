-- =====================================================================
-- "Solicitar acceso" ya no pide territorio: lo elige Administración al aprobar, junto con el rol.
-- Compatible con la versión anterior: p_territory es opcional y, si falta, se usa el de la solicitud.
-- =====================================================================

alter table public.access_requests alter column territory drop not null;

drop function public.approve_access_request(uuid, text);

create function public.approve_access_request(p_id uuid, p_role text default 'afiliado', p_territory text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  req public.access_requests%rowtype;
  v_territory text;
begin
  if not public.is_admin() then
    raise exception 'Solo Administración aprueba solicitudes' using errcode = '42501';
  end if;
  select * into req from public.access_requests where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Solicitud no encontrada o ya revisada' using errcode = 'P0002';
  end if;
  v_territory := coalesce(p_territory, req.territory);
  if v_territory is null then
    raise exception 'missing_territory: elige el territorio' using errcode = '22023';
  end if;

  insert into public.member_allowlist (email, display_name, territory, role)
  values (req.email, req.display_name, v_territory, coalesce(p_role, 'afiliado'))
  on conflict (email) do update
    set display_name = excluded.display_name, territory = excluded.territory, role = excluded.role;

  insert into public.profiles (id, display_name, territory, role)
  values (req.user_id, req.display_name, v_territory, coalesce(p_role, 'afiliado'))
  on conflict (id) do update set territory = excluded.territory, role = excluded.role;

  update public.access_requests
  set status = 'approved', territory = v_territory, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id;
end $$;

revoke all on function public.approve_access_request(uuid, text, text) from public, anon;
grant execute on function public.approve_access_request(uuid, text, text) to authenticated;
