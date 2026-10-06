-- Pruebas de "Solicitar acceso" y del listado de miembros. Cualquier fallo aborta con error.
\set ON_ERROR_STOP on
begin;

insert into public.member_allowlist (email, display_name, territory, role) values
  ('admin@example.org', 'Admin', 'euskadi', 'administracion'),
  ('regional@example.org', 'Regional', 'euskadi', 'direccion_euskadi'),
  ('prov@example.org', 'Prov', 'bizkaia', 'direccion_provincial'),
  ('afi.bizkaia@example.org', 'Afi Bizkaia', 'bizkaia', 'afiliado'),
  ('afi.alava@example.org', 'Afi Álava', 'alava', 'afiliado');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.org'),
  ('00000000-0000-0000-0000-0000000000a2', 'regional@example.org'),
  ('00000000-0000-0000-0000-0000000000b1', 'prov@example.org'),
  ('00000000-0000-0000-0000-0000000000c1', 'afi.bizkaia@example.org'),
  ('00000000-0000-0000-0000-0000000000c2', 'afi.alava@example.org'),
  -- solicitantes (sin perfil)
  ('00000000-0000-0000-0000-0000000000d1', 'nuevo.bizkaia@example.org'),
  ('00000000-0000-0000-0000-0000000000d3', 'futuro.director@example.org'),
  ('00000000-0000-0000-0000-0000000000d4', 'spam@example.org');
insert into public.access_requests (id, user_id, email, display_name, territory) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000d1', 'nuevo.bizkaia@example.org', 'Nuevo Bizkaia', 'bizkaia'),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-0000000000d3', 'futuro.director@example.org', 'Futuro Director', 'bizkaia'),
  ('00000000-0000-0000-0000-00000000e004', '00000000-0000-0000-0000-0000000000d4', 'spam@example.org', 'Spam', 'gipuzkoa');

do $$ begin
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'), 'los solicitantes no tienen perfil';
end $$;

set local role authenticated;

-- Afiliado: no ve solicitudes ni miembros, no aprueba, no lee la tabla.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  assert (select count(*) from public.list_access_requests()) = 0, 'un afiliado no ve solicitudes';
  assert (select count(*) from public.list_members()) = 0, 'un afiliado no ve el listado';
  begin
    perform public.approve_access_request('00000000-0000-0000-0000-00000000e001');
    raise exception 'un afiliado no debe aprobar';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.access_requests;
    raise exception 'la tabla no debe ser legible';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dirección provincial de Bizkaia: listado de su provincia; no aprueba.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select count(*) from public.list_access_requests()) = 0, 'la provincial no ve solicitudes';
  assert (select count(*) from public.list_members()) = 2, 'Bizkaia ve sus 2 miembros';
  assert not exists (select 1 from public.list_members() where territory <> 'bizkaia'), 'solo Bizkaia';
  assert (select email from public.list_members() where display_name = 'Afi Bizkaia') = 'afi.bizkaia@example.org', 'con email';
  begin
    perform public.approve_access_request('00000000-0000-0000-0000-00000000e001');
    raise exception 'la provincial no aprueba';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dirección regional: listado completo; no aprueba.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  assert (select count(*) from public.list_members()) = 5, 'la regional ve a todos';
  begin
    perform public.reject_access_request('00000000-0000-0000-0000-00000000e004');
    raise exception 'la regional no rechaza';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Administración: ve las solicitudes, aprueba con rol y rechaza.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  assert (select count(*) from public.list_access_requests()) = 3, 'admin ve todas las pendientes';
  perform public.approve_access_request('00000000-0000-0000-0000-00000000e001');
  perform public.approve_access_request('00000000-0000-0000-0000-00000000e003', 'direccion_provincial');
  perform public.reject_access_request('00000000-0000-0000-0000-00000000e004');
  assert (select count(*) from public.list_access_requests()) = 0, 'no quedan pendientes';
  assert (select count(*) from public.list_members()) = 7, 'los aprobados aparecen en el listado';
  begin
    perform public.approve_access_request('00000000-0000-0000-0000-00000000e001');
    raise exception 'no se aprueba dos veces';
  exception when no_data_found then null;
  end;
end $$;

reset role;
do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000d1') = 'afiliado', 'afiliado por defecto';
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000d3') = 'direccion_provincial', 'rol asignado';
  assert (select role from public.member_allowlist where email = 'futuro.director@example.org') = 'direccion_provincial', 'y en la lista de alta';
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d4'), 'rechazar borra la cuenta';
  assert not exists (select 1 from public.access_requests where id = '00000000-0000-0000-0000-00000000e004'), 'y la solicitud';
end $$;

-- Anónimo: nada.
set local role anon;
do $$ begin
  begin
    perform public.list_members();
    raise exception 'anon no debe listar miembros';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
\echo 'OK: pruebas de solicitudes de acceso y listado de miembros superadas'
