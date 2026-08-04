-- Capa operativa jerárquica: Departamento > Categoría > Producto (sección 13)
create table departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  name_normalized text generated always as (lower(public.immutable_unaccent(name))) stored,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (name_normalized)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  parent_id uuid references categories(id) on delete set null,
  code text not null,
  name text not null,
  name_normalized text generated always as (lower(public.immutable_unaccent(name))) stored,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (department_id, name_normalized)
);

-- Capa de vitrina transversal, muchos-a-muchos con products (sección 13)
create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text generated always as (lower(public.immutable_unaccent(name))) stored,
  slug text not null unique,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  unique (name_normalized)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  name_normalized text generated always as (lower(public.immutable_unaccent(name))) stored,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'CLP',
  sku text not null unique,
  is_gluten_free boolean default false,
  is_active boolean not null default true,
  points_cost int,
  is_special_event boolean not null default false,
  event_collection_id uuid references collections(id),
  max_orders int,
  special_orders_count int not null default 0,
  requires_production_notes boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (category_id, name_normalized)
);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create table product_collections (
  product_id uuid not null references products(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order int not null default 0
);

create table product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  selection_type text not null check (selection_type in ('single', 'multiple')) default 'single',
  is_required boolean not null default true,
  sort_order int not null default 0
);

create table product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references product_option_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- --- RLS ---
alter table departments enable row level security;
alter table categories enable row level security;
alter table collections enable row level security;
alter table products enable row level security;
alter table product_collections enable row level security;
alter table product_images enable row level security;
alter table product_option_groups enable row level security;
alter table product_option_values enable row level security;

-- Catálogo público: cualquiera (incluso sin sesión) ve lo activo — es el storefront.
create policy "public_select_active_departments" on departments for select using (is_active = true);
create policy "public_select_active_categories" on categories for select using (is_active = true);
create policy "public_select_active_collections" on collections for select using (is_active = true);
create policy "public_select_active_products" on products for select using (is_active = true);
create policy "public_select_product_collections" on product_collections for select using (true);
create policy "public_select_product_images" on product_images for select using (true);
create policy "public_select_product_option_groups" on product_option_groups for select using (true);
create policy "public_select_product_option_values" on product_option_values for select using (is_active = true);

-- Departamentos/categorías: gestión exclusiva de Admin (cambia la organización operativa de fondo).
create policy "admin_manage_departments" on departments for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
create policy "admin_manage_categories" on categories for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

-- Productos/imágenes/variantes: Admin y Operaciones (módulo "Gestión de productos y Stock").
-- Nota: la restricción de Marketing a "solo puede tocar points_cost" es de columna, no de fila —
-- se aplica en el Server Action (Capa 2, sección 10); acá se le da el UPDATE de fila necesario.
create policy "staff_manage_products" on products for all
  using (current_app_role() in ('admin', 'operaciones'))
  with check (current_app_role() in ('admin', 'operaciones'));
create policy "marketing_update_products_points_cost" on products for update
  using (current_app_role() = 'marketing')
  with check (current_app_role() = 'marketing');
create policy "staff_manage_product_images" on product_images for all
  using (current_app_role() in ('admin', 'operaciones'))
  with check (current_app_role() in ('admin', 'operaciones'));
create policy "staff_manage_product_options" on product_option_groups for all
  using (current_app_role() in ('admin', 'operaciones'))
  with check (current_app_role() in ('admin', 'operaciones'));
create policy "staff_manage_product_option_values" on product_option_values for all
  using (current_app_role() in ('admin', 'operaciones'))
  with check (current_app_role() in ('admin', 'operaciones'));

-- Colecciones y qué producto entra en cada una: Admin y Marketing (sección 13).
create policy "staff_manage_collections" on collections for all
  using (current_app_role() in ('admin', 'marketing'))
  with check (current_app_role() in ('admin', 'marketing'));
create policy "staff_manage_product_collections" on product_collections for all
  using (current_app_role() in ('admin', 'marketing'))
  with check (current_app_role() in ('admin', 'marketing'));
