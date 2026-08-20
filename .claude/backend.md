# ⚙️ Reglas de Backend (Supabase + Server Actions)

## 🏗️ Arquitectura de Datos
- **Sin ORM:** Utilizar SIEMPRE el cliente nativo de Supabase (`supabase.from(...)`). Prohibido el uso o importación de Prisma, Drizzle u otros.
- **Seguridad:** Los datos sensibles viven en el esquema privado. Para relaciones anidadas, usar sintaxis nativa: `select('*, tabla_relacionada(*)')`.

## 🔒 Estándar para Server Actions (Domain-Driven)
Las acciones deben agruparse por dominio en archivos dedicados (ej. `orders/actions.ts`, `checkout/actions.ts`). Toda acción debe cumplir esto:
1. **Directiva:** Iniciar con `'use server';` en la parte superior del archivo.
2. **Validación de Rol:** La *primera línea ejecutable* del cuerpo de la función DEBE ser `requireRole(['rol_permitido'])`.
3. **Nomenclatura por Transición de Estado:** Usar `verbo + entidad` en camelCase, describiendo la transición de negocio exacta (ej. `startPreparation`, `assignDriver`, `markOrderReady`). **Totalmente prohibido** usar operaciones CRUD genéricas (ej. `updateOrder`).
4. **Retorno Estricto:** Devolver siempre un tipo de estado propio del dominio (ej. `OrderActionState`) con la estructura explícita `{ error }` o `{ success }`.
5. **Resiliencia:** Envolver lógica en `try/catch` para Sentry y aplicar Upstash para rate limiting en operaciones sensibles.

## 🗄️ Flujo de Migraciones
- **Regla Cero:** NUNCA modificar migraciones existentes en producción.
- Todo cambio de esquema se propone primero en SQL, se prueba localmente y se genera vía `supabase migration new`.
