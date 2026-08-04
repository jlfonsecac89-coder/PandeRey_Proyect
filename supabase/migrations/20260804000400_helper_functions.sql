-- Funciones auxiliares para políticas RLS. SECURITY DEFINER porque necesitan leer
-- `profiles` (con RLS habilitado) sin recursión infinita de políticas; cada una
-- está atada a auth.uid(), así que nunca exponen datos de otro usuario.
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.current_store_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select store_id from profiles where id = auth.uid()
$$;

-- Trigger: crea automáticamente la fila de `profiles` al registrarse un nuevo
-- usuario en auth.users (customer por defecto; el staff se crea aparte, sección 08).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger genérico para mantener `updated_at` en las tablas que lo usan.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- Políticas de `profiles` que dependen de current_role()/current_store_id() ---

create policy "admin_select_all_profiles" on profiles
  for select using (current_role() = 'admin');

create policy "admin_update_non_admin_profiles" on profiles
  for update using (current_role() = 'admin' and role <> 'admin')
  with check (role in ('customer', 'marketing', 'operaciones', 'repartidor'));
  -- el with check hace imposible, incluso vía RLS, transformar una fila en role='admin':
  -- una cuenta Admin solo se crea manualmente en Supabase con service_role (sección 08).

create policy "marketing_select_customer_profiles" on profiles
  for select using (current_role() = 'marketing' and role = 'customer');
  -- CRM: Marketing ve clientes de todas las sucursales (sección 09), nunca otro staff.

-- Las políticas de "operaciones" y "repartidor" sobre `profiles` (ver un cliente solo
-- en el contexto de un pedido) se agregan en 20260804000900_orders.sql, porque
-- necesitan referenciar la tabla `orders`, que todavía no existe en este punto.
