-- Pruebas de seguridad y reglas de negocio del esquema. Cualquier fallo aborta con error.
\set ON_ERROR_STOP on
begin;

-- Alta autorizada: solo los emails de la lista obtienen perfil.
insert into public.member_allowlist (email, display_name, territory, role) values
  ('ane@example.org', 'Ane', 'alava', 'afiliado'),
  ('jon@example.org', 'Jon', 'bizkaia', 'direccion_provincial'),
  ('laura@example.org', 'Laura', 'euskadi', 'direccion_euskadi');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'Ane@Example.org'),
  ('00000000-0000-0000-0000-00000000000b', 'jon@example.org'),
  ('00000000-0000-0000-0000-00000000000c', 'laura@example.org'),
  ('00000000-0000-0000-0000-00000000000d', 'intruso@example.org');

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'deben crearse 3 perfiles';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000d'), 'un email no autorizado no tiene perfil';
end $$;

-- Inscripción con aforo (service role).
set local role service_role;
do $$ begin
  assert public.register_for_event('00000000-0000-0000-0000-00000000000a', 'ACT-1', 'bizkaia', 2) = 'ok', 'primera inscripción';
  assert public.register_for_event('00000000-0000-0000-0000-00000000000a', 'ACT-1', 'bizkaia', 2) = 'already', 'duplicado detectado';
  assert public.register_for_event('00000000-0000-0000-0000-00000000000b', 'ACT-1', 'bizkaia', 2) = 'ok', 'segunda plaza';
  assert public.register_for_event('00000000-0000-0000-0000-00000000000c', 'ACT-1', 'bizkaia', 2) = 'full', 'aforo completo';
  assert public.register_for_event('00000000-0000-0000-0000-00000000000c', 'ACT-2', 'alava', null) = 'ok', 'sin límite';
  perform public.cancel_event_registration('00000000-0000-0000-0000-00000000000b', 'ACT-1');
  assert public.register_for_event('00000000-0000-0000-0000-00000000000c', 'ACT-1', 'bizkaia', 2) = 'ok', 'plaza liberada tras cancelar';
end $$;
reset role;

-- La restricción única impide duplicados aunque se inserte directamente.
do $$ begin
  begin
    insert into public.event_registrations (event_id, user_id, territory) values ('ACT-1', '00000000-0000-0000-0000-00000000000a', 'bizkaia');
    raise exception 'debía fallar por duplicado';
  exception when unique_violation then null;
  end;
end $$;

-- Como afiliada (Ane): solo ve lo suyo y no puede saltarse el aforo.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.event_registrations) = 1, 'Ane solo ve su inscripción';
  assert (select count(*) from public.profiles) = 1, 'Ane solo ve su perfil';
  assert (select registered from public.event_registration_counts(array['ACT-1'])) = 2, 'agregado visible';
  assert (select count(*) from public.list_event_registrants('ACT-1')) = 0, 'una afiliada no ve listados nominales';
  begin
    perform public.register_for_event('00000000-0000-0000-0000-00000000000a', 'ACT-9', 'alava', 999);
    raise exception 'un afiliado no debe poder llamar a register_for_event';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.event_registrations (event_id, user_id, territory) values ('ACT-9', '00000000-0000-0000-0000-00000000000a', 'alava');
    raise exception 'insert directo debía estar prohibido';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set role = 'direccion_euskadi' where id = auth.uid();
    raise exception 'no debe poder cambiarse el rol';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.member_allowlist;
    raise exception 'la lista de alta no debe ser legible';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.profiles set display_name = 'Ane R.' where id = auth.uid();

-- Participación: propia sí, ajena no.
insert into public.project_participations (project_id, user_id, territory, opportunity_ids)
  values ('PRY-1', '00000000-0000-0000-0000-00000000000a', 'bizkaia', array['OP-1', 'OP-2']);
do $$ begin
  begin
    insert into public.project_participations (project_id, user_id, territory, opportunity_ids)
      values ('PRY-1', '00000000-0000-0000-0000-00000000000b', 'bizkaia', array['OP-1']);
    raise exception 'no debe poder inscribir a otra persona';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.saved_documents (user_id, document_id) values ('00000000-0000-0000-0000-00000000000a', 'DOC-1');

-- Dirección provincial de Bizkaia: ve nombres de su territorio, no de otros.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.list_event_registrants('ACT-1')) = 2, 'Bizkaia ve inscritos de Bizkaia';
  assert (select count(*) from public.list_event_registrants('ACT-2')) = 0, 'Bizkaia no ve inscritos de Álava';
  assert (select display_name from public.list_project_participants('PRY-1')) = 'Ane R.', 've a quien se ofrece';
  assert (select count(*) from public.saved_documents) = 0, 'no ve documentos guardados ajenos';
  assert (select participants from public.participation_counts(array['PRY-1']) where opportunity_id = 'OP-2') = 1, 'contador por oportunidad';
end $$;

-- Dirección Euskadi: ve todos los territorios.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.list_event_registrants('ACT-2')) = 1, 'Euskadi ve Álava';
end $$;

-- Anónimo: nada.
set local role anon;
do $$ begin
  begin
    perform public.event_registration_counts(array['ACT-1']);
    raise exception 'anon no debe ejecutar funciones';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.event_registrations;
    raise exception 'anon no debe poder leer inscripciones';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
\echo 'OK: todas las pruebas de base de datos han pasado'
