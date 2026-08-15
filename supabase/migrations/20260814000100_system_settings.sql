-- Fase 5: Ajustes del Sistema. Solo parámetros operativos no sensibles
-- (SLA de preparación, tiempo de espera de problemas de entrega, tasas del
-- programa de lealtad) — nunca credenciales ni claves de pago, esas quedan
-- exclusivamente en variables de entorno del hosting. select público porque
-- algunos de estos valores se muestran en páginas de cliente (ej. "cuánto
-- vale 1 punto" en /cuenta/puntos); escritura solo admin.
create table system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table system_settings enable row level security;

create policy "public_select_system_settings" on system_settings for select using (true);
create policy "admin_manage_system_settings" on system_settings for all
  using (current_app_role() = 'admin') with check (current_app_role() = 'admin');
