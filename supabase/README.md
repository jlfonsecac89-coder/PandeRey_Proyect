# Supabase

- `migrations/` — las 14 migraciones de la Fase 1 (BLUEPRINT.md sección 05), en orden: extensiones, sucursales, perfiles, funciones auxiliares, identidad, catálogo, inventario/lotes, promociones, pedidos, pagos, fidelización, marketing/contenido, facturación/auditoría, triggers de negocio.
- `apply-fase1-manual.sql` — las 14 migraciones concatenadas en una sola transacción (`begin`/`commit`), para pegar y correr de una sola vez en **Supabase → SQL Editor**. Si algo falla, no se aplica nada parcial.
- 36 tablas, RLS habilitado en todas (deny-by-default), políticas alineadas a los roles de la sección 09 del blueprint.
- `seed.sql` (pendiente, Fase 1) cargará la sucursal inicial (`stores`) — sus coordenadas reales las define el cliente — y, opcionalmente, el catálogo legado en `docs/legacy-reference/catalog/` como caso de prueba de la carga masiva (sección 13).

## Cómo aplicar

1. Abrir el proyecto en supabase.com → **SQL Editor** → **New query**.
2. Pegar el contenido completo de `apply-fase1-manual.sql`.
3. Ejecutar. Debería crear 36 tablas y ~76 políticas RLS sin errores.
4. Verificar en **Table Editor** que las tablas aparecen, y que una consulta anónima a cualquier tabla protegida (ej. `orders`) devuelve 0 filas — confirma que RLS está bloqueando por defecto (criterio de aceptación de la Fase 1, BLUEPRINT.md).
