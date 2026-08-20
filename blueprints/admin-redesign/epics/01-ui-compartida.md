# Epic 01 — UI compartida (acordeón)

Sin cambios de datos. Blast radius: `AdminNav.tsx` y un componente nuevo puramente presentacional.

## E01-T1 — Sidebar en acordeón (AdminNavGroup)

**Depende de**: —
**Prioridad**: p0
**Archivos**: `src/components/admin/AdminNav.tsx`, `src/components/admin/AdminNavGroup.tsx`

**Criterios de aceptación**
- WHEN el admin carga con un usuario admin THE SYSTEM SHALL mostrar los grupos "Resumen" y "Operación diaria" expandidos y el resto colapsados.
- WHEN el usuario hace click en el header de un grupo colapsado THE SYSTEM SHALL expandirlo sin recargar la página.
- WHEN el usuario navega a una ruta cuyo item vive en un grupo colapsado THE SYSTEM SHALL expandir ese grupo automáticamente.
- WHEN se ejecuta `npx tsc --noEmit` THE SYSTEM SHALL salir con código 0.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**: `step-01-sidebar-acordeon`
