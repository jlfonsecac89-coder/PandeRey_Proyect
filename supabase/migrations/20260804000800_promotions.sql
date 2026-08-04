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
