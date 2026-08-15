-- La vista de tabla del Dashboard (Fase 5) necesita "Tkt Prom" (venta / cantidad
-- de tickets) y "Cantidad de tickets" (pedidos distintos que incluyeron el
-- producto) además de lo que ya calculaba get_product_sales_summary — el
-- return type cambia, así que hay que dropear y recrear (CREATE OR REPLACE
-- no admite cambiar las columnas de salida).
drop function if exists public.get_product_sales_summary(int, int);

create function public.get_product_sales_summary(hours int, limit_count int)
returns table (
  product_id uuid,
  product_name text,
  total_quantity bigint,
  total_amount numeric,
  ticket_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id, p.name, sum(oi.quantity), sum(oi.subtotal), count(distinct oi.order_id)
  from order_items oi
  join orders o on o.id = oi.order_id
  join products p on p.id = oi.product_id
  where o.status <> 'pending_payment' and o.status <> 'cancelled'
    and o.created_at >= now() - (hours || ' hours')::interval
  group by oi.product_id, p.name
  order by sum(oi.subtotal) desc
  limit limit_count;
$$;

revoke all on function public.get_product_sales_summary(int, int) from public;
grant execute on function public.get_product_sales_summary(int, int) to authenticated;
