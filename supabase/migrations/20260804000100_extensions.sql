-- Requeridas por el modelo de datos (BLUEPRINT.md sección 05/13):
-- unaccent: deduplicación de nombres (departments/categories/collections/products.name_normalized)
create extension if not exists unaccent;
create extension if not exists pgcrypto;

-- unaccent() viene marcada STABLE (no IMMUTABLE) en Postgres, porque en teoría el
-- diccionario podría cambiar en tiempo de ejecución — pero las columnas GENERATED
-- ALWAYS AS exigen una expresión IMMUTABLE. Este wrapper fija el diccionario y le
-- promete a Postgres que el resultado es determinístico (patrón estándar para este
-- caso, el diccionario "unaccent" no cambia en producción).
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1)
$$;
