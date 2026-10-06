-- Intereses del afiliado (máximo 3). Debe coincidir con src/lib/domain/interests.ts
alter table public.profiles
  add column interests text[] not null default '{}'
  constraint profiles_interests_valid check (
    cardinality(interests) <= 3
    and interests <@ array['calle', 'inmigracion', 'seguridad', 'justicia', 'economia', 'vivienda', 'debate', 'organizacion']
  );

-- El propio usuario puede editar sus intereses (además de nombre visible y ajustes).
grant update (interests) on public.profiles to authenticated;
