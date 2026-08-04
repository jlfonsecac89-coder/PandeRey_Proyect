-- Los permisos a nivel de tabla (GRANT) son el "portón" que debe estar abierto antes
-- de que RLS pueda filtrar filas — sin esto, Postgres rechaza con "permission denied"
-- (42501) incluso para las políticas que sí deberían permitir acceso. El editor de
-- Supabase hace este grant automáticamente al crear tablas desde la UI; como estas
-- tablas se crearon por SQL directo, hay que otorgarlo explícitamente. El control de
-- acceso real sigue siendo 100% RLS (sección 10) — esto solo abre la puerta para que
-- las políticas puedan evaluarse. service_role también lo necesita: BYPASSRLS solo
-- salta la evaluación de políticas, no el chequeo de privilegios base de la tabla.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
