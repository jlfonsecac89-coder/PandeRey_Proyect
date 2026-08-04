create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mp_customer_id text not null,
  mp_card_id text not null,
  brand text,
  last_four text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  mp_payment_id text unique not null,
  status text not null,
  amount numeric(12,2) not null,
  raw_webhook_redacted jsonb,
  created_at timestamptz default now()
);

create table whatsapp_integration (
  id int primary key default 1 check (id = 1),
  access_token_encrypted bytea not null,
  phone_number_id text not null,
  bank_account_details text not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

create table bank_transfer_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  whatsapp_conversation_id text,
  proof_storage_path text,
  proof_received_at timestamptz,
  status text not null check (status in ('awaiting_proof', 'proof_submitted', 'approved', 'rejected')) default 'awaiting_proof',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions(id) on delete cascade,
  user_id uuid not null references profiles(id),
  order_id uuid not null references orders(id),
  redeemed_at timestamptz default now()
);

-- --- RLS ---
alter table payment_methods enable row level security;
alter table payments enable row level security;
alter table whatsapp_integration enable row level security;
alter table bank_transfer_payments enable row level security;
alter table coupon_redemptions enable row level security;

-- Tarjetas guardadas: solo el dueño y Admin. Nunca Marketing/Operaciones/Repartidor (sección 11).
create policy "self_manage_payment_methods" on payment_methods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin_select_payment_methods" on payment_methods
  for select using (current_role() = 'admin');

-- Pagos de Mercado Pago: dueño del pedido (solo lectura) + staff con visibilidad de la orden.
create policy "select_payments_if_can_access_order" on payments
  for select using (
    exists (
      select 1 from orders o
      where o.id = payments.order_id
        and (
          o.user_id = auth.uid()
          or current_role() = 'admin'
          or (current_role() = 'operaciones' and o.store_id = current_store_id())
        )
    )
  );

-- Credencial de WhatsApp: exclusiva de Admin (es un secreto de integración, sección 11).
create policy "admin_manage_whatsapp_integration" on whatsapp_integration for all
  using (current_role() = 'admin') with check (current_role() = 'admin');

-- Transferencia bancaria: dueño del pedido ve su estado; Operaciones/Admin revisan y aprueban.
create policy "select_bank_transfer_if_can_access_order" on bank_transfer_payments
  for select using (
    exists (
      select 1 from orders o
      where o.id = bank_transfer_payments.order_id
        and (
          o.user_id = auth.uid()
          or current_role() = 'admin'
          or (current_role() = 'operaciones' and o.store_id = current_store_id())
        )
    )
  );
create policy "staff_review_bank_transfer" on bank_transfer_payments for update
  using (
    current_role() = 'admin'
    or (current_role() = 'operaciones' and exists (
      select 1 from orders o where o.id = bank_transfer_payments.order_id and o.store_id = current_store_id()
    ))
  );

-- Canjes de cupón: dueño del pedido + Admin/Marketing (Análisis de Ofertas, sección 14).
create policy "select_own_coupon_redemptions" on coupon_redemptions
  for select using (auth.uid() = user_id or current_role() in ('admin', 'marketing'));
create policy "customer_insert_own_coupon_redemption" on coupon_redemptions
  for insert with check (auth.uid() = user_id);
