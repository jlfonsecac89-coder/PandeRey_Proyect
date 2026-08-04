-- FASE 1 — Esquema completo + RLS. Generado a partir de supabase/migrations/*.sql
-- Correr UNA vez, completo, en el SQL Editor de Supabase (Project -> SQL Editor -> New query).
-- Es seguro ejecutarlo dentro de una transaccion: si algo falla, no se aplica nada.
begin;

-- ============================================================
-- 20260804000100_extensions.sql
-- ============================================================
-- Requeridas por el modelo de datos (BLUEPRINT.md sección 05/13):
-- unaccent: deduplicación de nombres (departments/categories/collections/products.name_normalized)
create extension if not exists unaccent;
create extension if not exists pgcrypto;

-- ============================================================
-- 20260804000200_stores.sql
-- ============================================================
-- Sucursales físicas. v1 lanza con UNA fila activa; agregar otra sucursal
-- después es solo insertar una fila nueva, sin cambios de código (BLUEPRINT.md sección 20).
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  origin_lat numeric(9,6) not null,
  origin_lng numeric(9,6) not null,
  max_delivery_radius_km numeric(5,2) not null default 8,
  min_order_amount numeric(12,2),
  free_shipping_min_amount numeric(12,2),
  contact_address text,
  contact_email text,
  contact_phone text,
  business_hours jsonb,
  delivery_schedule jsonb,
  social_links jsonb,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid -- FK a profiles agregada en 0003 (profiles depende de stores, no al revés)
);

alter table stores enable row level security;

-- Catálogo público: cualquiera puede ver sucursales activas (para elegir en checkout/landing).
create policy "public_select_active_stores" on stores
  for select using (is_active = true);

-- ============================================================
-- 20260804000300_profiles.sql
-- ============================================================
-- Extiende auth.users de Supabase. profiles.role es la raíz del RBAC (sección 09).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  rut_encrypted bytea,               -- cifrado a nivel de aplicación, ver sección 11
  role text not null check (role in ('customer','admin','marketing','operaciones','repartidor')) default 'customer',
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  points_balance int not null default 0,
  store_id uuid references stores(id),  -- solo operaciones/repartidor; null para customer/admin/marketing
  anonymized_at timestamptz,
  created_at timestamptz default now()
);

alter table stores
  add constraint stores_updated_by_fkey foreign key (updated_by) references profiles(id);

alter table profiles enable row level security;

-- Política base (no depende de funciones auxiliares, que se crean en la siguiente migración):
-- cada usuario siempre puede ver y actualizar su propia fila.
create policy "self_select_profile" on profiles
  for select using (auth.uid() = id);

create policy "self_update_profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id AND role = (select role from profiles p where p.id = auth.uid()));
  -- el with check evita que un cliente se auto-asigne otro rol al editar su perfil.

-- ============================================================
-- 20260804000400_helper_functions.sql
-- ============================================================
-- Funciones auxiliares para políticas RLS. SECURITY DEFINER porque necesitan leer
-- `profiles` (con RLS habilitado) sin recursión infinita de políticas; cada una
-- está atada a auth.uid(), así que nunca exponen datos de otro usuario.
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.current_store_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select store_id from profiles where id = auth.uid()
$$;

-- Trigger: crea automáticamente la fila de `profiles` al registrarse un nuevo
-- usuario en auth.users (customer por defecto; el staff se crea aparte, sección 08).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger genérico para mantener `updated_at` en las tablas que lo usan.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- Políticas de `profiles` que dependen de current_role()/current_store_id() ---

create policy "admin_select_all_profiles" on profiles
  for select using (current_role() = 'admin');

create policy "admin_update_non_admin_profiles" on profiles
  for update using (current_role() = 'admin' and role <> 'admin')
  with check (role in ('customer', 'marketing', 'operaciones', 'repartidor'));
  -- el with check hace imposible, incluso vía RLS, transformar una fila en role='admin':
  -- una cuenta Admin solo se crea manualmente en Supabase con service_role (sección 08).

create policy "marketing_select_customer_profiles" on profiles
  for select using (current_role() = 'marketing' and role = 'customer');
  -- CRM: Marketing ve clientes de todas las sucursales (sección 09), nunca otro staff.

-- Las políticas de "operaciones" y "repartidor" sobre `profiles` (ver un cliente solo
-- en el contexto de un pedido) se agregan en 20260804000900_orders.sql, porque
-- necesitan referenciar la tabla `orders`, que todavía no existe en este punto.

-- ============================================================
-- 20260804000500_identity_extra.sql
-- ============================================================
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
  for select using (current_role() = 'admin');

create policy "marketing_select_addresses" on addresses
  for select using (current_role() = 'marketing');
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
  for select using (current_role() = 'admin');

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
  for select using (current_role() = 'admin');

-- ============================================================
-- 20260804000600_catalog.sql
-- ============================================================
-- Capa operativa jerárquica: Departamento > Categoría > Producto (sección 13)
create table departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  name_normalized text generated always as (lower(unaccent(name))) stored,
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
  name_normalized text generated always as (lower(unaccent(name))) stored,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (department_id, name_normalized)
);

-- Capa de vitrina transversal, muchos-a-muchos con products (sección 13)
create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text generated always as (lower(unaccent(name))) stored,
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
  name_normalized text generated always as (lower(unaccent(name))) stored,
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
  using (current_role() = 'admin') with check (current_role() = 'admin');
create policy "admin_manage_categories" on categories for all
  using (current_role() = 'admin') with check (current_role() = 'admin');

-- Productos/imágenes/variantes: Admin y Operaciones (módulo "Gestión de productos y Stock").
-- Nota: la restricción de Marketing a "solo puede tocar points_cost" es de columna, no de fila —
-- se aplica en el Server Action (Capa 2, sección 10); acá se le da el UPDATE de fila necesario.
create policy "staff_manage_products" on products for all
  using (current_role() in ('admin', 'operaciones'))
  with check (current_role() in ('admin', 'operaciones'));
create policy "marketing_update_products_points_cost" on products for update
  using (current_role() = 'marketing')
  with check (current_role() = 'marketing');
create policy "staff_manage_product_images" on product_images for all
  using (current_role() in ('admin', 'operaciones'))
  with check (current_role() in ('admin', 'operaciones'));
create policy "staff_manage_product_options" on product_option_groups for all
  using (current_role() in ('admin', 'operaciones'))
  with check (current_role() in ('admin', 'operaciones'));
create policy "staff_manage_product_option_values" on product_option_values for all
  using (current_role() in ('admin', 'operaciones'))
  with check (current_role() in ('admin', 'operaciones'));

-- Colecciones y qué producto entra en cada una: Admin y Marketing (sección 13).
create policy "staff_manage_collections" on collections for all
  using (current_role() in ('admin', 'marketing'))
  with check (current_role() in ('admin', 'marketing'));
create policy "staff_manage_product_collections" on product_collections for all
  using (current_role() in ('admin', 'marketing'))
  with check (current_role() in ('admin', 'marketing'));

-- ============================================================
-- 20260804000700_inventory.sql
-- ============================================================
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
  using (current_role() = 'admin') with check (current_role() = 'admin');
create policy "operaciones_manage_product_batches_in_scope" on product_batches for all
  using (current_role() = 'operaciones' and store_id = current_store_id())
  with check (current_role() = 'operaciones' and store_id = current_store_id());

create policy "admin_manage_store_products" on store_products for all
  using (current_role() = 'admin') with check (current_role() = 'admin');
create policy "operaciones_manage_store_products_in_scope" on store_products for all
  using (current_role() = 'operaciones' and store_id = current_store_id())
  with check (current_role() = 'operaciones' and store_id = current_store_id());

create policy "admin_manage_shipping_zones" on shipping_zones for all
  using (current_role() = 'admin') with check (current_role() = 'admin');
  -- radio/tramos de envío: solo Admin, vive en "Configuración del sistema" (sección 09).

-- Carga masiva: Admin y Operaciones (afecta el catálogo global, sin scoping por sucursal).
create policy "staff_manage_product_imports" on product_imports for all
  using (current_role() in ('admin', 'operaciones'))
  with check (current_role() in ('admin', 'operaciones'));
create policy "staff_manage_product_import_rows" on product_import_rows for all
  using (current_role() in ('admin', 'operaciones'))
  with check (current_role() in ('admin', 'operaciones'));

-- ============================================================
-- 20260804000800_promotions.sql
-- ============================================================
create table promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  type text not null check (type in ('percentage', 'fixed_amount')),
  value numeric(12,2) not null,
  max_discount_amount numeric(12,2),
  department_id uuid references departments(id),
  category_id uuid references categories(id),
  product_id uuid references products(id),
  min_order_amount numeric(12,2) default 0,
  single_use_per_customer boolean not null default false,
  max_uses int,
  usage_count int not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_by uuid references profiles(id)
);

alter table promotions enable row level security;

-- Solo se exponen públicamente las promociones automáticas (sin código) — un cupón
-- con código se valida server-side (service_role) para no permitir enumerar códigos
-- válidos vía una consulta directa a la tabla.
create policy "public_select_automatic_promotions" on promotions
  for select using (
    code is null and is_active = true and now() between starts_at and ends_at
  );

create policy "staff_manage_promotions" on promotions for all
  using (current_role() in ('admin', 'marketing'))
  with check (current_role() in ('admin', 'marketing'));

-- ============================================================
-- 20260804000900_orders.sql
-- ============================================================
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
  using (current_role() = 'admin') with check (current_role() = 'admin');

create policy "marketing_select_orders" on orders
  for select using (current_role() = 'marketing');
  -- solo lectura, para Análisis de Ofertas y Performance de Clientes (RFM) — sección 09.

create policy "operaciones_manage_orders_in_scope" on orders for all
  using (current_role() = 'operaciones' and store_id = current_store_id())
  with check (current_role() = 'operaciones' and store_id = current_store_id());

create policy "repartidor_manage_assigned_orders" on orders for all
  using (current_role() = 'repartidor' and assigned_driver_id = auth.uid())
  with check (current_role() = 'repartidor' and assigned_driver_id = auth.uid());

-- Políticas diferidas de la migración 0003/0004/0005 (necesitaban `orders`, ver notas ahí).
create policy "operaciones_select_customer_in_scope" on profiles
  for select using (
    current_role() = 'operaciones'
    and role = 'customer'
    and exists (select 1 from orders o where o.user_id = profiles.id and o.store_id = current_store_id())
  );

create policy "repartidor_select_customer_for_assigned_order" on profiles
  for select using (
    current_role() = 'repartidor'
    and role = 'customer'
    and exists (select 1 from orders o where o.user_id = profiles.id and o.assigned_driver_id = auth.uid())
  );

create policy "operaciones_select_addresses_in_scope" on addresses
  for select using (
    current_role() = 'operaciones'
    and exists (select 1 from orders o where o.address_id = addresses.id and o.store_id = current_store_id())
  );

create policy "repartidor_select_addresses_for_assigned_order" on addresses
  for select using (
    current_role() = 'repartidor'
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
          or current_role() = 'admin'
          or current_role() = 'marketing'
          or (current_role() = 'operaciones' and o.store_id = current_store_id())
          or (current_role() = 'repartidor' and o.assigned_driver_id = auth.uid())
        )
    )
  );

create policy "staff_insert_order_status_history" on order_status_history
  for insert with check (current_role() in ('admin', 'operaciones', 'repartidor'));

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
          or current_role() = 'admin'
          or current_role() = 'marketing'
          or (current_role() = 'operaciones' and o.store_id = current_store_id())
          or (current_role() = 'repartidor' and o.assigned_driver_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (
          o.user_id = auth.uid()
          or current_role() = 'admin'
          or (current_role() = 'operaciones' and o.store_id = current_store_id())
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
        and (o.user_id = auth.uid() or current_role() in ('admin', 'operaciones'))
    )
  );

-- ============================================================
-- 20260804001000_payments.sql
-- ============================================================
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

-- ============================================================
-- 20260804001100_loyalty.sql
-- ============================================================
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
  for select using (current_role() in ('admin', 'marketing'));

-- RFM: herramienta interna de Admin/Marketing, no expuesta al cliente (sección 14).
create policy "staff_select_customer_rfm_snapshot" on customer_rfm_snapshot
  for select using (current_role() in ('admin', 'marketing'));

-- ============================================================
-- 20260804001200_marketing_content.sql
-- ============================================================
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

-- ============================================================
-- 20260804001300_billing_audit.sql
-- ============================================================
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

-- ============================================================
-- 20260804001400_business_triggers.sql
-- ============================================================
-- Mantiene profiles.points_balance como cache de la suma de points_ledger.points
-- (la fuente de verdad es el ledger, sección 05).
create or replace function public.sync_points_balance()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_user uuid;
begin
  target_user := coalesce(new.user_id, old.user_id);
  update profiles
    set points_balance = (select coalesce(sum(points), 0) from points_ledger where user_id = target_user)
    where id = target_user;
  return coalesce(new, old);
end;
$$;

create trigger points_ledger_sync_balance
  after insert or update or delete on points_ledger
  for each row execute function sync_points_balance();

-- Mantiene store_products.stock_quantity como cache de la suma de lotes activos
-- en product_batches (la fuente de verdad real es el lote, sección 13).
create or replace function public.sync_store_product_stock()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_store uuid;
  target_product uuid;
begin
  target_store := coalesce(new.store_id, old.store_id);
  target_product := coalesce(new.product_id, old.product_id);

  insert into store_products (store_id, product_id, stock_quantity)
  values (
    target_store,
    target_product,
    (select coalesce(sum(quantity), 0) from product_batches where store_id = target_store and product_id = target_product)
  )
  on conflict (store_id, product_id)
    do update set stock_quantity = excluded.stock_quantity;

  return coalesce(new, old);
end;
$$;

create trigger product_batches_sync_stock
  after insert or update or delete on product_batches
  for each row execute function sync_store_product_stock();

-- Impide que un usuario "normal" (no admin) modifique campos sensibles de su propia
-- fila en `profiles` a través de la política self_update_profile — RLS por sí sola
-- protege la FILA, no columnas específicas, así que esto es defensa adicional a nivel
-- de columna. Las conexiones con service_role (Server Actions de sistema, triggers
-- internos) no tienen auth.uid(), por lo que current_role() da NULL y este chequeo
-- se salta naturalmente para esos flujos de confianza.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if current_role() <> 'admin' then
    if new.role is distinct from old.role
      or new.points_balance is distinct from old.points_balance
      or new.rut_encrypted is distinct from old.rut_encrypted
      or new.is_active is distinct from old.is_active
      or new.store_id is distinct from old.store_id
      or new.anonymized_at is distinct from old.anonymized_at
      or new.must_change_password is distinct from old.must_change_password
    then
      raise exception 'No autorizado para modificar campos protegidos de profiles';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on profiles
  for each row execute function protect_profile_columns();

commit;
