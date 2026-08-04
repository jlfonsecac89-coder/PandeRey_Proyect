create table store_products (
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  stock_quantity int not null default 0 check (stock_quantity >= 0),  -- cache de product_batches, sección 13
  is_available_here boolean not null default true,
  primary key (store_id, product_id)
);

create table product_batches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null check (quantity >= 0),
  expiration_date date,
  received_at timestamptz not null default now(),
  is_clearance boolean not null default false,
  clearance_discount_percent numeric(5,2),
  created_by uuid references profiles(id)
);

create table shipping_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  min_km numeric(5,2) not null,
  max_km numeric(5,2) not null,
  price numeric(12,2) not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table product_imports (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references profiles(id),
  file_name text,
  status text not null check (status in ('processing', 'pending_review', 'completed', 'failed')) default 'processing',
  total_rows int,
  new_products int not null default 0,
  updated_pending int not null default 0,
  unchanged int not null default 0,
  new_variants int not null default 0,
  created_at timestamptz default now()
);

create table product_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references product_imports(id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,
  match_type text not null check (match_type in ('new', 'identical', 'description_changed', 'new_variant')),
  matched_product_id uuid references products(id),
  resolution text not null check (resolution in ('pending', 'approved', 'rejected')) default 'pending',
  resolved_by uuid references profiles(id),
  resolved_at timestamptz
);

-- --- RLS ---
alter table store_products enable row level security;
alter table product_batches enable row level security;
alter table shipping_zones enable row level security;
alter table product_imports enable row level security;
alter table product_import_rows enable row level security;

-- Stock visible públicamente (para mostrar disponibilidad en el storefront).
create policy "public_select_store_products" on store_products for select using (true);
create policy "public_select_active_shipping_zones" on shipping_zones for select using (is_active = true);

-- Lotes/vencimientos: dato operativo interno, no público.
create policy "admin_manage_product_batches" on product_batches for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy "operaciones_manage_product_batches_in_scope" on product_batches for all
  using (current_app_role() = 'operaciones' and store_id = current_store_id())
  with check (current_app_role() = 'operaciones' and store_id = current_store_id());

create policy "admin_manage_store_products" on store_products for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy "operaciones_manage_store_products_in_scope" on store_products for all
  using (current_app_role() = 'operaciones' and store_id = current_store_id())
  with check (current_app_role() = 'operaciones' and store_id = current_store_id());

create policy "admin_manage_shipping_zones" on shipping_zones for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
  -- radio/tramos de envío: solo Admin, vive en "Configuración del sistema" (sección 09).

-- Carga masiva: Admin y Operaciones (afecta el catálogo global, sin scoping por sucursal).
create policy "staff_manage_product_imports" on product_imports for all
  using (current_app_role() in ('admin', 'operaciones'))
  with check (current_app_role() in ('admin', 'operaciones'));
create policy "staff_manage_product_import_rows" on product_import_rows for all
  using (current_app_role() in ('admin', 'operaciones'))
  with check (current_app_role() in ('admin', 'operaciones'));
