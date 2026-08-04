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
