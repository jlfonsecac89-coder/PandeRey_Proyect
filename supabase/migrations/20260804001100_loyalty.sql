create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  order_id uuid references orders(id),
  type text not null check (type in ('earn_purchase', 'redeem_discount', 'redeem_product', 'manual_adjustment', 'expire')),
  points int not null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table customer_rfm_snapshot (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  computed_at timestamptz not null default now(),
  recency_days int not null,
  frequency_count int not null,
  monetary_total numeric(12,2) not null,
  ltv_total numeric(12,2) not null,
  r_score smallint not null,
  f_score smallint not null,
  m_score smallint not null,
  segment text not null check (segment in ('estrella', 'leal', 'promedio', 'dormido', 'perdido')),
  suggested_action text not null check (suggested_action in ('activar', 'retener', 'premiar', 'impulsar_venta'))
);

-- --- RLS ---
alter table points_ledger enable row level security;
alter table customer_rfm_snapshot enable row level security;

-- Puntos: el cliente ve su propio historial (solo lectura — los movimientos los
-- escribe el servidor con service_role para no arriesgar la integridad del saldo).
create policy "self_select_points_ledger" on points_ledger
  for select using (auth.uid() = user_id);
create policy "staff_select_points_ledger" on points_ledger
  for select using (current_app_role() in ('admin', 'marketing'));

-- RFM: herramienta interna de Admin/Marketing, no expuesta al cliente (sección 14).
create policy "staff_select_customer_rfm_snapshot" on customer_rfm_snapshot
  for select using (current_app_role() in ('admin', 'marketing'));
