-- Pruebas del cambio de rol de miembros desde la web. Cualquier fallo aborta con error.
\set ON_ERROR_STOP on
begin;

insert into public.member_allowlist (email, display_name, territory, role) values
  ('admin@example.org', 'Admin', 'euskadi', 'administracion'),
  ('regional@example.org', 'Regional', 'euskadi', 'direccion_euskadi'),
  ('prov@example.org', 'Prov', 'bizkaia', 'direccion_provincial'),
  ('afi@example.org', 'Afi', 'alava', 'afiliado');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.org'),
  ('00000000-0000-0000-0000-0000000000a2', 'regional@example.org'),
  ('00000000-0000-0000-0000-0000000000b1', 'prov@example.org'),
  ('00000000-0000-0000-0000-0000000000c1', 'afi@example.org');

set local role authenticated;

-- Quien no es Administración no cambia roles (ni la regional, ni la provincial, ni un afiliado consigo mismo).
do $$
declare who uuid;
begin
  foreach who in array array['00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1']::uuid[] loop
    perform set_config('request.jwt.claim.sub', who::text, true);
    begin
      perform public.set_member_role('00000000-0000-0000-0000-0000000000c1', 'direccion_euskadi');
      raise exception 'solo Administración cambia roles';
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- Administración: list_members trae el id; asciende, cambia de provincia y valida.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  assert (select id from public.list_members() where email = 'afi@example.org') = '00000000-0000-0000-0000-0000000000c1', 'list_members trae el id';

  perform public.set_member_role('00000000-0000-0000-0000-0000000000c1', 'direccion_provincial');
  perform public.set_member_role('00000000-0000-0000-0000-0000000000b1', 'afiliado', 'gipuzkoa');
  perform public.set_member_role('00000000-0000-0000-0000-0000000000a2', 'administracion');

  begin
    perform public.set_member_role('00000000-0000-0000-0000-0000000000c1', 'afiliado', 'euskadi');
    raise exception 'un afiliado necesita provincia';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_member_role('00000000-0000-0000-0000-0000000000c1', 'superusuario');
    raise exception 'rol inexistente';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_member_role('00000000-0000-0000-0000-0000000000a1', 'afiliado', 'alava');
    raise exception 'no puede quitarse Administración';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_member_role('00000000-0000-0000-0000-0000000000ff', 'afiliado');
    raise exception 'miembro inexistente';
  exception when no_data_found then null;
  end;
end $$;

reset role;
do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000c1') = 'direccion_provincial', 'ascendido';
  assert (select territory from public.profiles where id = '00000000-0000-0000-0000-0000000000c1') = 'alava', 'conserva su provincia';
  assert (select role || '/' || territory from public.profiles where id = '00000000-0000-0000-0000-0000000000b1') = 'afiliado/gipuzkoa', 'rol y provincia';
  assert (select role || '/' || territory from public.member_allowlist where email = 'prov@example.org') = 'afiliado/gipuzkoa', 'y en la lista de alta';
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a2') = 'administracion', 'nueva Administración';
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 'administracion', 'sigue siendo Administración';
end $$;

-- Los usuarios siguen sin poder tocar su propio rol directamente.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  begin
    update public.profiles set role = 'administracion' where id = '00000000-0000-0000-0000-0000000000b1';
    raise exception 'nadie se cambia su propio rol';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Anónimo: nada.
set local role anon;
do $$ begin
  begin
    perform public.set_member_role('00000000-0000-0000-0000-0000000000c1', 'afiliado');
    raise exception 'anon no cambia roles';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
\echo 'OK: pruebas de cambio de rol superadas'
