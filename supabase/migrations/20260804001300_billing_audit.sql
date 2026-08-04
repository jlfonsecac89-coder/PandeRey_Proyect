create table invoices_dte (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  document_type text not null check (document_type in ('boleta', 'factura')),
  rut_cliente_encrypted bytea,
  folio text,
  provider_reference text,
  status text not null default 'pending',
  pdf_url text,
  created_at timestamptz default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  created_at timestamptz default now()
);

create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  order_id uuid references orders(id),
  channel text not null default 'email',
  template text not null,
  status text not null,
  sent_at timestamptz default now()
);

-- --- RLS ---
alter table invoices_dte enable row level security;
alter table audit_log enable row level security;
alter table notifications_log enable row level security;

create policy "select_invoices_if_can_access_order" on invoices_dte
  for select using (
    exists (
      select 1 from orders o
      where o.id = invoices_dte.order_id
        and (
          o.user_id = auth.uid()
          or current_role() = 'admin'
          or (current_role() = 'operaciones' and o.store_id = current_store_id())
        )
    )
  );

-- Auditoría: exclusiva de Admin (sección 09) — ni siquiera Marketing/Operaciones la ven.
create policy "admin_select_audit_log" on audit_log
  for select using (current_role() = 'admin');

create policy "self_select_notifications_log" on notifications_log
  for select using (auth.uid() = user_id);
create policy "admin_select_notifications_log" on notifications_log
  for select using (current_role() = 'admin');
