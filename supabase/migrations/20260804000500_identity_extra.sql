create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text,
  calle text not null,
  numero text not null,
  comuna text not null,
  ciudad text not null,
  region text not null,
  codigo_postal text,
  lat numeric(9,6),
  lng numeric(9,6),
  geocoded_at timestamptz,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table addresses enable row level security;

create policy "self_manage_addresses" on addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admin_select_addresses" on addresses
  for select using (current_app_role() = 'admin');

create policy "marketing_select_addresses" on addresses
  for select using (current_app_role() = 'marketing');
  -- CRM: Marketing ve dirección exacta para segmentar campañas por zona (sección 09).

-- La política de "operaciones ve la dirección de un pedido de su sucursal"
-- se agrega en 20260804000900_orders.sql, porque necesita referenciar `orders`,
-- que todavía no existe en este punto de las migraciones.

create table terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz default now(),
  ip_address text
);

alter table terms_acceptances enable row level security;

create policy "self_select_terms_acceptances" on terms_acceptances
  for select using (auth.uid() = user_id);

create policy "self_insert_terms_acceptances" on terms_acceptances
  for insert with check (auth.uid() = user_id);

create policy "admin_select_terms_acceptances" on terms_acceptances
  for select using (current_app_role() = 'admin');

create table cookie_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,  -- null = visitante sin cuenta
  necessary boolean not null default true,
  analytics boolean not null default false,
  marketing boolean not null default false,
  consented_at timestamptz not null default now()
);

alter table cookie_consents enable row level security;

create policy "self_manage_cookie_consents" on cookie_consents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admin_select_cookie_consents" on cookie_consents
  for select using (current_app_role() = 'admin');
