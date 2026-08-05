-- Fase 6: "gestión de sucursales/radio/tramos de envío" es un módulo
-- exclusivo de Admin (sección 09) — no existía NINGUNA policy de
-- escritura sobre `stores` (solo lectura pública de sucursales activas),
-- así que Admin no podía crear/editar sucursales desde el panel.
create policy "admin_manage_stores" on stores for all
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');
