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
