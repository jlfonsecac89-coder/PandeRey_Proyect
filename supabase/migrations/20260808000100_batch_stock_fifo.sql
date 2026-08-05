-- Fase 11: el checkout nunca validó ni descontó stock real de
-- `product_batches` (solo `special_orders_count` para productos de evento,
-- cerrado en la Fase 9) — cualquier producto se podía vender sin límite.
-- Cierra ese gap con el mismo patrón ya usado para el cupo de eventos:
-- reserva/consumo atómico en el checkout, con compensación si un paso
-- posterior del mismo request falla.
--
-- Diseño: un producto que NUNCA tuvo un lote cargado en `product_batches`
-- para la sucursal del pedido se trata como "no trackeado por lotes" (stock
-- ilimitado implícito) — así no se rompe el catálogo existente de fases
-- anteriores, donde ningún producto de prueba tiene lotes. Solo productos
-- con al menos un lote en esa sucursal quedan sujetos a la validación FIFO
-- real. Esto es consistente con cómo el staff realmente opera: cargan lotes
-- para lo que sí llevan trazabilidad de vencimiento, no para todo.
create or replace function public.consume_batch_stock_fifo(p_store_id uuid, p_product_id uuid, p_quantity int)
returns jsonb  -- null = no había stock suficiente; si no, array [{batch_id, quantity}] de lo consumido
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int := p_quantity;
  v_batch record;
  v_take int;
  v_consumed jsonb := '[]'::jsonb;
  v_item record;
begin
  for v_batch in
    select id, quantity
    from product_batches
    where store_id = p_store_id and product_id = p_product_id and quantity > 0
    order by expiration_date asc nulls last, received_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_batch.quantity, v_remaining);
    update product_batches set quantity = quantity - v_take where id = v_batch.id;
    v_consumed := v_consumed || jsonb_build_object('batch_id', v_batch.id, 'quantity', v_take);
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    -- No alcanzó: revierte lo consumido en este mismo loop antes de fallar,
    -- para no dejar lotes parcialmente descontados de una venta rechazada.
    for v_item in select * from jsonb_to_recordset(v_consumed) as x(batch_id uuid, quantity int)
    loop
      update product_batches set quantity = quantity + v_item.quantity where id = v_item.batch_id;
    end loop;
    return null;
  end if;

  return v_consumed;
end;
$$;

-- Cuenta cuántas unidades tiene actualmente trackeadas por lote un producto
-- en una sucursal (0 = no trackeado o sin stock) — usado por el checkout
-- para decidir si corresponde exigir stock antes de reservar.
create or replace function public.has_tracked_batches(p_store_id uuid, p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from product_batches where store_id = p_store_id and product_id = p_product_id);
$$;

-- Compensación si el checkout falla después de consumir stock de más de un
-- producto en el mismo carrito (todo o nada), igual que
-- release_special_event_stock.
create or replace function public.restore_batch_stock(p_consumed jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  for v_item in select * from jsonb_to_recordset(p_consumed) as x(batch_id uuid, quantity int)
  loop
    update product_batches set quantity = quantity + v_item.quantity where id = v_item.batch_id;
  end loop;
end;
$$;

revoke all on function public.consume_batch_stock_fifo(uuid, uuid, int) from public, anon;
revoke all on function public.has_tracked_batches(uuid, uuid) from public, anon;
revoke all on function public.restore_batch_stock(jsonb) from public, anon;
grant execute on function public.consume_batch_stock_fifo(uuid, uuid, int) to authenticated;
grant execute on function public.has_tracked_batches(uuid, uuid) to authenticated;
grant execute on function public.restore_batch_stock(jsonb) to authenticated;

-- Permite a Admin/Operaciones (ya cubiertos por las políticas "for all"
-- existentes sobre product_batches) marcar/desmarcar liquidación con una
-- función dedicada no es necesario — el UPDATE directo ya está permitido por
-- RLS. Solo se documenta acá para dejar constancia de que no faltaba policy.
