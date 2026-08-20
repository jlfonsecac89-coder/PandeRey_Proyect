create table order_delivery_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sender_role text not null check (sender_role in ('repartidor','tienda')),
  sender_id uuid not null references profiles(id),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index on order_delivery_messages(order_id, created_at);

alter table order_delivery_messages enable row level security;

-- Chat de incidencia repartidor↔tienda (portal repartidor) — sección
-- admin-redesign paso 8. Mismo patrón de RLS que order_status_history:
-- el repartidor solo ve/escribe en pedidos que tiene asignados, el staff
-- solo en pedidos de su propia sucursal (admin ve todo).
create policy repartidor_select_own_delivery_messages
  on order_delivery_messages for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and o.assigned_driver_id = auth.uid()
    )
  );

create policy repartidor_insert_own_delivery_messages
  on order_delivery_messages for insert
  with check (
    sender_role = 'repartidor'
    and sender_id = auth.uid()
    and exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and o.assigned_driver_id = auth.uid()
    )
  );

create policy staff_select_delivery_messages
  on order_delivery_messages for select
  using (
    current_app_role() in ('admin','operaciones')
    and exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and (current_app_role() = 'admin' or o.store_id = current_store_id())
    )
  );

create policy staff_insert_delivery_messages
  on order_delivery_messages for insert
  with check (
    sender_role = 'tienda'
    and sender_id = auth.uid()
    and current_app_role() in ('admin','operaciones')
    and exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and (current_app_role() = 'admin' or o.store_id = current_store_id())
    )
  );
