-- Fase 9 (hardening): cierra un gap real de la Fase 3 — la Aceptación 2 de
-- esa fase exigía que un producto `is_special_event` nunca venda más de
-- `max_orders` unidades, ni con compras concurrentes simultáneas, pero esa
-- validación nunca se conectó al checkout real construido en la Fase 4.
--
-- Un UPDATE con el chequeo de cupo en el WHERE es atómico por fila en
-- Postgres — dos requests concurrentes para el mismo producto se serializan
-- por el lock de fila, así que nunca se puede superar max_orders aunque
-- lleguen al mismo tiempo.
create or replace function public.reserve_special_event_stock(p_product_id uuid, p_quantity int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update products
  set special_orders_count = special_orders_count + p_quantity
  where id = p_product_id
    and is_special_event = true
    and max_orders is not null
    and special_orders_count + p_quantity <= max_orders;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Compensación si el checkout falla después de reservar cupo de más de un
-- producto de evento en el mismo carrito (todo o nada).
create or replace function public.release_special_event_stock(p_product_id uuid, p_quantity int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products
  set special_orders_count = greatest(special_orders_count - p_quantity, 0)
  where id = p_product_id;
end;
$$;

revoke all on function public.reserve_special_event_stock(uuid, int) from public, anon;
revoke all on function public.release_special_event_stock(uuid, int) from public, anon;
grant execute on function public.reserve_special_event_stock(uuid, int) to authenticated;
grant execute on function public.release_special_event_stock(uuid, int) to authenticated;
