# Epic 02 — Pedidos (stepper, detalle, selección múltiple, Kanban)

Sin cambios de datos ni de Server Actions existentes. Blast radius: `PedidosTable.tsx`, `AdminOrderRow.tsx`, página de pedidos.

## E02-T1 — Stepper y detalle expandible en Pedidos

**Depende de**: E01-T1
**Prioridad**: p0
**Archivos**: `src/components/admin/PedidosTable.tsx`, `src/components/admin/AdminOrderRow.tsx`, `src/components/admin/OrderStepper.tsx`, `src/components/admin/OrderRowDetail.tsx`

**Criterios de aceptación**
- WHEN un pedido tiene status='driver_assigned' y delivery_method='shipping' THE SYSTEM SHALL mostrar el stepper con el paso 4 de 5 ("En camino") marcado como actual y los pasos 1-3 como completados (driver_assigned/in_route/at_address están agrupados bajo "en_camino" en pipeline.ts — corregido tras verificar contra el código real, el criterio original tenía un mapeo erróneo).
- WHEN un pedido tiene status en ('delivery_issue','cancelled','returned_to_store') THE SYSTEM SHALL ocultar el stepper y mostrar el badge de estado simple, igual que hoy.
- WHEN el usuario hace click en "Ver detalle" de una fila THE SYSTEM SHALL expandir una fila con las líneas de `order_items` de ese pedido sin request adicional (datos ya cargados por la query existente).

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**: `step-02-pedidos-stepper`

---

## E02-T2 — Selección múltiple y acciones masivas

**Depende de**: E02-T1
**Prioridad**: p0
**Archivos**: `src/components/admin/PedidosTable.tsx`

**Criterios de aceptación**
- WHEN el usuario selecciona N pedidos que comparten el mismo status THE SYSTEM SHALL habilitar exactamente un botón de acción masiva correspondiente a ese status.
- WHEN la selección mezcla pedidos de distinto status THE SYSTEM SHALL deshabilitar toda acción masiva.
- WHEN todos los seleccionados están en status='pending_payment' y payment_method='mercadopago' THE SYSTEM SHALL no ofrecer ninguna acción masiva (Mercado Pago no tiene confirmación manual).
- WHEN se ejecuta la acción masiva THE SYSTEM SHALL invocar la Server Action unitaria existente una vez por pedido seleccionado, sin crear una Server Action nueva de tipo bulk.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**: `step-03-pedidos-seleccion-multiple`

---

## E02-T3 — Kanban real conectado al toggle

**Depende de**: E02-T2
**Prioridad**: p1
**Archivos**: `src/app/admin/pedidos/page.tsx`

**Criterios de aceptación**
- WHEN el usuario alterna a "Tablero" THE SYSTEM SHALL renderizar `KanbanBoard.tsx` sin modificar ese componente.
- WHEN el usuario escribe en el buscador de la vista Tabla y alterna a Tablero y vuelve THE SYSTEM SHALL preservar el texto de búsqueda de la vista Tabla sin mezclarlo con el buscador propio del Tablero (búsquedas independientes, igual que hoy).

**Verify**
```bash
npm run build
```

**Checkpoint**: `step-04-pedidos-kanban`
