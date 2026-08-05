-- Bug real encontrado en la Fase 11: `product_batches` nunca tuvo policy de
-- SELECT pública (comentario original en 20260804000700_inventory.sql:
-- "dato operativo interno, no público") — correcto para no exponer lotes,
-- cantidades ni vencimientos, PERO eso también bloqueaba silenciosamente
-- (sin error, solo filas vacías por RLS) la consulta de liquidación desde
-- checkout/tienda/detalle de producto, que corren con la sesión del propio
-- cliente. El descuento de liquidación nunca se estaba aplicando de verdad.
--
-- Mismo patrón que get_best_selling_product_ids (Fase 10): una función
-- SECURITY DEFINER expone solo el dato agregado que sí es público
-- (porcentaje de descuento activo), sin exponer cantidad/vencimiento/lote.
create or replace function public.get_clearance_discounts(p_store_id uuid, p_product_ids uuid[])
returns table(product_id uuid, discount_percent numeric)
language sql
security definer
set search_path = public
stable
as $$
  select pb.product_id, max(pb.clearance_discount_percent) as discount_percent
  from product_batches pb
  where pb.store_id = p_store_id
    and pb.is_clearance = true
    and pb.quantity > 0
    and pb.clearance_discount_percent is not null
    and pb.product_id = any(p_product_ids)
  group by pb.product_id;
$$;

create or replace function public.get_clearance_product_ids(p_store_id uuid)
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(distinct pb.product_id), '{}')
  from product_batches pb
  where pb.store_id = p_store_id
    and pb.is_clearance = true
    and pb.quantity > 0;
$$;

revoke all on function public.get_clearance_discounts(uuid, uuid[]) from public;
revoke all on function public.get_clearance_product_ids(uuid) from public;
grant execute on function public.get_clearance_discounts(uuid, uuid[]) to anon, authenticated;
grant execute on function public.get_clearance_product_ids(uuid) to anon, authenticated;
