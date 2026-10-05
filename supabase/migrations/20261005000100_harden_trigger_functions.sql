-- Las funciones de trigger no deben poder llamarse por la API (/rest/v1/rpc/...).
-- Siguen funcionando como triggers: Postgres no comprueba EXECUTE al dispararlas.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
