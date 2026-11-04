# 🚀 Despliegue a producción — lista de verificación

Preparado el 4-nov-2026. **Nada de esto se ejecuta sin aprobación explícita del usuario**: un `git push` a `master` despliega automáticamente en Vercel.

## 1. Qué se publica
- 22 commits sobre `origin/master` (`0d5b832`): alcance de lanzamiento (módulos, solo retiro, disponibilidad), N° `PDR-000123`, boleta manual al retiro, campañas con retiro por día, retiros y reportes, cancelación y reembolso, dashboard, colecciones, tuteo, remitente de correo configurable.
- `npm run build` compila sin errores; `tsc` limpio; `eslint` solo con los 6 errores preexistentes (`VariantesSection.tsx`, `DashboardCharts.tsx`).
- Sin secretos en archivos versionados; `.env.local` está ignorado.

## 2. Base de datos
Local y producción usan **la misma Supabase** (`cxhjthmgkzqpldkkdqkv`): no hay paso de BD en el despliegue. Migraciones ya aplicadas y verificadas:
`20260814000100_system_settings`, `20261005000100_products_is_available`, `20261005000200_order_number`, `20261005000300_order_receipt`, `20261005000400_campaigns`, `20261103000100_order_cancellation`. Todas aditivas: el código anterior sigue funcionando si hay que volver atrás.

## 3. Variables de entorno en Vercel (Production)
Revisar en Vercel → Settings → Environment Variables **antes** del push:

| Variable | Qué verificar |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública con https (Mercado Pago y auth la usan para volver a la tienda y para el webhook) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Del proyecto `cxhj…` |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Credenciales de producción de la cuenta real; el webhook configurado en Mercado Pago apuntando a `<sitio>/api/webhooks/mercadopago` |
| `RESEND_API_KEY` y **`RESEND_FROM_ADDRESS`** (nueva) | Dominio verificado en Resend y remitente de ese dominio; sin esto los correos solo llegan al dueño de la cuenta |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | La base `cool-starling-157049` **ya no existe**: crear una nueva. Sin esto no hay límite de intentos (el login y el pago siguen funcionando) |
| `CRON_SECRET` | Definido: los crons de Vercel lo envían como `Authorization: Bearer` |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Para ver errores de reembolsos y pagos |
| `FIELD_ENCRYPTION_KEY`, `ORS_API_KEY` | Los usa el código (RUT cifrado; geocodificación) |

Crons (`vercel.json`): `order-sla` diario 09:00 UTC y `rfm-recompute` lunes 03:00 UTC. En plan Hobby no pueden ser más frecuentes.

## 4. Orden recomendado
1. Actualizar variables en Vercel (sección 3).
2. Decidir qué hacer con los datos de prueba (sección 6).
3. `git push origin master` → Vercel construye y despliega solo.
4. Prueba de humo (sección 5) sobre la URL de producción.

## 5. Prueba de humo tras el despliegue
- `/tienda` carga, con chips de colecciones si hay alguna vigente.
- `/tienda/pan-de-jamon-pan-amb-00005` muestra la variante obligatoria.
- `/terminos` muestra la versión `2026-11-03-v3` y la sección 7 con los plazos.
- Login de admin; `/admin` carga el dashboard; `/admin/configuracion/sistema` guarda un ajuste.
- Compra de prueba con Mercado Pago; el pedido recibe N° `PDR-…`.
- Correo de orden de compra llega a un correo que **no** sea el del dueño de Resend.
- Un pago real pequeño: reembolsarlo desde Mercado Pago y registrarlo; si se quiere validar el reembolso automático, hacerlo con ese pago.

## 6. Datos de prueba — LIMPIADOS el 4-nov-2026 (queda reiniciar la secuencia)
Se borraron los 21 pedidos de prueba y sus dependientes, el cupón `PRUEBA10`, la campaña y la colección de prueba y los snapshots RFM. Queda en el SQL Editor: `select setval('order_number_seq', 1, false);` para que el primer pedido real sea `PDR-000001`. Las cuentas (19 clientes y 5 admin) no se tocaron: revisar si hay cuentas de prueba que dar de baja.

## 7. Marcha atrás
- Vercel → Deployments → el despliegue anterior → **Promote to Production** (inmediato, sin tocar la base).
- Las migraciones son aditivas: no hace falta revertirlas.
- Cualquier campaña se apaga desde `/admin/campanas` sin desplegar; los módulos, desde Ajustes del sistema.

## 8. Pendientes de negocio antes del 20-nov (apertura de la campaña)
Dominio de Resend, Redis nuevo, fotos del Pan de Jamón, revisión legal de los Términos (sección 6, retracto), validar el reembolso automático con credenciales correctas, definir recargo del queso crema.

## 9. Seguridad (auditoría del 4-nov-2026)
- **Next.js 16.3.0 → 16.4.5** (y `eslint-config-next`): 16.3.0 tenía vulnerabilidades críticas de ejecución remota de código (optimización de imágenes, `use cache`, `next/og`) y de denegación de servicio en Server Actions. `npm audit --omit=dev`: de 21 (3 críticas, 9 altas) a 5 moderadas del plugin de build de Sentry (herramienta de compilación, subida de mapas desactivada).
- La app **no** usa `next/image`, `use cache` ni `next/og`; el optimizador `/_next/image` quedó **apagado** (`images.unoptimized`).
- Cabeceras añadidas en `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` solo con `frame-ancestors/base-uri/object-src`; sin `X-Powered-By`. Pendiente (opcional): CSP con `script-src` y nonces.
- Sin secretos en el JS del navegador (build local y sitio publicado, 8 claves verificadas por valor). Supabase: 42 tablas con RLS, 7 funciones críticas bloqueadas para `anon`. Webhook de Mercado Pago con HMAC y `timingSafeEqual`; rutas `/admin`, `/cuenta`, `/repartidor` redirigen sin sesión; crons con `CRON_SECRET`.
- **HISTORIAL DE GIT PÚBLICO CON CREDENCIALES (acción del usuario)**: el repo `jlfonsecac89-coder/PandeRey_Proyect` es público y su historial contiene (a) 2 access tokens de Mercado Pago de cuentas de prueba, uno es el `MP_ACCESS_TOKEN` actual, ambos vigentes; (b) cadenas de conexión directa a Postgres con contraseña del proyecto `cxhjthmgkzqpldkkdqkv` (producción) y de otro proyecto antiguo. Archivos ya no existen en HEAD (`pan-de-rey-frontend/`, `pan-de-rey-backend/`). Rotar contraseña de la base, regenerar credenciales de prueba de Mercado Pago, y valorar volver privado el repo. Nunca versionar claves reales.
- PHP ("php2shell", parche del 21-oct-2026): el proyecto no contiene PHP ni lo usa en Vercel/Supabase; no aplica.
