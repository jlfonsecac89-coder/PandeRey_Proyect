-- N° de pedido correlativo (PDR-000123), asignado recién cuando el pedido se
-- confirma como pagado. Los borradores sin pagar no tienen número.
-- Aditiva: columna nula + secuencia + función; no cambia ningún dato existente
-- salvo numerar los pedidos que ya salieron de pending_payment.

create sequence if not exists order_number_seq;

alter table orders add column if not exists order_number bigint;

-- Numera por orden de creación los pedidos que ya están pagados o más allá.
with numbered as (
  select id, row_number() over (order by created_at, id) as rn
  from orders
  where status <> 'pending_payment' and order_number is null
)
update orders o
set order_number = n.rn
from numbered n
where o.id = n.id;

-- La siguiente asignación continúa después del último número usado.
select setval(
  'order_number_seq',
  coalesce((select max(order_number) from orders), 0) + 1,
  false
);

create unique index if not exists orders_order_number_key
  on orders (order_number)
  where order_number is not null;

-- Idempotente: si el pedido ya tiene número, lo devuelve sin consumir otro.
create or replace function public.assign_order_number(p_order_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number bigint;
begin
  update orders
  set order_number = nextval('order_number_seq')
  where id = p_order_id and order_number is null
  returning order_number into v_number;

  if v_number is null then
    select order_number into v_number from orders where id = p_order_id;
  end if;

  return v_number;
end;
$$;

-- Solo el servidor (service_role) asigna números; ningún cliente puede llamarla.
revoke all on function public.assign_order_number(uuid) from public, anon, authenticated;
grant execute on function public.assign_order_number(uuid) to service_role;
