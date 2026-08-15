-- El selector de rango del Dashboard (1h/4h/1d/7d/15d/30d, sección Fase 5)
-- necesita granularidad de horas, no de días — se recrean las dos funciones
-- de la migración anterior con `hours int` en vez de `days int` (Postgres no
-- permite renombrar un parámetro con CREATE OR REPLACE, así que se dropean).
drop function if exists public.get_product_sales_summary(int, int);
drop function if exists public.get_category_sales_summary(int, int);

create function public.get_product_sales_summary(hours int, limit_count int)
returns table (product_id uuid, product_name text, total_quantity bigint, total_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id, p.name, sum(oi.quantity), sum(oi.subtotal)
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

create function public.get_category_sales_summary(hours int, limit_count int)
returns table (category_id uuid, category_name text, total_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, sum(oi.subtotal)
  from order_items oi
  join orders o on o.id = oi.order_id
  join products p on p.id = oi.product_id
  join categories c on c.id = p.category_id
  where o.status <> 'pending_payment' and o.status <> 'cancelled'
    and o.created_at >= now() - (hours || ' hours')::interval
  group by c.id, c.name
  order by sum(oi.subtotal) desc
  limit limit_count;
$$;

revoke all on function public.get_category_sales_summary(int, int) from public;
grant execute on function public.get_category_sales_summary(int, int) to authenticated;
