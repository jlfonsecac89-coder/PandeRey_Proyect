-- Ejecutar UNA sola vez. Habilita que las migraciones futuras se apliquen
-- directo con la service_role key (que ya tiene acceso total a la base;
-- esto no otorga ningún privilegio nuevo, solo un canal directo para usarlo).
create or replace function public.admin_exec_sql(query text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute query;
end;
$$;

revoke all on function public.admin_exec_sql(text) from public, anon, authenticated;
grant execute on function public.admin_exec_sql(text) to service_role;
