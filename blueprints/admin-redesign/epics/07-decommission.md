# Epic 07 — Decommission (limpieza final)

Solo se ejecuta después de que los epics 01-06 estén verificados en producción sin incidentes durante unos días de uso real.

## E07-T1 — Decommission de rutas viejas

**Depende de**: E01-T1, E02-T3, E03-T1, E04-T1, E05-T1, E06-T4, E06-T5
**Prioridad**: p2
**Archivos**: `src/app/admin/analisis-ofertas/page.tsx`

**Criterios de aceptación**
- WHEN se borran los archivos de las rutas reemplazadas THE SYSTEM SHALL seguir compilando (`npm run build` exit 0).
- WHEN se busca `analisis-ofertas` en `src/` THE SYSTEM SHALL no encontrar referencias residuales fuera de la propia redirección ya removida.

**Verify**
```bash
npm run build
! grep -r "analisis-ofertas" src/
```

**Checkpoint**: `step-13-decommission`
