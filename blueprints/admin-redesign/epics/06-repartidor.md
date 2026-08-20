# Epic 06 — Portal Repartidor (chat + countdown) + alta separada

Único epic que toca base de datos: 1 tabla nueva aditiva (`order_delivery_messages`). No modifica ninguna tabla existente.

## E06-T1 — Migración order_delivery_messages con RLS

**Depende de**: —
**Prioridad**: p0
**Archivos**: `supabase/migrations/*_order_delivery_messages.sql` (nombre real con timestamp asignado por `supabase migration new order_delivery_messages` al momento de correrlo)

**Criterios de aceptación**
- WHEN se aplica la migración en una rama/branch de desarrollo de Supabase THE SYSTEM SHALL crear la tabla `order_delivery_messages` con RLS habilitado.
- WHEN un usuario con rol repartidor autenticado consulta `order_delivery_messages` para un pedido no asignado a él THE SYSTEM SHALL devolver 0 filas.
- WHEN un usuario con rol repartidor autenticado consulta `order_delivery_messages` para un pedido sí asignado a él THE SYSTEM SHALL devolver las filas de ese pedido.

**Verify**
```bash
# manual: aplicar contra rama/branch de desarrollo, nunca directo a producción
# manual: probar con 2 cuentas repartidor distintas
```

**Checkpoint**: `step-08-migracion-chat`

---

## E06-T2 — Server Actions sendDeliveryMessage / listDeliveryMessages

**Depende de**: E06-T1
**Prioridad**: p0
**Archivos**: `src/lib/delivery-chat/actions.ts`, `src/lib/delivery-chat/types.ts`

**Criterios de aceptación**
- WHEN un repartidor autenticado llama sendDeliveryMessage sobre un pedido asignado a él THE SYSTEM SHALL insertar la fila y devolverla.
- WHEN un repartidor autenticado llama sendDeliveryMessage sobre un pedido NO asignado a él THE SYSTEM SHALL devolver un error sin insertar fila.
- WHEN un mensaje consiste únicamente en 6 dígitos THE SYSTEM SHALL rechazarlo (medida defensiva contra fuga del código de entrega).

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: prueba con 2 cuentas repartidor
```

**Checkpoint**: `step-09-chat-actions`

---

## E06-T3 — Countdown de incidencia

**Depende de**: —
**Prioridad**: p1
**Archivos**: `src/components/repartidor/OrderCard.tsx`

**Criterios de aceptación**
- WHEN un pedido tiene delivery_issue_at hace menos de max_delivery_issue_wait_minutes THE SYSTEM SHALL mostrar el botón "Volver a la tienda" deshabilitado con el tiempo restante.
- WHEN transcurre max_delivery_issue_wait_minutes desde delivery_issue_at THE SYSTEM SHALL habilitar el botón "Volver a la tienda" sin recargar la página.

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: bajar max_delivery_issue_wait_minutes a 1 minuto y cronometrar
```

**Checkpoint**: `step-10-countdown-incidencia`

---

## E06-T4 — Panel de chat integrado

**Depende de**: E06-T2, E06-T3
**Prioridad**: p1
**Archivos**: `src/app/repartidor/IssueChatPanel.tsx`, `src/app/repartidor/page.tsx`

**Criterios de aceptación**
- WHEN el staff envía un mensaje desde el admin THE SYSTEM SHALL mostrarlo en el portal del repartidor dentro de una ventana de polling de 15 a 20 segundos.
- WHEN el repartidor envía un mensaje THE SYSTEM SHALL mostrarlo del lado del staff dentro de la misma ventana de polling.

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: 2 sesiones simultáneas
```

**Checkpoint**: `step-11-chat-panel`

---

## E06-T5 — Alta de Repartidores separada de Usuarios

**Depende de**: —
**Prioridad**: p1
**Archivos**: `src/app/admin/configuracion/repartidores/page.tsx`, `src/app/admin/configuracion/repartidores/RepartidorForm.tsx`

**Criterios de aceptación**
- WHEN un admin crea un repartidor desde /admin/configuracion/repartidores THE SYSTEM SHALL producir en `profiles` la misma fila (role='repartidor', misma sucursal, misma contraseña temporal mostrada una sola vez) que crearlo hoy desde Configuración → Usuarios con rol Repartidor.
- WHEN la pantalla de Repartidores carga THE SYSTEM SHALL no mostrar un selector de rol (queda fijo).

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: comparar fila en profiles contra alta desde Usuarios
```

**Checkpoint**: `step-12-alta-repartidores`
