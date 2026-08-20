# Epic 05 — Promociones unificadas (Cupones + Análisis)

Sin cambios de datos — reutiliza las queries de `promociones/page.tsx` y `analisis-ofertas/page.tsx` tal cual existen.

## E05-T1 — Unificar Promociones (Cupones + Análisis) en pestañas

**Depende de**: —
**Prioridad**: p1
**Archivos**: `src/app/admin/promociones/page.tsx`, `src/app/admin/promociones/RendimientoPanel.tsx`, `src/app/admin/analisis-ofertas/page.tsx`

**Criterios de aceptación**
- WHEN el usuario visita /admin/promociones?tab=activos THE SYSTEM SHALL mostrar el mismo formulario "Nueva promoción" (con todos sus campos condicionales) que la página actual.
- WHEN el usuario visita /admin/promociones?tab=rendimiento THE SYSTEM SHALL mostrar los mismos 4 KPIs y la misma tabla "Productos más vendidos con descuento" que hoy muestra /admin/analisis-ofertas.
- WHEN el usuario visita /admin/analisis-ofertas THE SYSTEM SHALL redirigir (HTTP 307/308 o `redirect()` de Next) a /admin/promociones?tab=rendimiento sin devolver 404.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**: `step-07-promociones-tabs`
