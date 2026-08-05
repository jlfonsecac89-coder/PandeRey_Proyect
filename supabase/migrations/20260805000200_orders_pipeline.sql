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
