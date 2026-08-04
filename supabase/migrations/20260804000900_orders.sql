create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  status text not null check (status in (
    'pending_payment', 'paid', 'preparing', 'ready',
    'ready_for_pickup',
    'driver_assigned', 'in_route', 'at_address', 'delivery_issue', 'returning_to_store', 'returned_to_store',
    'delivered', 'cancelled'
  )) default 'pending_payment',
  delivery_method text not null check (delivery_method in ('pickup', 'shipping')),
  payment_method text not null check (payment_method in ('mercadopago', 'bank_transfer')) default 'mercadopago',
  store_id uuid not null references stores(id),
  address_id uuid references addresses(id),
  scheduled_at timestamptz,
  sla_deadline timestamptz,
  ready_at timestamptz,
  assigned_driver_id uuid references profiles(id),
  delivery_distance_km numeric(6,2),
  delivery_confirmation_code text,
  delivery_code_attempts int not null default 0,
  delivery_code_locked boolean not null default false,
  delivery_issue_reason text,
  delivery_issue_at timestamptz,
  delivered_at timestamptz,
  subtotal numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  currency text not null default 'CLP',
  promotion_id uuid references promotions(id),
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name_snapshot text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  fulfillment_status text not null check (fulfillment_status in ('as_ordered', 'substituted', 'removed')) default 'as_ordered',
  substituted_product_id uuid references products(id),
  modification_note text,
  customization_note text
);

create table order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  option_group_name_snapshot text not null,
  option_value_name_snapshot text not null,
  price_delta_snapshot numeric(12,2) not null default 0
);

-- --- RLS: orders ---
alter table orders enable row level security;

create policy "customer_select_own_orders" on orders
  for select using (auth.uid() = user_id);

create policy "customer_insert_own_orders" on orders
  for insert with check (auth.uid() = user_id);

create policy "admin_manage_orders" on orders for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

create policy "marketing_select_orders" on orders
  for select using (current_app_role() = 'marketing');
  -- solo lectura, para Análisis de Ofertas y Performance de Clientes (RFM) — sección 09.

create policy "operaciones_manage_orders_in_scope" on orders for all
  using (current_app_role() = 'operaciones' and store_id = current_store_id())
  with check (current_app_role() = 'operaciones' and store_id = current_store_id());

create policy "repartidor_manage_assigned_orders" on orders for all
  using (current_app_role() = 'repartidor' and assigned_driver_id = auth.uid())
  with check (current_app_role() = 'repartidor' and assigned_driver_id = auth.uid());

-- Políticas diferidas de la migración 0003/0004/0005 (necesitaban `orders`, ver notas ahí).
create policy "operaciones_select_customer_in_scope" on profiles
  for select using (
    current_app_role() = 'operaciones'
    and role = 'customer'
    and exists (select 1 from orders o where o.user_id = profiles.id and o.store_id = current_store_id())
  );

create policy "repartidor_select_customer_for_assigned_order" on profiles
  for select using (
    current_app_role() = 'repartidor'
    and role = 'customer'
    and exists (select 1 from orders o where o.user_id = profiles.id and o.assigned_driver_id = auth.uid())
  );

create policy "operaciones_select_addresses_in_scope" on addresses
  for select using (
    current_app_role() = 'operaciones'
    and exists (select 1 from orders o where o.address_id = addresses.id and o.store_id = current_store_id())
  );

create policy "repartidor_select_addresses_for_assigned_order" on addresses
  for select using (
    current_app_role() = 'repartidor'
    and exists (select 1 from orders o where o.address_id = addresses.id and o.assigned_driver_id = auth.uid())
  );

-- --- RLS: order_status_history (misma visibilidad que su orders; escritura solo staff/sistema) ---
alter table order_status_history enable row level security;

create policy "select_order_status_history_if_can_see_order" on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (
          o.user_id = auth.uid()
          or current_app_role() = 'admin'
          or current_app_role() = 'marketing'
          or (current_app_role() = 'operaciones' and o.store_id = current_store_id())
          or (current_app_role() = 'repartidor' and o.assigned_driver_id = auth.uid())
        )
    )
  );

create policy "staff_insert_order_status_history" on order_status_history
  for insert with check (current_app_role() in ('admin', 'operaciones', 'repartidor'));

-- --- RLS: order_items / order_item_options (misma visibilidad que la orden dueña) ---
alter table order_items enable row level security;
alter table order_item_options enable row level security;

create policy "access_order_items_if_can_access_order" on order_items for all
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (
          o.user_id = auth.uid()
          or current_app_role() = 'admin'
          or current_app_role() = 'marketing'
          or (current_app_role() = 'operaciones' and o.store_id = current_store_id())
          or (current_app_role() = 'repartidor' and o.assigned_driver_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (
          o.user_id = auth.uid()
          or current_app_role() = 'admin'
          or (current_app_role() = 'operaciones' and o.store_id = current_store_id())
        )
    )
  );

create policy "access_order_item_options_if_can_access_item" on order_item_options for all
  using (
    exists (
      select 1 from order_items oi where oi.id = order_item_options.order_item_id
    )
  )
  with check (
    exists (
      select 1 from order_items oi
      join orders o on o.id = oi.order_id
      where oi.id = order_item_options.order_item_id
        and (o.user_id = auth.uid() or current_app_role() in ('admin', 'operaciones'))
    )
  );
