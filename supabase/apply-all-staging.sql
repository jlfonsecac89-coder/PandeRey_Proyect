begin;

-- ===== 20260804000100_extensions.sql =====
-- Requeridas por el modelo de datos (BLUEPRINT.md sección 05/13):
-- unaccent: deduplicación de nombres (departments/categories/collections/products.name_normalized)
create extension if not exists unaccent;
create extension if not exists pgcrypto;

-- unaccent() viene marcada STABLE (no IMMUTABLE) en Postgres, porque en teoría el
-- diccionario podría cambiar en tiempo de ejecución — pero las columnas GENERATED
-- ALWAYS AS exigen una expresión IMMUTABLE. Este wrapper fija el diccionario y le
-- promete a Postgres que el resultado es determinístico (patrón estándar para este
-- caso, el diccionario "unaccent" no cambia en producción).
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1)
$$;

-- ===== 20260804000200_stores.sql =====
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

-- ===== 20260804000300_profiles.sql =====
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

-- ===== 20260804000400_helper_functions.sql =====
-- Funciones auxiliares para políticas RLS. SECURITY DEFINER porque necesitan leer
-- `profiles` (con RLS habilitado) sin recursión infinita de políticas; cada una
-- está atada a auth.uid(), así que nunca exponen datos de otro usuario.
create or replace function public.current_app_role()
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

-- --- Políticas de `profiles` que dependen de current_app_role()/current_store_id() ---

create policy "admin_select_all_profiles" on profiles
  for select using (current_app_role() = 'admin');

create policy "admin_update_non_admin_profiles" on profiles
  for update using (current_app_role() = 'admin' and role <> 'admin')
  with check (role in ('customer', 'marketing', 'operaciones', 'repartidor'));
  -- el with check hace imposible, incluso vía RLS, transformar una fila en role='admin':
  -- una cuenta Admin solo se crea manualmente en Supabase con service_role (sección 08).

create policy "marketing_select_customer_profiles" on profiles
  for select using (current_app_role() = 'marketing' and role = 'customer');
  -- CRM: Marketing ve clientes de todas las sucursales (sección 09), nunca otro staff.

-- Las políticas de "operaciones" y "repartidor" sobre `profiles` (ver un cliente solo
-- en el contexto de un pedido) se agregan en 20260804000900_orders.sql, porque
-- necesitan referenciar la tabla `orders`, que todavía no existe en este punto.

-- ===== 20260804000500_identity_extra.sql =====
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

-- ===== 20260804000600_catalog.sql =====
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

-- ===== 20260804000700_inventory.sql =====
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

-- ===== 20260804000800_promotions.sql =====
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
  using (current_app_role() in ('admin', 'marketing'))
  with check (current_app_role() in ('admin', 'marketing'));

-- ===== 20260804000900_orders.sql =====
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

-- ===== 20260804001000_payments.sql =====
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
  for select using (current_app_role() = 'admin');

-- Pagos de Mercado Pago: dueño del pedido (solo lectura) + staff con visibilidad de la orden.
create policy "select_payments_if_can_access_order" on payments
  for select using (
    exists (
      select 1 from orders o
      where o.id = payments.order_id
        and (
          o.user_id = auth.uid()
          or current_app_role() = 'admin'
          or (current_app_role() = 'operaciones' and o.store_id = current_store_id())
        )
    )
  );

-- Credencial de WhatsApp: exclusiva de Admin (es un secreto de integración, sección 11).
create policy "admin_manage_whatsapp_integration" on whatsapp_integration for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

-- Transferencia bancaria: dueño del pedido ve su estado; Operaciones/Admin revisan y aprueban.
create policy "select_bank_transfer_if_can_access_order" on bank_transfer_payments
  for select using (
    exists (
      select 1 from orders o
      where o.id = bank_transfer_payments.order_id
        and (
          o.user_id = auth.uid()
          or current_app_role() = 'admin'
          or (current_app_role() = 'operaciones' and o.store_id = current_store_id())
        )
    )
  );
create policy "staff_review_bank_transfer" on bank_transfer_payments for update
  using (
    current_app_role() = 'admin'
    or (current_app_role() = 'operaciones' and exists (
      select 1 from orders o where o.id = bank_transfer_payments.order_id and o.store_id = current_store_id()
    ))
  );

-- Canjes de cupón: dueño del pedido + Admin/Marketing (Análisis de Ofertas, sección 14).
create policy "select_own_coupon_redemptions" on coupon_redemptions
  for select using (auth.uid() = user_id or current_app_role() in ('admin', 'marketing'));
create policy "customer_insert_own_coupon_redemption" on coupon_redemptions
  for insert with check (auth.uid() = user_id);

-- ===== 20260804001100_loyalty.sql =====
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

-- ===== 20260804001200_marketing_content.sql =====
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
  using (current_app_role() in ('admin', 'marketing'))
  with check (current_app_role() in ('admin', 'marketing'));

-- Newsletter: cualquier visitante puede suscribirse (formulario público, opt-in explícito);
-- la baja (unsubscribe) se hace vía Route Handler con service_role validando un link firmado,
-- no directo por RLS — por eso no hay policy de UPDATE público acá.
create policy "public_insert_newsletter_subscription" on newsletter_subscribers
  for insert with check (true);
create policy "staff_select_newsletter_subscribers" on newsletter_subscribers
  for select using (current_app_role() in ('admin', 'marketing'));

create policy "admin_manage_instagram_integration" on instagram_integration for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');

-- ===== 20260804001300_billing_audit.sql =====
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
          or current_app_role() = 'admin'
          or (current_app_role() = 'operaciones' and o.store_id = current_store_id())
        )
    )
  );

-- Auditoría: exclusiva de Admin (sección 09) — ni siquiera Marketing/Operaciones la ven.
create policy "admin_select_audit_log" on audit_log
  for select using (current_app_role() = 'admin');

create policy "self_select_notifications_log" on notifications_log
  for select using (auth.uid() = user_id);
create policy "admin_select_notifications_log" on notifications_log
  for select using (current_app_role() = 'admin');

-- ===== 20260804001400_business_triggers.sql =====
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
-- internos) no tienen auth.uid(), por lo que current_app_role() da NULL y este chequeo
-- se salta naturalmente para esos flujos de confianza.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if current_app_role() <> 'admin' then
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

-- ===== 20260804001500_grants.sql =====
-- Los permisos a nivel de tabla (GRANT) son el "portón" que debe estar abierto antes
-- de que RLS pueda filtrar filas — sin esto, Postgres rechaza con "permission denied"
-- (42501) incluso para las políticas que sí deberían permitir acceso. El editor de
-- Supabase hace este grant automáticamente al crear tablas desde la UI; como estas
-- tablas se crearon por SQL directo, hay que otorgarlo explícitamente. El control de
-- acceso real sigue siendo 100% RLS (sección 10) — esto solo abre la puerta para que
-- las políticas puedan evaluarse. service_role también lo necesita: BYPASSRLS solo
-- salta la evaluación de políticas, no el chequeo de privilegios base de la tabla.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

-- ===== 20260805000100_storage_product_images.sql =====
-- El bucket "product-images" ya se creó vía API (público: la lectura no
-- necesita política, Supabase Storage la sirve directo). Estas políticas
-- solo cubren escritura (INSERT/UPDATE/DELETE) — mismo criterio que
-- staff_manage_product_images en la tabla product_images (sección 13).
create policy "staff_upload_product_images" on storage.objects
  for insert
  with check (bucket_id = 'product-images' and current_app_role() in ('admin', 'operaciones'));

create policy "staff_update_product_images_storage" on storage.objects
  for update
  using (bucket_id = 'product-images' and current_app_role() in ('admin', 'operaciones'));

create policy "staff_delete_product_images_storage" on storage.objects
  for delete
  using (bucket_id = 'product-images' and current_app_role() in ('admin', 'operaciones'));

-- ===== 20260805000200_orders_pipeline.sql =====
-- Fase 5: pipeline de pedidos, SLA y seguimiento (sección 07 del blueprint).

-- Operaciones necesita ver los repartidores de SU sucursal para poder
-- asignarlos a un pedido ("asignación de repartidor", módulo de Operaciones,
-- sección 09) — no existía ninguna policy que le permitiera ver perfiles de
-- otro staff en absoluto.
create policy "operaciones_select_repartidor_in_scope" on profiles
  for select using (
    current_app_role() = 'operaciones'
    and role = 'repartidor'
    and store_id = current_store_id()
  );

-- ===== 20260805000300_admin_stores_management.sql =====
-- Fase 6: "gestión de sucursales/radio/tramos de envío" es un módulo
-- exclusivo de Admin (sección 09) — no existía NINGUNA policy de
-- escritura sobre `stores` (solo lectura pública de sucursales activas),
-- así que Admin no podía crear/editar sucursales desde el panel.
create policy "admin_manage_stores" on stores for all
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');

-- ===== 20260806000100_points_redemption.sql =====
-- Fase 7: canje de producto por puntos (sección 14) — el pedido resultante
-- se paga enteramente en puntos, no vía Mercado Pago, así que necesita su
-- propio valor de payment_method para que el resto del pipeline (SLA,
-- notificaciones, panel de pedidos) lo trate como cualquier otro pedido.
alter table orders drop constraint orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('mercadopago', 'bank_transfer', 'points'));

-- ===== 20260806000200_special_event_stock.sql =====
-- Fase 9 (hardening): cierra un gap real de la Fase 3 — la Aceptación 2 de
-- esa fase exigía que un producto `is_special_event` nunca venda más de
-- `max_orders` unidades, ni con compras concurrentes simultáneas, pero esa
-- validación nunca se conectó al checkout real construido en la Fase 4.
--
-- Un UPDATE con el chequeo de cupo en el WHERE es atómico por fila en
-- Postgres — dos requests concurrentes para el mismo producto se serializan
-- por el lock de fila, así que nunca se puede superar max_orders aunque
-- lleguen al mismo tiempo.
create or replace function public.reserve_special_event_stock(p_product_id uuid, p_quantity int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update products
  set special_orders_count = special_orders_count + p_quantity
  where id = p_product_id
    and is_special_event = true
    and max_orders is not null
    and special_orders_count + p_quantity <= max_orders;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Compensación si el checkout falla después de reservar cupo de más de un
-- producto de evento en el mismo carrito (todo o nada).
create or replace function public.release_special_event_stock(p_product_id uuid, p_quantity int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products
  set special_orders_count = greatest(special_orders_count - p_quantity, 0)
  where id = p_product_id;
end;
$$;

revoke all on function public.reserve_special_event_stock(uuid, int) from public, anon;
revoke all on function public.release_special_event_stock(uuid, int) from public, anon;
grant execute on function public.reserve_special_event_stock(uuid, int) to authenticated;
grant execute on function public.release_special_event_stock(uuid, int) to authenticated;

-- ===== 20260807000100_storage_banners.sql =====
-- El bucket "banners" ya se creó vía API (público: la lectura no necesita
-- política). Estas políticas solo cubren escritura — mismo criterio que
-- staff_manage_banners en la tabla `banners` (Admin y Marketing, sección 13).
create policy "staff_upload_banners" on storage.objects
  for insert
  with check (bucket_id = 'banners' and current_app_role() in ('admin', 'marketing'));

create policy "staff_update_banners_storage" on storage.objects
  for update
  using (bucket_id = 'banners' and current_app_role() in ('admin', 'marketing'));

create policy "staff_delete_banners_storage" on storage.objects
  for delete
  using (bucket_id = 'banners' and current_app_role() in ('admin', 'marketing'));

-- ===== 20260807000200_best_selling_products.sql =====
-- "Más Vendidos" (sección 13) se calcula en tiempo de consulta a partir del
-- volumen real de order_items, no es una colección manual. Function en vez
-- de armar el group-by desde el cliente Supabase-js (no soporta agregados
-- con join directo) — solo lectura, así que se puede exponer a anon.
create or replace function public.get_best_selling_product_ids(days int, limit_count int)
returns table (product_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id
  from order_items oi
  join orders o on o.id = oi.order_id
  where o.status <> 'pending_payment' and o.status <> 'cancelled'
    and o.created_at >= now() - (days || ' days')::interval
  group by oi.product_id
  order by sum(oi.quantity) desc
  limit limit_count;
$$;

revoke all on function public.get_best_selling_product_ids(int, int) from public;
grant execute on function public.get_best_selling_product_ids(int, int) to anon, authenticated;

-- ===== 20260807000300_fix_self_update_profile_recursion.sql =====
-- Bug real encontrado en la Fase 10: self_update_profile (creada en la
-- migración base de profiles, antes de que existiera current_app_role())
-- comparaba el role nuevo contra un SELECT crudo a la propia tabla
-- `profiles` en su WITH CHECK — evaluar esa subquery vuelve a disparar RLS
-- sobre `profiles`, que a su vez vuelve a evaluar este mismo WITH CHECK:
-- "infinite recursion detected in policy for relation profiles" (42P17) en
-- CUALQUIER UPDATE de un cliente sobre su propia fila (ej. editar nombre/
-- teléfono en Mi Cuenta). Nunca se había detectado porque el único otro
-- self-update (changePasswordFirstLogin) usa el cliente admin a propósito,
-- saltándose RLS por completo.
--
-- current_app_role() es security definer: internamente bypassea RLS al
-- leer profiles, así que no recursiona.
drop policy "self_update_profile" on profiles;
create policy "self_update_profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id AND role = current_app_role());

-- ===== 20260808000100_batch_stock_fifo.sql =====
-- Fase 11: el checkout nunca validó ni descontó stock real de
-- `product_batches` (solo `special_orders_count` para productos de evento,
-- cerrado en la Fase 9) — cualquier producto se podía vender sin límite.
-- Cierra ese gap con el mismo patrón ya usado para el cupo de eventos:
-- reserva/consumo atómico en el checkout, con compensación si un paso
-- posterior del mismo request falla.
--
-- Diseño: un producto que NUNCA tuvo un lote cargado en `product_batches`
-- para la sucursal del pedido se trata como "no trackeado por lotes" (stock
-- ilimitado implícito) — así no se rompe el catálogo existente de fases
-- anteriores, donde ningún producto de prueba tiene lotes. Solo productos
-- con al menos un lote en esa sucursal quedan sujetos a la validación FIFO
-- real. Esto es consistente con cómo el staff realmente opera: cargan lotes
-- para lo que sí llevan trazabilidad de vencimiento, no para todo.
create or replace function public.consume_batch_stock_fifo(p_store_id uuid, p_product_id uuid, p_quantity int)
returns jsonb  -- null = no había stock suficiente; si no, array [{batch_id, quantity}] de lo consumido
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int := p_quantity;
  v_batch record;
  v_take int;
  v_consumed jsonb := '[]'::jsonb;
  v_item record;
begin
  for v_batch in
    select id, quantity
    from product_batches
    where store_id = p_store_id and product_id = p_product_id and quantity > 0
    order by expiration_date asc nulls last, received_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_batch.quantity, v_remaining);
    update product_batches set quantity = quantity - v_take where id = v_batch.id;
    v_consumed := v_consumed || jsonb_build_object('batch_id', v_batch.id, 'quantity', v_take);
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    -- No alcanzó: revierte lo consumido en este mismo loop antes de fallar,
    -- para no dejar lotes parcialmente descontados de una venta rechazada.
    for v_item in select * from jsonb_to_recordset(v_consumed) as x(batch_id uuid, quantity int)
    loop
      update product_batches set quantity = quantity + v_item.quantity where id = v_item.batch_id;
    end loop;
    return null;
  end if;

  return v_consumed;
end;
$$;

-- Cuenta cuántas unidades tiene actualmente trackeadas por lote un producto
-- en una sucursal (0 = no trackeado o sin stock) — usado por el checkout
-- para decidir si corresponde exigir stock antes de reservar.
create or replace function public.has_tracked_batches(p_store_id uuid, p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from product_batches where store_id = p_store_id and product_id = p_product_id);
$$;

-- Compensación si el checkout falla después de consumir stock de más de un
-- producto en el mismo carrito (todo o nada), igual que
-- release_special_event_stock.
create or replace function public.restore_batch_stock(p_consumed jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  for v_item in select * from jsonb_to_recordset(p_consumed) as x(batch_id uuid, quantity int)
  loop
    update product_batches set quantity = quantity + v_item.quantity where id = v_item.batch_id;
  end loop;
end;
$$;

revoke all on function public.consume_batch_stock_fifo(uuid, uuid, int) from public, anon;
revoke all on function public.has_tracked_batches(uuid, uuid) from public, anon;
revoke all on function public.restore_batch_stock(jsonb) from public, anon;
grant execute on function public.consume_batch_stock_fifo(uuid, uuid, int) to authenticated;
grant execute on function public.has_tracked_batches(uuid, uuid) to authenticated;
grant execute on function public.restore_batch_stock(jsonb) to authenticated;

-- Permite a Admin/Operaciones (ya cubiertos por las políticas "for all"
-- existentes sobre product_batches) marcar/desmarcar liquidación con una
-- función dedicada no es necesario — el UPDATE directo ya está permitido por
-- RLS. Solo se documenta acá para dejar constancia de que no faltaba policy.

-- ===== 20260808000200_orders_discount_split.sql =====
-- Fase 11: el módulo de Análisis de Ofertas (sección 14) necesita saber
-- cuánto descuento otorgó específicamente un CUPÓN/promoción, separado del
-- descuento por canje de puntos — pero `orders.discount_total` guarda ambos
-- sumados desde la Fase 4/7, sin desglose. Se agrega el desglose hacia
-- adelante (no hay pedidos reales en producción todavía, sección 19), y se
-- deja `discount_total` intacto como el total combinado que ya usa el resto
-- de la UI (resumen de pedido, Mi Cuenta, admin de pedidos).
alter table orders add column coupon_discount_clp numeric(12,2) not null default 0;
alter table orders add column points_discount_clp numeric(12,2) not null default 0;

-- ===== 20260808000300_customer_rfm.sql =====
-- La tabla `customer_rfm_snapshot` y su RLS ya se crearon en la migración
-- base de loyalty (20260804001100) junto con el resto del modelo de datos —
-- acá solo se agrega el índice de lectura y la función de recálculo que
-- faltaban para que el módulo de la Fase 11 funcione de verdad.
create index if not exists customer_rfm_snapshot_user_computed_idx
  on customer_rfm_snapshot (user_id, computed_at desc);

-- Recalcula el segmento RFM+LTV de cada cliente con al menos un pedido no
-- cancelado/pendiente. Inserta una fila nueva por cliente en cada corrida
-- (no sobreescribe) para poder ver la evolución en el tiempo (sección 14).
--
-- Los puntajes r/f/m son quintiles (NTILE(5)) sobre la base de clientes
-- activa en esa corrida — la escala es relativa a la cartera actual, no un
-- umbral fijo. El blueprint (sección 14) define los 5 segmentos solo de
-- forma cualitativa; la siguiente heurística es la interpretación concreta
-- usada acá, documentada porque no hay una única forma "correcta":
--   estrella  = r,f,m todos altos (>=4)
--   leal      = compra seguido y gasta bien (f,m >=4) sin necesitar r alto
--   perdido   = ausencia larga Y frecuencia/monto bajos (r,f,m todos <=2)
--   dormido   = ausente (r<=2) pero historialmente bueno (f o m >=3)
--   promedio  = cualquier otra combinación intermedia
create or replace function public.recompute_customer_rfm(p_window_days int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
begin
  with base as (
    select
      o.user_id,
      extract(day from now() - max(o.created_at))::int as recency_days,
      count(*) filter (
        where o.created_at >= now() - (p_window_days || ' days')::interval
      ) as frequency_count,
      coalesce(sum(o.total) filter (
        where o.created_at >= now() - (p_window_days || ' days')::interval
      ), 0) as monetary_total,
      coalesce(sum(o.total), 0) as ltv_total
    from orders o
    where o.status not in ('pending_payment', 'cancelled')
    group by o.user_id
  ),
  scored as (
    select
      user_id, recency_days, frequency_count, monetary_total, ltv_total,
      (6 - ntile(5) over (order by recency_days))::smallint as r_score,
      ntile(5) over (order by frequency_count)::smallint as f_score,
      ntile(5) over (order by monetary_total)::smallint as m_score
    from base
  ),
  segmented as (
    select *,
      case
        when r_score >= 4 and f_score >= 4 and m_score >= 4 then 'estrella'
        when f_score >= 4 and m_score >= 4 then 'leal'
        when r_score <= 2 and f_score <= 2 and m_score <= 2 then 'perdido'
        when r_score <= 2 and (f_score >= 3 or m_score >= 3) then 'dormido'
        else 'promedio'
      end as segment
    from scored
  )
  insert into customer_rfm_snapshot (
    user_id, recency_days, frequency_count, monetary_total, ltv_total,
    r_score, f_score, m_score, segment, suggested_action
  )
  select
    user_id, recency_days, frequency_count, monetary_total, ltv_total,
    r_score, f_score, m_score, segment,
    case segment
      when 'estrella' then 'premiar'
      when 'leal' then 'premiar'
      when 'promedio' then 'impulsar_venta'
      when 'dormido' then 'retener'
      else 'activar'
    end
  from segmented;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Solo se llama con service_role (cron semanal, sección 06) — no se otorga
-- a authenticated, evita que cualquier sesión de staff dispare recálculos
-- costosos a demanda. REVOKE ALL FROM PUBLIC también le quita el acceso
-- implícito a service_role (no es superusuario en Supabase), así que hay
-- que volver a otorgárselo explícitamente.
revoke all on function public.recompute_customer_rfm(int) from public, anon, authenticated;
grant execute on function public.recompute_customer_rfm(int) to service_role;

-- ===== 20260808000400_public_clearance_lookup.sql =====
-- Bug real encontrado en la Fase 11: `product_batches` nunca tuvo policy de
-- SELECT pública (comentario original en 20260804000700_inventory.sql:
-- "dato operativo interno, no público") — correcto para no exponer lotes,
-- cantidades ni vencimientos, PERO eso también bloqueaba silenciosamente
-- (sin error, solo filas vacías por RLS) la consulta de liquidación desde
-- checkout/tienda/detalle de producto, que corren con la sesión del propio
-- cliente. El descuento de liquidación nunca se estaba aplicando de verdad.
--
-- Mismo patrón que get_best_selling_product_ids (Fase 10): una función
-- SECURITY DEFINER expone solo el dato agregado que sí es público
-- (porcentaje de descuento activo), sin exponer cantidad/vencimiento/lote.
create or replace function public.get_clearance_discounts(p_store_id uuid, p_product_ids uuid[])
returns table(product_id uuid, discount_percent numeric)
language sql
security definer
set search_path = public
stable
as $$
  select pb.product_id, max(pb.clearance_discount_percent) as discount_percent
  from product_batches pb
  where pb.store_id = p_store_id
    and pb.is_clearance = true
    and pb.quantity > 0
    and pb.clearance_discount_percent is not null
    and pb.product_id = any(p_product_ids)
  group by pb.product_id;
$$;

create or replace function public.get_clearance_product_ids(p_store_id uuid)
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(distinct pb.product_id), '{}')
  from product_batches pb
  where pb.store_id = p_store_id
    and pb.is_clearance = true
    and pb.quantity > 0;
$$;

revoke all on function public.get_clearance_discounts(uuid, uuid[]) from public;
revoke all on function public.get_clearance_product_ids(uuid) from public;
grant execute on function public.get_clearance_discounts(uuid, uuid[]) to anon, authenticated;
grant execute on function public.get_clearance_product_ids(uuid) to anon, authenticated;

-- ===== 20260810000100_cookie_consent_anon.sql =====
-- Bug real encontrado en la Fase 12: `cookie_consents.user_id` está pensado
-- para ser null en visitantes sin cuenta (comentario original en la
-- migración base), pero la única policy existente (`self_manage_cookie_consents`)
-- exige `auth.uid() = user_id` — con una sesión anónima `auth.uid()` es NULL,
-- y en SQL `null = null` no es `true`, es `NULL` (RLS lo trata como
-- denegado). Ningún visitante sin cuenta podía insertar su consentimiento.
create policy "anon_insert_cookie_consent" on cookie_consents
  for insert to anon
  with check (user_id is null);

-- ===== setup-admin-exec.sql =====
-- Ejecutar UNA sola vez. Habilita que las migraciones futuras se apliquen
-- directo con la service_role key (que ya tiene acceso total a la base;
-- esto no otorga ningún privilegio nuevo, solo un canal directo para usarlo).
create or replace function public.admin_exec_sql(query text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute query;
end;
$$;

revoke all on function public.admin_exec_sql(text) from public, anon, authenticated;
grant execute on function public.admin_exec_sql(text) to service_role;

commit;
