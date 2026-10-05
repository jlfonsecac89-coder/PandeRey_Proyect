-- Campañas de venta por encargo con retiro repartido por día (Pan de Jamón de
-- diciembre). Aditiva: tablas nuevas, ninguna existente cambia.

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_id uuid not null references products(id),
  orders_open_at timestamptz not null,
  orders_close_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint campaigns_window_check check (orders_close_at > orders_open_at)
);

-- Un producto solo puede estar en una campaña activa a la vez.
create unique index if not exists campaigns_one_active_per_product
  on campaigns (product_id) where is_active;

create table if not exists campaign_pickup_dates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  pickup_date date not null,
  daily_capacity_units integer not null check (daily_capacity_units >= 0),
  is_open boolean not null default true,
  unique (campaign_id, pickup_date)
);

-- Reparto de cada pedido por día de retiro. picked_up_* los llena el equipo
-- al entregar (Paso 7).
create table if not exists order_campaign_pickups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  pickup_date_id uuid not null references campaign_pickup_dates(id),
  quantity integer not null check (quantity > 0),
  picked_up_at timestamptz,
  picked_up_by uuid references profiles(id) on delete set null,
  unique (order_id, pickup_date_id)
);

create index if not exists order_campaign_pickups_date_idx on order_campaign_pickups (pickup_date_id);

alter table campaigns enable row level security;
alter table campaign_pickup_dates enable row level security;
alter table order_campaign_pickups enable row level security;

-- La campaña y sus fechas son información pública de la tienda.
create policy "campaigns_public_read" on campaigns for select using (true);
create policy "campaigns_staff_manage" on campaigns for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

create policy "campaign_dates_public_read" on campaign_pickup_dates for select using (true);
create policy "campaign_dates_staff_manage" on campaign_pickup_dates for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

create policy "campaign_pickups_customer_read" on order_campaign_pickups for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "campaign_pickups_staff_manage" on order_campaign_pickups for all
  using (current_app_role() in ('admin', 'operaciones'))
  with check (current_app_role() in ('admin', 'operaciones'));

-- Unidades comprometidas en un día: pedidos con pago confirmado (tienen N°) y
-- que no se cancelaron, más borradores de menos de 30 min (el cliente está en
-- Mercado Pago). Se CALCULA en vez de llevar un contador, así cancelar o
-- vencer un borrador libera el cupo solo.
create or replace function public.campaign_date_reserved(p_date_id uuid, p_exclude_order uuid default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(ocp.quantity), 0)::integer
  from order_campaign_pickups ocp
  join orders o on o.id = ocp.order_id
  where ocp.pickup_date_id = p_date_id
    and (p_exclude_order is null or o.id <> p_exclude_order)
    and o.status <> 'cancelled'
    and (
      o.order_number is not null
      or (o.status = 'pending_payment' and o.created_at > now() - interval '30 minutes')
    );
$$;

-- Reserva el reparto de un pedido de forma atómica: bloquea cada fecha
-- (en orden de id, para no generar deadlocks entre compras simultáneas),
-- verifica ventana de pedidos, fecha abierta y cupo, e inserta el reparto.
-- Devuelve null si quedó reservado o el motivo del rechazo.
create or replace function public.reserve_campaign_pickups(
  p_order_id uuid,
  p_campaign_id uuid,
  p_pickups jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns%rowtype;
  v_item record;
  v_date campaign_pickup_dates%rowtype;
  v_reserved integer;
begin
  select * into v_campaign from campaigns where id = p_campaign_id;
  if not found or not v_campaign.is_active
     or now() < v_campaign.orders_open_at or now() > v_campaign.orders_close_at then
    return 'campaign_closed';
  end if;

  delete from order_campaign_pickups where order_id = p_order_id;

  for v_item in
    select (e->>'dateId')::uuid as date_id, (e->>'quantity')::integer as quantity
    from jsonb_array_elements(p_pickups) e
    order by 1
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      return 'invalid_quantity';
    end if;

    select * into v_date from campaign_pickup_dates
    where id = v_item.date_id and campaign_id = p_campaign_id
    for update;
    if not found or not v_date.is_open then
      return 'date_closed:' || coalesce(v_date.pickup_date::text, '');
    end if;

    v_reserved := campaign_date_reserved(v_date.id, p_order_id);
    if v_reserved + v_item.quantity > v_date.daily_capacity_units then
      return 'date_full:' || v_date.pickup_date::text;
    end if;

    insert into order_campaign_pickups (order_id, pickup_date_id, quantity)
    values (p_order_id, v_date.id, v_item.quantity);
  end loop;

  return null;
end;
$$;

revoke all on function public.campaign_date_reserved(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reserve_campaign_pickups(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.campaign_date_reserved(uuid, uuid) to service_role;
grant execute on function public.reserve_campaign_pickups(uuid, uuid, jsonb) to service_role;
