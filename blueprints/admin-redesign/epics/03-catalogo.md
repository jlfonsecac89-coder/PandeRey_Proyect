# Epic 03 — Catálogo (Productos)

Sin cambios de datos. El drawer de edición (`ProductDrawer.tsx` + `DrawerSection.tsx`) YA EXISTE y no se reconstruye.

## E03-T1 — KPIs, filtro "sin fotos", copiar SKU y toggle inline

**Depende de**: —
**Prioridad**: p1
**Archivos**: `src/components/admin/ProductosTable.tsx`, `src/components/admin/ProductKpiRow.tsx`

**Criterios de aceptación**
- WHEN la página de Productos carga THE SYSTEM SHALL mostrar 4 KPIs (Total, Activos, Inactivos, Edición limitada) cuyo valor coincide con un `select count(*)` filtrado equivalente ejecutado contra la misma base.
- WHEN el usuario activa el filtro "Sin fotos" THE SYSTEM SHALL mostrar solo productos con 0 filas en `product_images`.
- WHEN el usuario hace click en el toggle activo/inactivo de una tarjeta THE SYSTEM SHALL invocar la misma Server Action que usa `ProductDrawer.tsx` para ese campo, no una nueva.
- WHEN el usuario abre "Editar" desde una tarjeta THE SYSTEM SHALL abrir `ProductDrawer.tsx` sin cambios de comportamiento respecto a hoy.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**: `step-05-productos-kpis`
