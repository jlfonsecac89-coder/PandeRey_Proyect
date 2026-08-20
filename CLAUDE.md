# 🤖 Proyecto: Pan De Rey V2 (SaaS)
**Contexto:** SaaS de panadería online con 3 portales: E-commerce, CMS Admin (CRM, Stock) y Portal de Delivery.

## 🛠️ Stack Tecnológico
- **Core:** Next.js 16.3.0 (App Router), React 19.2.8, TypeScript 5.
- **Backend/Auth:** Supabase Postgres, @supabase/ssr (RBAC: customer, admin, marketing, operaciones, repartidor).
- **Estilos:** Tailwind CSS v4 (dark-first, acento dorado `#D4AF37` en `src/app/globals.css`). *Nota: Es v4, no busques `tailwind.config.js`*.
- **Ecosistema:** Mercado Pago SDK, Resend, Upstash (Rate limiting), Sentry, Recharts. Deploy en Vercel.

## ⚠️ Reglas de Oro Innegociables
1. **Seguridad RBAC + RLS:** TODA Server Action debe validar el rol como primera línea usando `requireRole()`. Nunca confíes solo en el RLS de Supabase. El RLS es la 2da capa.
2. **Migraciones Seguras:** NUNCA modificar migraciones de producción. Todo cambio de esquema se hace primero contra una rama de desarrollo de Supabase, es no destructivo, se prueba y luego se promueve.
3. **Comentarios de Valor:** Comenta SOLO decisiones no obvias, reglas de negocio o workarounds. Cero comentarios explicando qué hace el código obvio.
4. **Resiliencia:** Operaciones críticas (pagos, creación de usuarios) deben capturar errores hacia Sentry y manejar rate limits con Upstash.

## 🗺️ Enrutamiento de Contexto (¡Lee antes de codificar!)
No asumas la estructura. Usa `cat` o `read_file` en estos archivos para obtener las reglas específicas antes de proponer cambios:
- **Flujos del Agente y Tareas Pendientes:** Lee `.claude/AGENT.md`
- **Esquema de BD y Reglas Supabase:** Lee `.claude/backend.md`
- **Reglas UI, Tailwind v4 y Portales:** Lee `.claude/frontend.md`

## 📂 Mapa Rápido de Portales
*(Claude: Verifica en qué portal estás trabajando antes de modificar archivos)*
- `/src/app/(shop)` -> Tienda pública y Checkout.
- `/src/app/(admin)` -> CMS y Dashboard.
- `/src/app/(delivery)` -> Portal de repartidores.