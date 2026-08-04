create table banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_storage_path text not null,
  link_url text,
  sort_order int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent_at timestamptz not null,
  is_active boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz default now()
);

create table instagram_integration (
  id int primary key default 1 check (id = 1),
  access_token_encrypted bytea not null,
  token_expires_at timestamptz not null,
  business_account_id text not null,
  last_synced_at timestamptz,
  updated_by uuid references profiles(id)
);

-- --- RLS ---
alter table banners enable row level security;
alter table newsletter_subscribers enable row level security;
alter table instagram_integration enable row level security;

create policy "public_select_active_banners" on banners
  for select using (is_active = true and now() between coalesce(starts_at, now()) and coalesce(ends_at, now()));
create policy "staff_manage_banners" on banners for all
  using (current_role() in ('admin', 'marketing'))
  with check (current_role() in ('admin', 'marketing'));

-- Newsletter: cualquier visitante puede suscribirse (formulario público, opt-in explícito);
-- la baja (unsubscribe) se hace vía Route Handler con service_role validando un link firmado,
-- no directo por RLS — por eso no hay policy de UPDATE público acá.
create policy "public_insert_newsletter_subscription" on newsletter_subscribers
  for insert with check (true);
create policy "staff_select_newsletter_subscribers" on newsletter_subscribers
  for select using (current_role() in ('admin', 'marketing'));

create policy "admin_manage_instagram_integration" on instagram_integration for all
  using (current_role() = 'admin') with check (current_role() = 'admin');
