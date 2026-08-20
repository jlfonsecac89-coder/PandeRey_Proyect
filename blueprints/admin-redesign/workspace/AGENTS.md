<!--
MERGE NOTE: agregar como sección nueva al AGENTS.md existente del repo,
después del bloque generado por `next dev`. No borrar ese bloque.
-->

## Verificación del cambio "admin-redesign"

Este repo no tiene test runner ni CI configurado. Para cada paso de
`blueprints/admin-redesign/tasks.json`, correr en este orden y no marcar el
paso como hecho hasta que los tres pasen:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Para pasos que tocan `supabase/migrations/`, aplicar primero contra una
rama/branch de desarrollo de Supabase — nunca directo a producción.
