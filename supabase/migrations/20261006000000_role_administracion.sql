-- Rol "Administración": administra la intranet. De momento, mismos permisos que la dirección regional
-- (ve los listados nominales de todos los territorios). Debe coincidir con src/lib/auth/permissions.ts
insert into public.roles (id, description)
values ('administracion', 'Administración de la intranet')
on conflict (id) do nothing;

create or replace function public.can_manage_territory(t text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('direccion_euskadi', 'administracion')
        or (p.role = 'direccion_provincial' and p.territory = t)
      )
  )
$$;
