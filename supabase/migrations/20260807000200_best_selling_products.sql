-- "Más Vendidos" (sección 13) se calcula en tiempo de consulta a partir del
-- volumen real de order_items, no es una colección manual. Function en vez
-- de armar el group-by desde el cliente Supabase-js (no soporta agregados
-- con join directo) — solo lectura, así que se puede exponer a anon.
create or replace function public.get_best_selling_product_ids(days int, limit_count int)
returns table (product_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id
  from order_items oi
  join orders o on o.id = oi.order_id
  where o.status <> 'pending_payment' and o.status <> 'cancelled'
    and o.created_at >= now() - (days || ' days')::interval
  group by oi.product_id
  order by sum(oi.quantity) desc
  limit limit_count;
$$;

revoke all on function public.get_best_selling_product_ids(int, int) from public;
grant execute on function public.get_best_selling_product_ids(int, int) to anon, authenticated;
