-- Mantiene profiles.points_balance como cache de la suma de points_ledger.points
-- (la fuente de verdad es el ledger, sección 05).
create or replace function public.sync_points_balance()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_user uuid;
begin
  target_user := coalesce(new.user_id, old.user_id);
  update profiles
    set points_balance = (select coalesce(sum(points), 0) from points_ledger where user_id = target_user)
    where id = target_user;
  return coalesce(new, old);
end;
$$;

create trigger points_ledger_sync_balance
  after insert or update or delete on points_ledger
  for each row execute function sync_points_balance();

-- Mantiene store_products.stock_quantity como cache de la suma de lotes activos
-- en product_batches (la fuente de verdad real es el lote, sección 13).
create or replace function public.sync_store_product_stock()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_store uuid;
  target_product uuid;
begin
  target_store := coalesce(new.store_id, old.store_id);
  target_product := coalesce(new.product_id, old.product_id);

  insert into store_products (store_id, product_id, stock_quantity)
  values (
    target_store,
    target_product,
    (select coalesce(sum(quantity), 0) from product_batches where store_id = target_store and product_id = target_product)
  )
  on conflict (store_id, product_id)
    do update set stock_quantity = excluded.stock_quantity;

  return coalesce(new, old);
end;
$$;

create trigger product_batches_sync_stock
  after insert or update or delete on product_batches
  for each row execute function sync_store_product_stock();

-- Impide que un usuario "normal" (no admin) modifique campos sensibles de su propia
-- fila en `profiles` a través de la política self_update_profile — RLS por sí sola
-- protege la FILA, no columnas específicas, así que esto es defensa adicional a nivel
-- de columna. Las conexiones con service_role (Server Actions de sistema, triggers
-- internos) no tienen auth.uid(), por lo que current_role() da NULL y este chequeo
-- se salta naturalmente para esos flujos de confianza.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if current_role() <> 'admin' then
    if new.role is distinct from old.role
      or new.points_balance is distinct from old.points_balance
      or new.rut_encrypted is distinct from old.rut_encrypted
      or new.is_active is distinct from old.is_active
      or new.store_id is distinct from old.store_id
      or new.anonymized_at is distinct from old.anonymized_at
      or new.must_change_password is distinct from old.must_change_password
    then
      raise exception 'No autorizado para modificar campos protegidos de profiles';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on profiles
  for each row execute function protect_profile_columns();
