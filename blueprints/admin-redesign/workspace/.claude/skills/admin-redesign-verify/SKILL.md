---
name: admin-redesign-verify
description: Corre la rutina de verificación de un paso del blueprint admin-redesign (lint + tipos + build, y recuerda el protocolo de migraciones contra una rama de desarrollo antes de producción).
---

# Verificar paso de admin-redesign

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`

Si el paso tocó `supabase/migrations/`, antes de los 3 comandos de arriba:
4. Confirmar que la migración se aplicó primero contra una rama/branch de
   desarrollo de Supabase, nunca directo a producción.
5. Si la migración agrega una tabla con RLS, probar con al menos 2 cuentas
   de rol distinto que las políticas aíslan correctamente los datos.

Si cualquiera de los 3 comandos falla, no continuar al siguiente paso de
`tasks.json` — corregir primero. No usar `--no-verify` ni saltar el build.
