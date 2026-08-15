-- Datos para los gráficos del Dashboard de Admin (Fase 5) — mismo patrón que
-- get_best_selling_product_ids: agregado en SQL porque supabase-js no arma
-- group-by con join directo desde el cliente. A diferencia de esa función
-- (pensada para mostrarse en la tienda, por eso otorgada a anon), estas dos
-- exponen montos de venta reales — solo se otorgan a `authenticated`, y la
-- página que las llama ya está protegida por requireRole(admin/marketing/
-- operaciones) además de RLS.
create or replace function public.get_product_sales_summary(days int, limit_count int)
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
    and o.created_at >= now() - (days || ' days')::interval
  group by oi.product_id, p.name
  order by sum(oi.subtotal) desc
  limit limit_count;
$$;

revoke all on function public.get_product_sales_summary(int, int) from public;
grant execute on function public.get_product_sales_summary(int, int) to authenticated;

create or replace function public.get_category_sales_summary(days int, limit_count int)
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
    and o.created_at >= now() - (days || ' days')::interval
  group by c.id, c.name
  order by sum(oi.subtotal) desc
  limit limit_count;
$$;

revoke all on function public.get_category_sales_summary(int, int) from public;
grant execute on function public.get_category_sales_summary(int, int) to authenticated;
