# Epic 04 — CRM unificado (Clientes con pestañas)

Sin cambios de datos — mismas queries que hoy usan `/admin/clientes`.

## E04-T1 — Unificar Clientes en pestañas (Lista/Segmentos/Ranking)

**Depende de**: —
**Prioridad**: p1
**Archivos**: `src/app/admin/clientes/page.tsx`, `src/app/admin/clientes/SegmentosPanel.tsx`, `src/app/admin/clientes/RankingPanel.tsx`

**Criterios de aceptación**
- WHEN el usuario visita /admin/clientes?tab=lista THE SYSTEM SHALL mostrar los mismos filtros de segmento y las mismas opciones de orden (LTV histórico / Gasto reciente) que la página actual.
- WHEN el usuario visita /admin/clientes?tab=segmentos THE SYSTEM SHALL mostrar 5 columnas con conteo y valor total por segmento, calculados desde `customer_rfm_snapshot` con el mismo dedup manual que usa la página actual.
- WHEN el usuario visita /admin/clientes?tab=ranking THE SYSTEM SHALL mostrar el mismo top N por LTV que la vista actual.
- WHEN no se pasa `?tab=` THE SYSTEM SHALL asumir `lista` por defecto.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**: `step-06-clientes-tabs`
