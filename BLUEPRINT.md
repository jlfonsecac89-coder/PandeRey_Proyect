# BLUEPRINT.md — Pan de Rey: Plataforma E-commerce/SaaS de Panadería

> Documento autocontenido. Una instancia de Claude Code (u otro desarrollador) debe poder construir el proyecto completo a partir de este archivo, sin preguntas adicionales sobre alcance o seguridad. Toda decisión de arquitectura y seguridad fue tomada ANTES de escribir código.

## Índice

01. Resumen Ejecutivo
02. Alcance y Fases
03. Stack Tecnológico y Justificación
04. Arquitectura General
05. Modelo de Datos
06. Estructura de Carpetas del Proyecto
07. Checkout, Envío (Delivery) e Integración con Mercado Pago
08. Autenticación y Registro
09. Roles y Permisos (RBAC)
10. Protección de Endpoints y Rutas de API
11. Manejo de Datos Sensibles
12. Facturación Electrónica (SII / Chile)
13. Productos, Categorías, Cuenta del Cliente y Landing
14. Gestión de Ofertas, Promociones y Programa de Puntos
15. Notificaciones y Auditoría
16. Restricciones, Reglas y Rate Limiting
17. Fases de Construcción (Build Plan)
18. Variables de Entorno y Secretos
19. Checklist de Seguridad Pre-Lanzamiento
20. Supuestos y Puntos Abiertos

---

## 01. Resumen Ejecutivo

Pan de Rey es una plataforma e-commerce para una panadería artesanal (negocio único, no multi-tenant) que va más allá de un e-commerce convencional: incluye gestión de ofertas/promociones, árbol de categorías y secciones, pagos con Mercado Pago (Checkout Pro, tarjetas guardadas), facturación electrónica ante el SII (Chile), un panel administrativo con roles diferenciados (Admin, Marketing, Operaciones, Repartidor) y trazabilidad de acciones sensibles vía auditoría.

Referencia visual/funcional ya desplegada (no funcional, solo UI de referencia):
- Web: `https://pande-rey-proyect-tzgz.vercel.app/`
- Admin: `https://pande-rey-proyect-tzgz.vercel.app/admin`

Categorías observadas en la referencia: Panadería, Para Compartir, Descuentos, Pastelería, Sin Gluten, Cafetería. El nuevo proyecto debe extraer logo y colores institucionales de ese sitio (ver sección 20).

## 02. Alcance y Fases

**Dentro de alcance (v1):**
- Storefront público: catálogo, categorías/secciones en árbol, carrito, checkout, seguimiento de pedido, cuenta de cliente.
- Checkout con Mercado Pago Checkout Pro + tarjetas guardadas (tokenización), y transferencia bancaria validada manualmente vía WhatsApp (sección 07) como método alternativo.
- Panel admin con 4 roles: Admin, Marketing, Operaciones, Repartidor.
- Gestión de ofertas/promociones y cupones (incluye Análisis de Ofertas y Performance de Clientes/RFM).
- Facturación electrónica SII (Chile) desde el lanzamiento.
- Notificaciones transaccionales por email.
- Auditoría de acciones sensibles.
- Cumplimiento legal: consentimiento de cookies, desuscripción de email/cuenta, y política de retracto declarada en T&C (sección 11).
- Observabilidad (Sentry) y entornos separados de staging/producción (sección 03).

**Modelo multi-sucursal:** el sistema se construye desde la Fase 0 para soportar múltiples sucursales físicas (`stores`, cada una con su propio radio de entrega, tramos de envío, horario de reparto y stock independiente vía `store_products`), pero v1 **lanza con una sola sucursal activa** — agregar la siguiente es solo cargar datos, sin cambios de código (sección 20).

**Fuera de alcance (v1, futuro):**
- Multi-tenancy (múltiples **negocios/marcas** distintos sobre la misma plataforma — no confundir con multi-sucursal de un mismo negocio, que sí está en alcance).
- **Venta por mayor (B2B):** se resuelve en una solución separada, con su propio catálogo acotado, validación de nivel de endeudamiento y aprobación manual de cuentas — no se integra con este e-commerce ni comparte base de datos (sección 20).
- Blog/contenido editorial.
- 2FA para staff (se deja el modelo de datos preparado para agregarlo sin romper esquema).
- WhatsApp como canal general de notificaciones de pedido (SMS también fuera) — WhatsApp en v1 se usa **exclusivamente** para iniciar/validar transferencias bancarias (sección 07), no para avisos de estado.
- App móvil nativa para repartidor (se cubre con una vista web responsive `/repartidor`).
- Mapa en vivo con la ubicación GPS del repartidor en el seguimiento (solo estado textual en v1).

## 03. Stack Tecnológico y Justificación

| Capa | Elección | Justificación |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Consistente con el proyecto de referencia ya desplegado en Vercel. Server Components + Server Actions reducen superficie de API expuesta al cliente. |
| Hosting | Vercel | Ya usado por el proyecto de referencia. Despliegue directo desde Git, Edge Middleware para protección de rutas. |
| Base de datos | Supabase (Postgres) | Elegido por el usuario. Postgres con Row Level Security (RLS) nativo — clave para el aislamiento de datos entre roles (sección 09-10). |
| Autenticación | Supabase Auth | Integrado con la base de datos elegida. Soporta email+password, verificación de email, OAuth (Google) y tiene soporte nativo de MFA (para cuando se active 2FA en el futuro sin cambiar de proveedor). |
| Almacenamiento de imágenes | Supabase Storage | Integrado, con políticas de acceso (RLS-like) para las fotos de producto. |
| Pagos | Mercado Pago SDK oficial (Node) — Checkout Pro + Customers/Cards API | Definido por el usuario. Chile (`MPC`, CLP). |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` en Edge Middleware | Serverless, compatible con Vercel Edge, sin infraestructura propia que mantener. |
| Email transaccional | Resend | Integración simple con Next.js, buena entregabilidad, soporte de plantillas React (`react-email`). |
| Geocodificación y rutas | OpenRouteService (Geocoding + Directions, sobre datos OpenStreetMap) | Convierte la dirección del cliente en coordenadas y calcula la **distancia real de ruta** (no línea recta) hasta la panadería, para validar el radio máximo de entrega y tarifar el envío por tramos de kilometraje. Elegido sobre Google Maps Platform por tener un tier gratuito sin tarjeta de crédito (2000 requests/día, 40/min) suficiente para el volumen esperado; el módulo `lib/geo/` queda aislado detrás de una interfaz propia para poder migrar a Google Maps u otro proveedor sin tocar el resto del código si el volumen lo justifica más adelante. |
| Facturación electrónica SII | Proveedor DTE de terceros (ver sección 12 y 20 — pendiente de elegir) | Implementar el protocolo SOAP del SII desde cero excede el alcance razonable de este blueprint; se integra vía API de un proveedor homologado. |
| Estilos | Tailwind CSS | Estándar para velocidad de desarrollo en Next.js; se configura con los colores institucionales extraídos del sitio de referencia. |
| Pago alternativo | WhatsApp Business API (Cloud API de Meta) | Único uso de WhatsApp en v1: iniciar y validar manualmente pagos por transferencia bancaria (sección 07) — no reemplaza el email como canal de notificaciones. |
| Observabilidad | Sentry (errores) + Vercel Analytics/Logs (uptime de rutas y crons) | Con pagos, webhooks (MP + WhatsApp) y crons en producción, detectar fallos rápido es crítico — no existía nada de esto antes de esta ronda. |
| Entornos | Dos proyectos Supabase separados: `staging` y `production` | Permite probar migraciones, RLS y flujos de pago antes de tocar datos reales; Vercel usa Preview Deployments apuntando a `staging`. |

## 04. Arquitectura General

```
┌─────────────────────┐        ┌──────────────────────┐
│  Cliente (browser)   │◄──────►│  Next.js (Vercel)     │
│  Storefront + Cuenta │        │  App Router           │
└─────────────────────┘        │  - Server Components  │
                                │  - Server Actions     │
┌─────────────────────┐        │  - Route Handlers     │
│  Staff (browser)     │◄──────►│    /api/**            │
│  /admin, /repartidor │        │  - Edge Middleware    │
└─────────────────────┘        │    (auth + rate limit)│
                                └──────────┬────────────┘
                                           │
                    ┌──────────────────────┼───────────────────────┐
                    ▼                      ▼                       ▼
          ┌───────────────┐      ┌─────────────────┐     ┌──────────────────┐
          │ Supabase       │      │ Mercado Pago     │     │ Resend (email)    │
          │ - Postgres+RLS │      │ Checkout Pro     │     │ Proveedor DTE (SII)│
          │ - Auth         │      │ Webhooks         │     │                    │
          │ - Storage      │      └─────────────────┘     └──────────────────┘
          └───────────────┘
                    ▲
                    │
          ┌───────────────┐
          │ Upstash Redis  │  (rate limiting, sección 16)
          └───────────────┘
```

**Principio de defensa en profundidad (aplica a todo el documento):** cada operación sensible se valida en al menos dos capas independientes: (1) Middleware/Server Action verifica sesión y rol, (2) Row Level Security en Postgres deniega por defecto. Nunca se confía solo en el rol embebido en el JWT del cliente para decidir acceso a datos — siempre se reconsulta contra la tabla `profiles` o se delega en RLS.

## 05. Modelo de Datos

Todas las tablas usan `id uuid primary key default gen_random_uuid()` salvo que se indique lo contrario. Todos los timestamps son `timestamptz default now()`.

```sql
-- Extiende auth.users de Supabase
profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  rut_encrypted bytea,               -- cifrado a nivel de aplicación, ver sección 11
  role text not null check (role in ('customer','admin','marketing','operaciones','repartidor')) default 'customer',
  is_active boolean not null default true,
  must_change_password boolean not null default false,  -- true al crear cuentas de staff
  points_balance int not null default 0,   -- cache denormalizado; fuente de verdad es points_ledger (ver más abajo)
  store_id uuid references stores(id),     -- solo aplica a operaciones/repartidor (scoped a UNA sucursal); null para customer/admin/marketing
  anonymized_at timestamptz,   -- baja de cuenta: PII limpiada, pero la fila se conserva por retención legal (sección 11)
  created_at timestamptz default now()
)

cookie_consents (           -- Consentimiento de cookies (Ley 19.628), sección 11
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,   -- null = visitante sin cuenta (se guarda por cookie local)
  necessary boolean not null default true,   -- siempre true, no se puede rechazar (cookies estrictamente necesarias)
  analytics boolean not null default false,
  marketing boolean not null default false,
  consented_at timestamptz not null default now()
)

addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text,
  calle text not null,
  numero text not null,
  comuna text not null,
  ciudad text not null,
  region text not null,
  codigo_postal text,
  lat numeric(9,6),                 -- geocodificado vía OpenRouteService al guardar la dirección
  lng numeric(9,6),
  geocoded_at timestamptz,
  is_default boolean default false,
  created_at timestamptz default now()
)

-- requiere la extensión unaccent de Postgres para la deduplicación por nombre (sección 13)
-- create extension if not exists unaccent;

departments (              -- Nivel 1: líneas de producción reales (Panadería, Pastelería, Cafetería)
  id uuid primary key default gen_random_uuid(),
  code text not null unique,     -- ej. "PAN", usado para generar SKU automático
  name text not null,
  name_normalized text generated always as (lower(unaccent(name))) stored,  -- dedup, ver sección 13
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (name_normalized)
)

categories (               -- Nivel 2 (y sub-niveles): jerárquico DENTRO de un departamento
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  parent_id uuid references categories(id) on delete set null,  -- permite sub-categorías dentro del departamento
  code text not null,            -- ej. "AMB" (Pan Amasado), usado para generar SKU automático
  name text not null,
  name_normalized text generated always as (lower(unaccent(name))) stored,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (department_id, name_normalized)
)

collections (              -- Vitrinas de marketing transversales (Sin Gluten, Para Compartir, Nuevo...)
  id uuid primary key default gen_random_uuid(),  -- "Descuentos" NO vive aquí: se computa desde promotions activas
  name text not null,
  name_normalized text generated always as (lower(unaccent(name))) stored,  -- unique, dedup sección 13
  slug text not null unique,
  starts_at timestamptz,    -- null = colección permanente; si se define, se activa/desactiva sola por fecha
  ends_at timestamptz,      -- usado para colecciones de evento (Navidad, Día de la Madre, Fiestas Patrias)
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  unique (name_normalized)
)

product_collections (      -- Muchos-a-muchos: un producto puede estar en varias colecciones a la vez
  product_id uuid not null references products(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (product_id, collection_id)
)

products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  name_normalized text generated always as (lower(unaccent(name))) stored,  -- dedup dentro de la categoría
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'CLP',
  sku text not null unique,             -- SIEMPRE generado por el servidor (nunca lo escribe el staff), sección 13
  -- el stock YA NO vive acá: es independiente por sucursal y por lote, ver `store_products`/`product_batches`
  is_gluten_free boolean default false,
  is_active boolean not null default true,
  points_cost int,                      -- si no es null, el producto es canjeable por puntos (gestionado por Marketing)
  is_special_event boolean not null default false,   -- true = producto de edición limitada atado a un evento
  event_collection_id uuid references collections(id),  -- la colección de evento (ej. "Navidad") que lo activa
  max_orders int,                        -- cupo duro de unidades vendibles durante el evento (null = sin tope especial)
  special_orders_count int not null default 0,  -- contador atómico, análogo a promotions.usage_count
  requires_production_notes boolean not null default false,  -- exige capturar notas del cliente para producción
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (category_id, name_normalized)
)

product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,   -- referencia a Supabase Storage
  alt_text text,
  sort_order int not null default 0
)

product_option_groups (    -- Variantes de producto: "Relleno", "Cobertura", "Tamaño", "Preparación"...
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  selection_type text not null check (selection_type in ('single','multiple')) default 'single',
  is_required boolean not null default true,
  sort_order int not null default 0
)

product_option_values (    -- ej. "Manjar", "Chocolate", "20 personas" (con recargo de precio propio)
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references product_option_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
)

promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,                       -- null si es promo automática, no cupón
  name text not null,
  type text not null check (type in ('percentage','fixed_amount')),
  value numeric(12,2) not null,
  max_discount_amount numeric(12,2),      -- tope de descuento para type='percentage' (ej. 20% con tope $5.000)
  department_id uuid references departments(id),  -- aplica a todo el departamento (null = no aplica a nivel departamento)
  category_id uuid references categories(id),      -- aplica a una categoría específica (null = no aplica a nivel categoría)
  product_id uuid references products(id),          -- aplica a un producto específico (null = no aplica a nivel producto)
  min_order_amount numeric(12,2) default 0,         -- null/0 = sin mínimo de compra
  single_use_per_customer boolean not null default false,  -- configurable por Marketing, no una regla fija global
  max_uses int,
  usage_count int not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_by uuid references profiles(id)
)

coupon_redemptions (        -- Un registro por cada uso de cupón, habilita el análisis de ofertas y el uso único
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions(id) on delete cascade,
  user_id uuid not null references profiles(id),
  order_id uuid not null references orders(id),
  redeemed_at timestamptz default now()
  -- SIN unique(promotion_id, user_id): la restricción de "uso único" se valida en el Server Action
  -- solo cuando promotions.single_use_per_customer = true; los cupones reutilizables sí generan múltiples filas.
)

stores (                   -- Sucursales físicas. v1 lanza con UNA fila activa; agregar otra sucursal después
  id uuid primary key default gen_random_uuid(),   -- es solo insertar una fila, sin cambios de código.
  name text not null,
  origin_lat numeric(9,6) not null,
  origin_lng numeric(9,6) not null,
  max_delivery_radius_km numeric(5,2) not null default 8,
  min_order_amount numeric(12,2),             -- monto mínimo de carrito para poder pagar (null = sin mínimo)
  free_shipping_min_amount numeric(12,2),     -- sobre este monto el envío es gratis (null = nunca gratis)
  contact_address text,
  contact_email text,
  contact_phone text,
  business_hours jsonb,        -- horario de atención al público, ej. [{"dia":"lun-vie","apertura":"09:00","cierre":"20:00"}]
  delivery_schedule jsonb,     -- días/horario de reparto, configurado libremente por Admin (puede diferir de business_hours)
  social_links jsonb,          -- ej. {"instagram":"...", "facebook":"...", "whatsapp":"..."}
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id)
)

store_products (           -- Stock independiente por sucursal (el catálogo/precio/ficha del producto es global)
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  stock_quantity int not null default 0 check (stock_quantity >= 0),  -- CACHE: suma de product_batches.quantity activos
  is_available_here boolean not null default true,   -- permite ocultar un producto en una sucursal puntual
  primary key (store_id, product_id)
)

product_batches (          -- Lotes de stock con trazabilidad de vencimiento (FIFO), fuente de verdad del stock real
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null check (quantity >= 0),        -- se descuenta a medida que se vende/consume este lote
  expiration_date date,             -- null = producto no perecible
  received_at timestamptz not null default now(),
  is_clearance boolean not null default false,        -- activado manualmente por Operaciones/Admin
  clearance_discount_percent numeric(5,2),
  created_by uuid references profiles(id)
)

instagram_integration (    -- credencial de la integración automática con Instagram (fila única)
  id int primary key default 1 check (id = 1),
  access_token_encrypted bytea not null,    -- cifrado igual que el RUT, ver sección 11
  token_expires_at timestamptz not null,
  business_account_id text not null,
  last_synced_at timestamptz,
  updated_by uuid references profiles(id)
)

banners (                  -- carrusel/banners de la landing, gestionado por Marketing
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_storage_path text not null,
  link_url text,
  sort_order int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
)

newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent_at timestamptz not null,          -- momento del opt-in explícito
  is_active boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz default now()
)

terms_acceptances (        -- versión exacta de T&C que aceptó cada cliente, para trazabilidad legal
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz default now(),
  ip_address text
)

shipping_zones (           -- tramos de costo de envío por distancia real de ruta, editable por Admin, POR sucursal
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  min_km numeric(5,2) not null,
  max_km numeric(5,2) not null,
  price numeric(12,2) not null,
  is_active boolean not null default true,
  sort_order int not null default 0
)

orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  status text not null check (status in (
    'pending_payment','paid','preparing','ready',
    'ready_for_pickup',
    'driver_assigned','in_route','at_address','delivery_issue','returning_to_store','returned_to_store',
    'delivered','cancelled'
  )) default 'pending_payment',
  delivery_method text not null check (delivery_method in ('pickup','shipping')),
  payment_method text not null check (payment_method in ('mercadopago','bank_transfer')) default 'mercadopago',
  store_id uuid not null references stores(id),   -- sucursal elegida por el cliente (retiro o despacho)
  address_id uuid references addresses(id),
  scheduled_at timestamptz,                   -- hora que el cliente fija para retiro/entrega (null = lo antes posible)
  sla_deadline timestamptz,                   -- scheduled_at si se fijó, si no paid_at + ORDER_PREP_SLA_MINUTES
  ready_at timestamptz,                       -- cuándo pasó a 'ready' (para medir cumplimiento del SLA)
  assigned_driver_id uuid references profiles(id),  -- rol repartidor
  delivery_distance_km numeric(6,2),          -- snapshot de la distancia real (Directions API) al momento del pedido
  delivery_confirmation_code text,            -- código corto (4-6 dígitos) que el cliente entrega al repartidor
  delivery_code_attempts int not null default 0,
  delivery_code_locked boolean not null default false,  -- true tras 5 intentos fallidos; requiere Operaciones
  delivery_issue_reason text,                 -- 'cliente_ausente', 'direccion_no_ubicable', etc.
  delivery_issue_at timestamptz,               -- inicio del conteo de 10 min antes de poder marcar "regresando a tienda"
  delivered_at timestamptz,
  subtotal numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  currency text not null default 'CLP',
  promotion_id uuid references promotions(id),
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

order_status_history (     -- trazabilidad de cambios de estado (distinto de audit_log, que es solo acciones sensibles)
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  changed_by uuid references profiles(id),   -- null si fue automático (ej. webhook de MP)
  note text,
  created_at timestamptz default now()
)

order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name_snapshot text not null,   -- histórico, no depende de products
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  fulfillment_status text not null check (fulfillment_status in ('as_ordered','substituted','removed')) default 'as_ordered',
  substituted_product_id uuid references products(id),  -- si se sustituyó, qué producto lo reemplazó
  modification_note text,                -- razón del cambio (falta de stock, pedido del cliente, etc.)
  customization_note text                -- notas del cliente (ej. mensaje en torta, o datos para producción especial)
)

order_item_options (       -- snapshot de qué variantes eligió el cliente (relleno, cobertura, tamaño...)
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  option_group_name_snapshot text not null,
  option_value_name_snapshot text not null,
  price_delta_snapshot numeric(12,2) not null default 0
)

payment_methods (          -- tarjetas guardadas, solo tokens de MP
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mp_customer_id text not null,
  mp_card_id text not null,
  brand text,
  last_four text,
  is_default boolean default false,
  created_at timestamptz default now()
)

payments (                  -- Específica de Mercado Pago; transferencia bancaria usa `bank_transfer_payments`
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  mp_payment_id text unique not null,
  status text not null,             -- approved, rejected, pending, refunded, etc.
  amount numeric(12,2) not null,
  raw_webhook_redacted jsonb,        -- payload de MP con campos sensibles removidos, ver sección 11
  created_at timestamptz default now()
)

whatsapp_integration (      -- Credenciales de WhatsApp Business API (fila única), sección 07
  id int primary key default 1 check (id = 1),
  access_token_encrypted bytea not null,     -- cifrado igual que el RUT, ver sección 11
  phone_number_id text not null,
  bank_account_details text not null,        -- datos de la cuenta bancaria mostrados en el mensaje inicial
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
)

bank_transfer_payments (    -- Validación manual de pagos por transferencia, iniciada y confirmada vía WhatsApp
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  whatsapp_conversation_id text,              -- referencia a la conversación en el proveedor de WhatsApp
  proof_storage_path text,                    -- comprobante recibido por WhatsApp, guardado en Supabase Storage
  proof_received_at timestamptz,
  status text not null check (status in ('awaiting_proof','proof_submitted','approved','rejected')) default 'awaiting_proof',
  reviewed_by uuid references profiles(id),   -- operaciones/admin que aprobó o rechazó
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
)

invoices_dte (              -- Facturación electrónica SII
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  document_type text not null check (document_type in ('boleta','factura')),
  rut_cliente_encrypted bytea,
  folio text,
  provider_reference text,          -- id en el proveedor DTE externo
  status text not null default 'pending',  -- pending, issued, rejected
  pdf_url text,
  created_at timestamptz default now()
)

audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  actor_role text not null,
  action text not null,             -- 'price_update','discount_applied','order_edited','customer_data_viewed', etc.
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,                 -- con campos sensibles redactados, ver sección 11
  after_data jsonb,
  ip_address text,
  created_at timestamptz default now()
)

notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  order_id uuid references orders(id),
  channel text not null default 'email',
  template text not null,
  status text not null,             -- sent, failed
  sent_at timestamptz default now()
)

points_ledger (              -- Programa de fidelización (canje de puntos)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  order_id uuid references orders(id),        -- null si es un ajuste manual o canje sin orden asociada
  type text not null check (type in ('earn_purchase','redeem_discount','redeem_product','manual_adjustment','expire')),
  points int not null,                         -- positivo (gana) o negativo (canjea/expira)
  description text,
  created_by uuid references profiles(id),     -- null si fue automático (ej. al pagar un pedido)
  created_at timestamptz default now()
)

customer_rfm_snapshot (    -- Segmentación RFM+LTV, recalculada periódicamente por cron (NO en tiempo real)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  computed_at timestamptz not null default now(),
  recency_days int not null,
  frequency_count int not null,          -- dentro de RFM_ANALYSIS_WINDOW_DAYS
  monetary_total numeric(12,2) not null, -- dentro de RFM_ANALYSIS_WINDOW_DAYS (comportamiento reciente)
  ltv_total numeric(12,2) not null,      -- histórico COMPLETO (todas las compras desde siempre), sin ventana
  r_score smallint not null,   -- 1-5
  f_score smallint not null,
  m_score smallint not null,
  segment text not null check (segment in ('estrella','leal','promedio','dormido','perdido')),
  suggested_action text not null check (suggested_action in ('activar','retener','premiar','impulsar_venta'))
)

product_imports (          -- Un registro por cada carga masiva de productos ejecutada
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references profiles(id),
  file_name text,
  status text not null check (status in ('processing','pending_review','completed','failed')) default 'processing',
  total_rows int,
  new_products int not null default 0,
  updated_pending int not null default 0,
  unchanged int not null default 0,
  new_variants int not null default 0,
  created_at timestamptz default now()
)

product_import_rows (      -- Detalle fila a fila, incluye las que quedan pendientes de confirmación humana
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references product_imports(id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,            -- la fila original del archivo, sin procesar
  match_type text not null check (match_type in ('new','identical','description_changed','new_variant')),
  matched_product_id uuid references products(id),   -- si hubo coincidencia por nombre normalizado
  resolution text not null check (resolution in ('pending','approved','rejected')) default 'pending',
  resolved_by uuid references profiles(id),
  resolved_at timestamptz
)
```

**Relaciones clave:**
- `categories.department_id` + `categories.parent_id` → árbol Departamento > Categoría > Sub-categoría; cada producto pertenece a una única `category_id` (organización operativa/de stock, la usa Operaciones).
- `product_collections` → muchos-a-muchos entre productos y `collections` (vitrinas transversales de Marketing como Sin Gluten o Para Compartir); un producto puede vivir en varias colecciones sin duplicarse. "Descuentos" no es una fila de `collections`, se computa consultando productos con una `promotions` activa aplicable.
- `stores` reemplaza lo que en un negocio de una sola sucursal sería una fila única de configuración: v1 lanza con **una** fila activa, pero agregar una segunda sucursal es solo insertar otra fila (más sus propios `shipping_zones`), sin tocar código.
- `store_products` desacopla el catálogo (global: nombre, precio, descripción en `products`) del stock (local: `stock_quantity` por sucursal) — la cocina/bodega de cada sucursal es independiente. `stock_quantity` es un **cache**: la fuente de verdad real es la suma de `product_batches.quantity` activos para ese producto+sucursal (sección 13).
- `profiles.store_id` limita a qué sucursal pertenece un `operaciones`/`repartidor` (solo ven pedidos/stock de esa sucursal); `admin` y `marketing` no tienen `store_id` porque ven todas las sucursales por igual.
- `orders.store_id` es la sucursal que el cliente eligió explícitamente (para retiro o despacho) — el radio de entrega, los `shipping_zones`, el `min_order_amount` y el `free_shipping_min_amount` se validan contra **esa** sucursal específica, no contra un origen global.
- `addresses.lat/lng` se completan al geocodificar la dirección (OpenRouteService); para cada sucursal candidata se calcula la distancia real (Directions) contra `stores.origin_lat/lng` y se compara contra `stores.max_delivery_radius_km` para saber si esa sucursal puede despachar ahí, y contra sus `shipping_zones` para tarifar el costo.
- `orders.delivery_distance_km` guarda la distancia calculada al momento del pedido (no se recalcula después, aunque cambie el radio máximo más adelante).
- `orders.assigned_driver_id` → un pedido con `delivery_method = 'shipping'` puede asignarse a un `profile` con `role = 'repartidor'` **cuyo `store_id` coincida con `orders.store_id`** — un repartidor de una sucursal no puede recibir pedidos de otra.
- `orders.delivery_confirmation_code` + `delivery_code_attempts` → el repartidor lo valida contra el código que le da el cliente; a los 5 intentos fallidos `delivery_code_locked = true` y requiere intervención de Operaciones/Admin.
- `order_status_history` registra cada cambio de estado (incluida la entrega confirmada) para trazabilidad y resolución de disputas — separado de `audit_log`, que es solo para acciones administrativas sensibles (precios, descuentos, datos de cliente).
- `order_items.product_name_snapshot` evita que un pedido histórico cambie si el producto se renombra o elimina después.
- `points_ledger.user_id` acumula/descuenta contra `profiles.points_balance` (mantenido por trigger); la suma de `points_ledger.points` para un usuario siempre debe coincidir con `points_balance` — el ledger es la fuente de verdad, `points_balance` es solo cache de lectura.
- `products.points_cost` marca qué productos son canjeables por puntos en el catálogo de canje gestionado por Marketing.
- `product_option_groups` + `product_option_values` → variantes elegibles de un producto (relleno, cobertura, tamaño); `order_item_options` guarda el snapshot de qué eligió el cliente en cada `order_item`, igual que `product_name_snapshot` protege el histórico.
- `products.is_special_event` + `event_collection_id` + `max_orders`/`special_orders_count` → productos de edición limitada atados a una `collections` de evento (Navidad, Día de la Madre); el cupo se valida server-side igual que `promotions.max_uses`/`usage_count`. El resto del catálogo sigue siendo stock disponible normal (no hay "bajo pedido" general).
- `orders.scheduled_at`/`sla_deadline`/`ready_at` → soportan el cálculo de "% de pedidos a tiempo": si no hay `scheduled_at`, el SLA es `paid_at + ORDER_PREP_SLA_MINUTES` (constante global, sección 18); si hay `scheduled_at`, el SLA es esa hora.
- `orders.delivery_issue_reason`/`delivery_issue_at` → soportan el flujo de "cliente ausente" y el conteo de 10 minutos antes de poder marcar `returning_to_store` (sección 07).
- `order_items.fulfillment_status`/`substituted_product_id`/`modification_note` → soportan los indicadores de "pedidos con cambios de productos" y "pedidos incompletos" (sección 09), cubriendo tanto sustituciones por falta de stock como cambios pedidos por el cliente después de comprar.
- `instagram_integration` guarda el token de la integración automática con Instagram (sección 13), cifrado igual que el RUT — nunca se expone al cliente.
- `banners` alimenta el carrusel de la landing (gestionado por Marketing); `newsletter_subscribers` guarda el opt-in explícito para comunicaciones; `terms_acceptances` guarda qué versión de los T&C aceptó cada cliente y cuándo, para trazabilidad legal.
- `product_batches` es la fuente de verdad del stock real: cada lote tiene su propia `expiration_date`, y el consumo (al vender) sigue **FIFO** (se descuenta primero del lote con vencimiento más próximo) — esto es lo que le permite al equipo saber exactamente qué lote poner en liquidación sin arriesgarse a marcar más cantidad de la que realmente está por vencer.
- `products.name_normalized` / `categories.name_normalized` / `departments.name_normalized` / `collections.name_normalized` (columnas generadas con `unaccent()` + `lower()`, sección 13) tienen restricciones `unique` que impiden crear el mismo nombre dos veces con mayúsculas, tildes o espacios distintos.
- `products.sku` siempre se genera server-side combinando `departments.code` + `categories.code` + un correlativo — nunca lo escribe el staff, ni en alta individual ni en carga masiva.
- `product_imports`/`product_import_rows` registran cada carga masiva: cada fila queda clasificada (`new`, `identical`, `description_changed`, `new_variant`) y las que requieren confirmación humana (`description_changed`) quedan en `resolution = 'pending'` hasta que el staff las aprueba o rechaza.
- `promotions.product_id` (además de `department_id`/`category_id`) permite cupones a nivel de un solo producto; `coupon_redemptions` registra cada canje y es lo que permite tanto el análisis de uso (sección 14) como bloquear el reuso cuando `single_use_per_customer = true`.
- `customer_rfm_snapshot` se recalcula por cron (no en cada visita) — cada fila es una foto en el tiempo del segmento de un cliente; el dashboard de Performance de Clientes siempre lee la fila más reciente por `user_id`.
- `orders.payment_method` distingue el flujo: `'mercadopago'` usa `payments`/`payment_methods` (sección 07); `'bank_transfer'` usa `bank_transfer_payments`, iniciado y confirmado por WhatsApp, nunca por webhook automático de un proveedor de pago.
- `bank_transfer_payments.reviewed_by` es siempre `operaciones`/`admin` — aprobar un comprobante es una acción humana, no automática, y queda en `audit_log`.
- `profiles.anonymized_at` marca una baja de cuenta: la fila se conserva (por retención legal de `orders`/`invoices_dte`) pero sus campos de PII quedan limpiados — no es lo mismo que `is_active = false`, que solo indica que la cuenta está deshabilitada sin necesariamente estar anonimizada.
- `cookie_consents.user_id` es nulo para visitantes sin cuenta (el consentimiento vive en una cookie local del navegador) y se completa cuando ese visitante se registra.

## 06. Estructura de Carpetas del Proyecto

```
/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx                    # Home / Landing (banners, Instagram, newsletter, contacto)
│   │   ├── tienda/[categorySlug]/page.tsx   # con filtros: departamento/categoría, ofertas, evento especial
│   │   ├── producto/[slug]/page.tsx    # incluye grupos de opciones/variantes
│   │   ├── carrito/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── seguimiento/[orderId]/page.tsx   # estado textual del pipeline, sin mapa en vivo
│   │   ├── cuenta/(customer-only)/
│   │   │   ├── page.tsx                # datos personales
│   │   │   ├── direcciones/page.tsx
│   │   │   ├── pedidos/page.tsx        # historial + "repetir pedido"
│   │   │   └── puntos/page.tsx         # canjes y saldo de fidelidad
│   │   └── nosotros/, contacto/
│   ├── admin/
│   │   ├── layout.tsx                  # valida rol admin/marketing/operaciones vía middleware
│   │   ├── page.tsx                    # dashboard
│   │   ├── productos/                  # incluye departamentos, categorías, colecciones, variantes, eventos
│   │   ├── pedidos/                    # incluye edición de pedido pagado (sección 07)
│   │   ├── performance/                # Seguimiento de Ventas (Operaciones)
│   │   ├── promociones/                # incluye banners y canje de puntos
│   │   ├── clientes/                   # CRM (Marketing)
│   │   └── configuracion/              # usuarios, sucursales (stores), radio/tramos de envío, contacto, redes sociales
│   ├── repartidor/
│   │   └── page.tsx                    # vista restringida, solo pedidos asignados, confirmación por código
│   ├── auth/
│   │   ├── login/, registro/, verificar-email/, recuperar-password/
│   └── api/
│       ├── webhooks/mercadopago/route.ts
│       ├── webhooks/whatsapp/route.ts       # recibe comprobantes de transferencia bancaria
│       ├── checkout/create-preference/route.ts
│       ├── checkout/create-bank-transfer/route.ts
│       ├── cron/order-sla/route.ts     # Vercel Cron: transición automática a 'preparing'
│       ├── cron/instagram-sync/route.ts    # Vercel Cron: sincroniza posts y renueva el token
│       ├── cron/rfm-recompute/route.ts     # Vercel Cron: recalcula customer_rfm_snapshot (semanal)
│       ├── products/import/route.ts        # carga masiva: parseo, matching, product_import_rows
│       └── admin/**                    # route handlers que requieren rol staff
├── lib/
│   ├── supabase/ (server.ts, client.ts, middleware.ts)
│   ├── mercadopago/ (client.ts, webhooks.ts)
│   ├── auth/ (session.ts, rbac.ts)
│   ├── crypto/ (encrypt-field.ts)      # cifrado de RUT/token de Instagram, sección 11
│   ├── rate-limit/ (limiter.ts)
│   ├── geo/ (geocode.ts, directions.ts)    # OpenRouteService
│   └── audit/ (log-action.ts)
├── middleware.ts                       # Edge Middleware: sesión, rol, rate limit
├── vercel.json                         # configuración de Vercel Cron Jobs
├── supabase/
│   ├── migrations/                     # SQL versionado, incluye políticas RLS
│   └── seed.sql
└── BLUEPRINT.md
```

## 07. Checkout, Envío (Delivery) e Integración con Mercado Pago

### Selección de sucursal, radio de entrega y tarifa por distancia

1. **Elección de sucursal:** el cliente elige explícitamente en qué `store` retira o desde cuál se despacha su pedido (no hay asignación automática por cercanía). La UI solo debe listar sucursales donde, para retiro, la sucursal esté activa; para envío, la dirección elegida esté dentro del `max_delivery_radius_km` de esa sucursal específica.
2. **Geocodificación:** al guardar una dirección, el servidor llama a la **API de geocodificación de OpenRouteService** (Pelias sobre OpenStreetMap) y guarda `addresses.lat`, `addresses.lng`, `geocoded_at`. Si la dirección no se puede geocodificar, se rechaza el guardado con un mensaje claro — nunca se permite una dirección sin coordenadas si el método de entrega va a ser `shipping`.
3. **Cálculo de distancia:** al seleccionar "envío" y una sucursal, el servidor llama a la **API de Directions de OpenRouteService** para obtener la distancia real de ruta entre `stores.origin_lat/lng` **de esa sucursal** y la dirección del cliente.
4. **Validación de radio:** si la distancia > `stores.max_delivery_radius_km` de la sucursal elegida, el sistema **rechaza el envío desde esa sucursal** — el cliente debe elegir otra sucursal dentro de rango, o "retiro en tienda". Este rechazo ocurre en la UI y, obligatoriamente, en el Server Action que crea la preferencia de MP (nunca confiar solo en la validación del cliente).
5. **Validación de horario de reparto:** el `scheduled_at` elegido para envío debe caer dentro de `stores.delivery_schedule` de la sucursal — fuera de esos días/horas, el sistema rechaza la programación (configurable libremente por Admin, puede diferir del horario de atención al público).
6. **Tarifa por tramo y envío gratis:** si la distancia está dentro del radio, el servidor busca en los `shipping_zones` de esa sucursal el tramo correspondiente y aplica ese `price`. Si el subtotal del carrito ≥ `stores.free_shipping_min_amount` de esa sucursal, el costo de envío se anula a 0 sin importar el tramo.
7. **Monto mínimo de compra:** si el subtotal del carrito < `stores.min_order_amount` de la sucursal elegida, el checkout rechaza continuar hasta que el cliente agregue más productos.
8. **Snapshot:** la distancia calculada y el costo de envío resultante quedan guardados en `orders.delivery_distance_km`/`orders.store_id` y en el `total` del pedido — un cambio posterior en el radio, los tramos, el envío gratis o el mínimo de compra **no afecta pedidos ya creados**, solo a los nuevos.
9. **Costo de la API:** OpenRouteService es gratuito hasta 2000 requests/día y 40/min (sin tarjeta de crédito) — igual se cachea el resultado de geocodificación por dirección para minimizar llamadas repetidas y no acercarse al límite diario.

### Ciclo de vida completo del pedido (Pipeline)

Todos los pedidos pasan por `pending_payment` → `paid` ("Recibido"). Desde ahí:

1. **Preparación con SLA:** el cliente puede fijar `scheduled_at` (hora de retiro/entrega) al comprar. El sistema calcula `sla_deadline`: si hay `scheduled_at`, es esa hora; si no, es `paid_at + ORDER_PREP_SLA_MINUTES` (constante global, por defecto 30 min, sección 18 — igual para todo el catálogo en v1). Un **Vercel Cron Job** revisa cada minuto los pedidos `paid` con `scheduled_at` definido y los pasa a `preparing` automáticamente 30 minutos antes de esa hora; los pedidos sin `scheduled_at` pasan a `preparing` inmediatamente al pagar.
2. **Preparado:** Operaciones marca el pedido `ready` (se registra `ready_at`, usado para medir cumplimiento del SLA).
3. **Rama retiro (`pickup`):** `ready` → `ready_for_pickup`. Al retirar, Operaciones/Admin confirma en el panel → `delivered`.
4. **Rama envío (`shipping`):**
   - `ready` → `driver_assigned` (asignación manual por Operaciones/Admin, `orders.assigned_driver_id`) → `in_route`.
   - Al llegar, el repartidor presiona **"Ubicación alcanzada"** en `/repartidor` → `at_address`.
   - El repartidor pide el código al cliente (ver "Código de confirmación" abajo). Si el cliente lo confirma → `delivered`.
   - **Si el cliente no atiende:** el repartidor marca **"Problema con el pedido"** con una razón (`delivery_issue_reason`, ej. `cliente_ausente`, `direccion_no_ubicable`) → estado `delivery_issue`, se guarda `delivery_issue_at`. Durante esos minutos, si el cliente aparece, el repartidor puede seguir pidiendo el código y pasar directo a `delivered` sin volver a `at_address`.
   - **Tras 10 minutos** (`MAX_DELIVERY_ISSUE_WAIT_MINUTES`, sección 18) sin resolución, el repartidor puede marcar **"Regresando a tienda"** → `returning_to_store`.
   - Al llegar físicamente, Operaciones/Admin confirma la devolución en el panel → `returned_to_store`.
   - Desde `returned_to_store`, el cliente elige (vía email/seguimiento): **reenviar con costo adicional** (se reabre el **mismo pedido**: vuelve a `driver_assigned` tras pagar el costo extra de envío como un cargo adicional asociado al mismo `order`) o **retirar gratis en tienda** (pasa a `ready_for_pickup` sin costo adicional).

**Código de confirmación de entrega:**
- Al crearse el pedido, se genera `delivery_confirmation_code` (4-6 dígitos numéricos, no reutiliza el UUID del pedido) y se muestra al cliente en su página de Seguimiento y en el email de confirmación.
- La vista del repartidor (`/repartidor`) muestra, por cada pedido asignado: nombre, dirección y teléfono del cliente, el ID del pedido, y un campo para ingresar el código.
- El Server Action de confirmación valida **dos condiciones a la vez**: (a) el código coincide con `orders.delivery_confirmation_code`, y (b) `orders.assigned_driver_id = auth.uid()` del repartidor que confirma. Si ambas se cumplen → `delivered`, se registra `delivered_at` y una fila en `order_status_history`.
- **Bloqueo por intentos fallidos:** cada intento fallido incrementa `delivery_code_attempts`. Al llegar a 5, `delivery_code_locked = true` y el repartidor ya no puede seguir intentando — Operaciones/Admin debe regenerar el código o confirmar la entrega manualmente desde el panel (esa confirmación manual también queda en `order_status_history` marcada como override administrativo).

**Cada transición de estado** (automática o manual) inserta una fila en `order_status_history` con `status`, `changed_by` (null si fue automática) y una `note` cuando aplica (ej. la razón del `delivery_issue`).

### Edición de pedido pagado (cambios después de la compra)

- Antes de que un pedido llegue a `ready`, `operaciones` y `admin` pueden editar sus `order_items` (agregar, quitar o sustituir productos) desde el módulo "Gestión de pedidos" — cubre tanto sustituciones por falta de stock como cambios que el cliente solicitó por otro medio (teléfono, WhatsApp) antes de que se prepare.
- Cada ítem modificado se marca (`fulfillment_status = 'substituted'` o `'removed'`, con `modification_note`); si la edición cambia el `total`, el sistema recalcula y, según corresponda, genera un cobro adicional o un reembolso parcial vía la API de Mercado Pago sobre el mismo pedido.
- Toda edición queda registrada en `audit_log` (acción `order_items_modified`) y en `order_status_history`, con el detalle de qué cambió y quién lo autorizó — esto alimenta el indicador de "pedidos con cambios de productos" (sección 09).
- **No se puede editar** un pedido que ya está en `ready` o en cualquier estado posterior de la rama de envío/retiro — a partir de ahí, solo se puede cancelar o gestionar como incidencia de entrega.

### Mercado Pago (Checkout Pro)

1. **Flujo de compra:** el cliente arma el carrito → Server Action crea una "preference" en MP (`/api/checkout/create-preference`) con los `order_items` ya validados server-side (precio y stock recalculados desde la base de datos, nunca confiar en el precio enviado por el cliente) y con el costo de envío ya calculado según la sección anterior → se crea el `order` con estado `pending_payment` → se redirige al Checkout Pro de MP.
2. **Webhook (`/api/webhooks/mercadopago`):** único punto de verdad para confirmar el pago.
   - Verifica la firma `x-signature` / `x-request-id` según la documentación de MP antes de procesar cualquier payload.
   - Es idempotente: usa `mp_payment_id` (unique constraint en `payments`) para no procesar el mismo evento dos veces.
   - Al confirmar `approved`, actualiza `orders.status = 'paid'`, inserta la fila correspondiente en `order_status_history`, acredita puntos en `points_ledger` (sección 14), y dispara notificación por email y la emisión de DTE (sección 12).
3. **Tarjetas guardadas:** se usa la API de Customers & Cards de MP. La aplicación solo persiste `mp_customer_id`, `mp_card_id`, `brand`, `last_four` — nunca el número de tarjeta, CVV ni fecha de expiración completa. El PAN nunca transita por los servidores de la aplicación (Checkout Pro y el SDK de tarjetas de MP manejan esto directamente entre el navegador del cliente y MP).
4. **Reembolsos:** operación disponible solo para rol `admin`, vía API de MP, registrada en `audit_log`.

### Transferencia bancaria (validación manual vía WhatsApp)

Alternativa a Mercado Pago para clientes que prefieren transferir directamente. Es un flujo **manual, humano, no automatizado por webhook de un proveedor de pago** — la aprobación siempre la da una persona.

1. **Elección:** el cliente elige "Transferencia bancaria" en el checkout → se crea el `order` con `status = 'pending_payment'`, `payment_method = 'bank_transfer'`. El stock se descuenta recién cuando se aprueba el comprobante (mismo criterio de riesgo aceptado que con Mercado Pago, sección 07 — sin reserva).
2. **Mensaje inicial automático:** el Server Action dispara, vía la **WhatsApp Business API** (Cloud API de Meta), un mensaje de plantilla al teléfono del cliente (`profiles.phone`) con: los datos de la cuenta bancaria (`whatsapp_integration.bank_account_details`), el detalle del pedido (productos, total) y la instrucción de responder con el comprobante de transferencia. Se crea un `bank_transfer_payments` con `status = 'awaiting_proof'`.
3. **Recepción del comprobante:** el cliente responde por WhatsApp adjuntando una foto/PDF. El webhook `/api/webhooks/whatsapp` recibe el mensaje, descarga el archivo adjunto, lo guarda en Supabase Storage, y actualiza `bank_transfer_payments` (`proof_storage_path`, `proof_received_at`, `status = 'proof_submitted'`). El webhook valida la firma de Meta (`X-Hub-Signature-256`) antes de procesar, igual que el webhook de MP.
4. **Revisión humana:** el comprobante aparece en una cola dentro de "Gestión de pedidos", visible solo para `operaciones`/`admin`. El staff revisa la imagen contra la cuenta bancaria real y **aprueba** o **rechaza** (con motivo, `rejection_reason`) — esta acción queda en `audit_log` (acción `bank_transfer_reviewed`), porque decide si el negocio considera pagado un pedido sin que ningún proveedor de pago lo confirme.
5. **Al aprobar:** `bank_transfer_payments.status = 'approved'`, `orders.status = 'paid'` — dispara exactamente el mismo flujo que la confirmación de Mercado Pago (puntos, DTE, `order_status_history`, arranque del pipeline de preparación). La confirmación de pago + pedido recibido se envía **por WhatsApp (misma conversación) y por email**.
6. **Sin respuesta:** si no llega comprobante dentro de `BANK_TRANSFER_PROOF_TIMEOUT_HOURS` (48h por defecto), un Vercel Cron cancela el pedido automáticamente (`status = 'cancelled'`) y lo notifica al cliente.

**Nota de alcance:** WhatsApp se habilita **únicamente** para este flujo de validación de pago — no reemplaza ni se suma como canal general de notificaciones de pedido (eso sigue siendo solo email, sección 15 y 20).

## 08. Autenticación y Registro

### Clientes finales
- Proveedor: **Supabase Auth**.
- Métodos habilitados: **email + contraseña** (con verificación de email obligatoria antes de poder finalizar una compra) y **Google OAuth**.
- Registro: nombre completo, email, contraseña (mín. 10 caracteres, se valida fuerza en el cliente y servidor). El teléfono y RUT se piden en el primer checkout, no en el registro, para reducir fricción.
- Sesión: cookies `httpOnly`, `secure`, `SameSite=Lax` gestionadas por el SDK de Supabase SSR (`@supabase/ssr`). No se maneja JWT manualmente en el cliente.
- Recuperación de contraseña: flujo estándar de Supabase (link con token de un solo uso, expira en 1 hora).
- Login social: Google OAuth vinculado por email; si el email ya existe con password, se fusiona la identidad (no se crean cuentas duplicadas).

### Staff (Admin, Marketing, Operaciones, Repartidor)
- **Sin auto-registro.** Las cuentas de staff las crea únicamente el rol `admin` desde `/admin/configuracion/usuarios`.
- Al crear una cuenta de staff se genera una contraseña temporal y `must_change_password = true`; el usuario debe cambiarla en el primer login antes de acceder a cualquier otra pantalla.
- Mismo mecanismo de Supabase Auth (email + contraseña), **sin 2FA en v1** (decisión explícita del usuario) — pero el modelo de datos y Supabase Auth ya soportan MFA nativo, así que activar 2FA en el futuro es un cambio de configuración, no de esquema (ver sección 20).
- El campo `profiles.role` es la fuente de verdad para permisos; nunca se decide autorización solo por pertenecer a un dominio de email o por un claim de cliente sin validar contra esta tabla (o contra RLS, que la usa directamente).
- **Creación de cuentas Admin:** la aplicación **nunca** permite crear una cuenta con `role = 'admin'` desde ninguna pantalla ni Server Action, ni siquiera para un usuario ya autenticado como `admin`. El formulario de "Gestión de usuarios" solo ofrece los roles `marketing`, `operaciones` y `repartidor`, y el Server Action correspondiente valida ese allowlist server-side y rechaza explícitamente `role = 'admin'` aunque el request sea manipulado. Una cuenta Admin nueva solo se crea manualmente en el dashboard de Supabase (fuera de la aplicación), por quien administra la infraestructura.

**Criterios de aceptación (EARS):**
- CUANDO un cliente se registra con email y contraseña, EL SISTEMA DEBE enviar un correo de verificación antes de permitir el primer pedido.
- CUANDO un usuario staff inicia sesión por primera vez, EL SISTEMA DEBE forzar el cambio de contraseña antes de mostrar cualquier otra pantalla del admin.
- SI un intento de login falla 5 veces para el mismo email en 15 minutos, ENTONCES EL SISTEMA DEBE bloquear intentos adicionales para ese email durante 15 minutos (ver sección 16).
- CUANDO un cliente usa "Continuar con Google" con un email que ya tiene cuenta por contraseña, EL SISTEMA DEBE vincular la identidad existente en lugar de crear una cuenta duplicada.

## 09. Roles y Permisos (RBAC)

Un usuario tiene **un único rol primario** (`profiles.role`). Es una simplificación deliberada para v1; ver sección 20 si se necesita en el futuro que un staff tenga múltiples roles simultáneos.

El panel admin está dividido en **módulos**. Cada rol staff ve únicamente los módulos que le corresponden — no existe una navegación "global" que muestre módulos sin permiso ni siquiera deshabilitados: se ocultan por completo, tanto en el menú como en la ruta (si se accede directo por URL, el middleware/Server Component redirige o responde 403).

| Módulo | Admin | Marketing | Operaciones | Repartidor |
|---|:---:|:---:|:---:|:---:|
| Dashboard general (BI/financiero) | ✅ | ❌ | ❌ | ❌ |
| Gestión de pedidos | ✅ | ❌ | ✅ | ❌ |
| Gestión de productos y stock (incluye carga masiva y lotes/vencimientos) | ✅ | ❌ | ✅ | ❌ |
| Seguimiento de ventas (Performance) | ✅ | ❌ | ✅ | ❌ |
| Promociones y campañas | ✅ | ✅ | ❌ | ❌ |
| Canje de puntos (reglas y catálogo canjeable) | ✅ | ✅ | ❌ | ❌ |
| Gestión de clientes (CRM) | ✅ | ✅ | ❌ | ❌ |
| Análisis de Ofertas (cupones, promos, captura de clientes) | ✅ | ✅ | ❌ | ❌ |
| Performance de Clientes (segmentación RFM) | ✅ | ✅ | ❌ | ❌ |
| Delivery (envíos asignados) | ✅ | ❌ | ❌ | ✅ (solo lo propio) |
| Gestión de usuarios (staff) | ✅ (crea marketing/operaciones/repartidor, nunca admin) | ❌ | ❌ | ❌ |
| Configuración del sistema | ❌ solo Admin ✅ | ❌ | ❌ | ❌ |
| Auditoría (`audit_log`) | ✅ | ❌ | ❌ | ❌ |

**Repartidor — regla estricta:** no tiene acceso a ningún otro módulo del admin, ni siquiera de solo lectura. Su única superficie es la ruta `/repartidor`, que muestra exclusivamente los pedidos donde `assigned_driver_id = auth.uid()`. No ve catálogo, clientes, promociones ni dashboard. Además, **está limitado a su propia sucursal** (`profiles.store_id`) — solo puede ver/aceptar pedidos con `orders.store_id` igual al suyo, aunque de todas formas solo verían los suyos por `assigned_driver_id`.

**Marketing — CRM:** tiene acceso al perfil completo del cliente incluida su dirección exacta (módulo Gestión de Clientes), para poder segmentar campañas por zona. Se mantienen dos excepciones no negociables (ver sección 11): Marketing **nunca** ve el RUT descifrado del cliente ni ningún dato de `payment_methods` (tokens de tarjeta) — ambos siguen reservados a Admin/Operaciones en el contexto estricto de fulfillment o facturación. Marketing tampoco edita productos/stock directamente (ver sección 13) — su única escritura sobre `products` es el campo `points_cost`, a través del módulo "Canje de puntos". A diferencia de Operaciones/Repartidor, **Marketing no tiene `store_id`** — ve clientes y arma campañas a nivel de todas las sucursales por igual.

**Operaciones:** gestiona pedidos (estado, asignación de repartidor, edición antes de `ready`), stock y productos, y tiene su propio módulo de "Seguimiento de Ventas" (Performance) — todo **limitado a su propia sucursal** (`profiles.store_id`): solo ve `orders`/`store_products` donde `store_id` coincide con el suyo. Sus indicadores de Performance:
- Venta diaria y venta por hora (agregación sobre `orders.total`/`created_at`).
- Pedidos completos vs. incompletos y **% de completitud**: un pedido cuenta como incompleto si llegó a `delivered` pero al menos un `order_item` quedó `substituted` o `removed`.
- Pedidos con cambios de productos: cubre tanto sustituciones por falta de stock como ediciones solicitadas por el cliente después de comprar (sección 07, "Edición de pedido pagado"), contados juntos como un solo indicador.
- **% de pedidos a tiempo:** compara `ready_at` (retiro) o `delivered_at` (envío) contra `orders.sla_deadline` — a tiempo si ocurrió antes o igual al deadline.
- Vista de pipeline: cantidad de pedidos en cada estado de la sección 07 en tiempo real (cuántos `preparing`, `in_route`, `delivery_issue`, etc.).

**Admin** ve estos mismos indicadores dentro de su Dashboard general, junto con el resto de la información financiera.

**Admin:** único rol con acceso a todos los módulos, incluida la creación de cuentas staff — con la excepción explícita de que **no puede crear otra cuenta Admin** desde la aplicación (ver sección 08).

**Reglas explícitas adicionales:**
- Ningún rol staff puede modificar su propio `role` ni el de otro usuario, salvo Admin sobre cuentas no-admin.
- `marketing` **nunca** accede a `rut_encrypted` ni a `payment_methods` — sí accede a `addresses` de clientes vía el módulo CRM.
- `operaciones` accede a direcciones y RUT **únicamente** en el contexto de despachar un pedido (join con `orders`); el listado libre de clientes (CRM) es de Marketing/Admin, no de Operaciones.
- `repartidor` solo puede leer/escribir sobre `orders` donde `assigned_driver_id = auth.uid()`.
- `operaciones` y `repartidor` están **scoped a una sucursal** vía `profiles.store_id` — nunca ven ni pueden operar sobre pedidos, stock o asignaciones de otra sucursal, ni siquiera de solo lectura. `admin` y `marketing` no tienen esa restricción.

## 10. Protección de Endpoints y Rutas de API

**Capa 1 — Edge Middleware (`middleware.ts`):**
- Toda ruta bajo `/admin/**` y `/repartidor/**` exige sesión válida de Supabase; si no hay sesión, redirige a `/auth/login`.
- Verifica el rol contra `profiles.role` (una consulta ligera cacheada por request, no confía en claims del JWT sin refrescar) antes de renderizar `/admin/**` según el rol (ej. `marketing` no puede entrar a `/admin/configuracion`).
- Aplica rate limiting (sección 16) antes de dejar pasar la request a la ruta.

**Capa 2 — Route Handlers / Server Actions:**
- Cada Server Action que muta datos vuelve a verificar `role` server-side vía `lib/auth/rbac.ts` (función `requireRole(['admin','marketing'])`) — nunca confía en que el middleware ya filtró correctamente (defensa en profundidad).
- El Server Action de creación de usuarios staff (`createStaffUser`) valida un allowlist fijo de roles (`['marketing','operaciones','repartidor']`) y rechaza con 400 cualquier intento de crear `role = 'admin'`, sin excepción — incluso si la request original viene de una sesión Admin válida y aunque se manipule el payload.
- Los Route Handlers bajo `/api/admin/**` responden `401`/`403` explícitos si la verificación falla, sin filtrar información sobre qué recurso existe.

**Capa 3 — Row Level Security (Postgres, la barrera real de datos):**
- RLS **habilitado en todas las tablas**, política por defecto `DENY`.
- Ejemplo de políticas:
  ```sql
  alter table orders enable row level security;

  create policy "customers_select_own_orders" on orders
    for select using (auth.uid() = user_id);

  create policy "staff_select_orders" on orders
    for select using (
      exists (select 1 from profiles p where p.id = auth.uid()
              and (p.role = 'admin'
                   or (p.role = 'operaciones' and p.store_id = orders.store_id)))
    );

  create policy "repartidor_select_assigned_orders" on orders
    for select using (
      assigned_driver_id = auth.uid()
      and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'repartidor')
    );
  ```
- Las claves de servicio de Supabase (`service_role`) que **saltan** RLS solo se usan en Route Handlers server-side específicos (ej. webhook de MP), nunca se exponen al cliente ni se usan por defecto.

**Webhooks:**
- `/api/webhooks/mercadopago` valida la firma criptográfica del payload antes de tocar la base de datos; si la firma no coincide, responde `401` y no procesa nada.

## 11. Manejo de Datos Sensibles

| Dato | Tratamiento |
|---|---|
| Contraseñas | Nunca tocadas por el código de la aplicación — gestionadas 100% por Supabase Auth (hash con bcrypt/Argon2 interno). |
| Número de tarjeta / CVV / fecha expiración | **Nunca se reciben ni almacenan.** El SDK de Checkout Pro / Cards de MP los captura directamente en el navegador del cliente hacia los servidores de MP. La app solo guarda el token (`mp_card_id`) y metadatos no sensibles (`last_four`, `brand`). |
| RUT del cliente | Cifrado a nivel de aplicación (AES-256-GCM, `lib/crypto/encrypt-field.ts`) antes de guardarse en `rut_encrypted` / `rut_cliente_encrypted`. La clave de cifrado vive solo en variables de entorno del servidor (nunca en el repo, nunca en el cliente). Solo se descifra en el server para: (a) generar el DTE, (b) mostrarlo a `admin` u `operaciones` en el contexto de un pedido puntual. |
| Direcciones | Visibles en texto plano para: el propio cliente, `admin`, `marketing` (módulo CRM, para segmentación de campañas), `operaciones` (fulfillment) y el `repartidor` asignado a ese pedido específico. |
| Payloads de webhook de MP | Se redactan campos no necesarios (datos de tarjeta, metadata interna de MP) antes de guardarse en `payments.raw_webhook_redacted`. |
| `audit_log.before_data` / `after_data` | Los campos sensibles (RUT, dirección completa, tokens de pago) se redactan (`"[REDACTED]"`) antes de guardarse — el log registra *qué cambió* y *quién*, no el valor sensible en sí. |
| Variables de entorno / claves API | Solo en Vercel Environment Variables (nunca committeadas). Ver sección 18. |
| Tráfico | TLS obligatorio end-to-end (Vercel + Supabase por defecto). |
| Exportación/soporte | No existe endpoint de "exportar todos los clientes" para ningún rol distinto de `admin`; y aun para `admin` queda registrado en `audit_log` como `customer_data_exported`. |
| Token de Instagram (`instagram_integration.access_token_encrypted`) | Es una credencial de acceso a una cuenta de terceros — se cifra igual que el RUT (AES-256-GCM) y solo se descifra en el job server-side que sincroniza publicaciones. Nunca se expone al cliente ni a Marketing en texto plano (Marketing ve el resultado de la sincronización, no el token). |
| Consentimiento de newsletter/T&C | El opt-in de `newsletter_subscribers` y la aceptación de `terms_acceptances` se guardan con fecha exacta y (para T&C) versión aceptada — necesarios para demostrar consentimiento bajo la Ley 19.628 de protección de datos personales (Chile). Ambos se pueden revocar (`unsubscribed_at`) sin eliminar el historial de consentimiento previo. |
| Perfil de comportamiento (`customer_rfm_snapshot`) | Es un perfilamiento de hábitos de compra del cliente — no es dato identificatorio como el RUT, pero sigue siendo dato de comportamiento personal. Visible solo para `admin`/`marketing` (igual que el resto del CRM, sección 09); `operaciones`/`repartidor` no tienen acceso. |

**Qué NO se guarda nunca:** número de tarjeta completo, CVV, fecha de expiración de tarjeta, contraseñas en texto plano, claves privadas en el repositorio.

### Cumplimiento Legal (Ley 19.628 y cookies)

- **Cookies:** banner de consentimiento en el primer acceso, con tres categorías: necesarias (siempre activas, no rechazables), analíticas y de marketing. Ninguna cookie de analítica/marketing se carga antes de que el visitante acepte esa categoría específica. Para visitantes sin cuenta el consentimiento se guarda en una cookie local; para clientes registrados queda también en `cookie_consents` asociado a su `user_id`.
- **Desuscripción de email:** todo email de marketing/newsletter incluye un link de baja de un clic (actualiza `newsletter_subscribers.unsubscribed_at`). Los emails transaccionales de pedidos (confirmación de compra, cambios de estado) **no** son desactivables mientras el cliente tenga pedidos en curso — son necesarios para el servicio, no marketing.
- **Baja de cuenta (derecho de cancelación/oposición, Ley 19.628):** el cliente puede solicitar la eliminación de su cuenta desde "Mi Cuenta". El sistema **no borra físicamente** al cliente si tiene pedidos o DTE asociados (retención legal obligatoria ante el SII) — en su lugar, **anonimiza**: limpia `full_name`, `phone`, `rut_encrypted`, `addresses` y desactiva el login (`profiles.is_active = false`, `anonymized_at = now()`), pero conserva `orders`/`invoices_dte` con un nombre genérico ("Cliente eliminado") para mantener la trazabilidad contable exigida por ley, sin datos personales identificables.
- **Derechos ARCO:** acceso, rectificación, cancelación y oposición — cubiertos por: "Mi Cuenta" (acceso/rectificación de sus propios datos), la baja de cuenta descrita arriba (cancelación), y la desuscripción de newsletter/cookies de marketing (oposición).
- **Política de retracto (Ley del Consumidor / SERNAC):** los T&C (`terms_acceptances`) deben declarar explícitamente que los productos de panadería/pastelería, por ser perecibles y/o hechos a pedido, están exentos del derecho a retracto estándar de 10 días — sin esta declaración explícita, el negocio queda expuesto a un reclamo válido ante SERNAC. Esto es contenido legal a redactar con el cliente antes del lanzamiento, no una decisión técnica.

## 12. Facturación Electrónica (SII / Chile)

Chile exige boleta o factura electrónica (DTE) timbrada ante el SII. Implementar el protocolo SOAP/XML del SII directamente está fuera de un alcance razonable para este blueprint: se recomienda integrar un **proveedor de facturación electrónica homologado** (ej. Haulmer/OpenFactura, Bsale, Simple API, Facturación Móvil) vía su API REST.

**Flujo:**
1. Al confirmarse el pago (`orders.status = 'paid'`), se dispara un job que llama a la API del proveedor DTE con los datos de la orden y el RUT descifrado del cliente (o RUT genérico "66666666-6" si el cliente no lo proporcionó y se emite boleta sin RUT, válido en Chile para boletas).
2. Se guarda la respuesta (folio, estado, URL del PDF) en `invoices_dte`.
3. Si la emisión falla, el pedido **no se bloquea** (el cliente ya pagó) pero se marca `invoices_dte.status = 'rejected'` y genera una alerta para `admin`/`operaciones` para reintento manual.

**Nota de seguridad:** la credencial/certificado digital del proveedor DTE se guarda solo como variable de entorno server-side; nunca se expone al cliente.

> Elección del proveedor DTE específico queda como punto abierto — ver sección 20.

## 13. Productos, Categorías, Cuenta del Cliente y Landing

El árbol de clasificación tiene **dos capas independientes** que resuelven necesidades distintas:

**Capa operativa (jerárquica, un producto pertenece a una sola rama):**
```
Departamento (Panadería, Pastelería, Cafetería)   ← `departments`, nivel 1, fijo, pocos registros
  └── Categoría (Pan Amasado, Baguettes, Tortas)   ← `categories`, nivel 2 (+ sub-niveles vía parent_id)
        └── Producto                               ← `products.category_id`, exactamente una
```
Esta es la organización real de producción/bodega que usa **Operaciones** en "Gestión de productos y Stock" — determina, por ejemplo, qué reportes de stock por línea de producción se pueden generar.

**Capa de vitrina (no jerárquica, muchos-a-muchos):**
```
Colección (Sin Gluten, Para Compartir, Nuevo, Vegano...)  ← `collections` + `product_collections`
  └── Producto                                              ← puede estar en varias colecciones a la vez
```
Esta es la que usa **Marketing** en "Promociones y campañas" para armar vitrinas curadas en la web (ej. un pan sin gluten aparece en "Panadería" Y en "Sin Gluten" sin duplicarse). **"Descuentos" y "Más Vendidos" no son colecciones manuales** — se calculan en tiempo de consulta: "Descuentos" como productos con una `promotions` activa aplicable, y "Más Vendidos" como los productos con mayor volumen de `order_items` en una ventana de tiempo (ej. últimos 30 días) — ambas se actualizan solas sin que Marketing tenga que mantenerlas a mano. Inspirado en cómo Eric Kayser y Macarrón usan "Favoritos"/"Más Vendidos" como vitrina.

**Permisos:**
- Edición de stock, nombre, descripción, fotos, departamento y categoría de un producto: `admin` y `operaciones` (módulo "Gestión de productos y Stock"). Edición de precio: solo `admin`. Fotos en Supabase Storage, lectura pública para imágenes activas, escritura restringida a estos mismos roles.
- Gestión de `departments`/`categories` (crear/reordenar la estructura del árbol): `admin` únicamente (cambia la organización operativa de fondo).
- Gestión de `collections` y de qué productos entran en cada una (`product_collections`): `admin` y `marketing`, desde el módulo "Promociones y campañas" — Marketing arma vitrinas sin necesitar acceso al módulo de productos/stock.
- `marketing` no tiene acceso al módulo de productos/stock en general. Su única escritura directa sobre la tabla `products` es el campo `points_cost` (marcar qué productos son canjeables por puntos y su costo), a través del módulo "Canje de puntos" — una acción acotada, auditada y separada de la edición del catálogo.

### Deduplicación por nombre (productos, categorías, departamentos, colecciones)

Antes de crear cualquier departamento, categoría, colección o producto, el nombre se normaliza (minúsculas + sin tildes/acentos vía `unaccent()` + espacios colapsados) y se compara contra lo existente en su mismo alcance (`products` dentro de su categoría, `categories` dentro de su departamento, `departments`/`collections` a nivel global). Esto vive tanto en la UI (aviso "ya existe algo muy similar: '{nombre}' — ¿es lo mismo?" antes de guardar) como en una restricción `unique` a nivel de base de datos sobre `name_normalized` — la segunda capa existe porque la UI sola no es suficiente defensa (mismo principio de la sección 04).

### Carga de productos: individual y masiva

- **Alta individual:** el staff (`admin`/`operaciones`) completa el formulario de producto; el `sku` se genera automáticamente combinando `departments.code` + `categories.code` + un correlativo (ej. `PAN-AMB-00042`) — **nunca** se escribe a mano, en ningún flujo.
- **Carga masiva (CSV/Excel):** se sube un archivo, se crea un `product_imports` y cada fila se procesa como un `product_import_rows`, clasificada así:
  - **`new`** — no hay coincidencia por nombre normalizado + categoría → se crea el producto, con SKU nuevo.
  - **`identical`** — coincide todo (nombre, categoría, precio, descripción, atributos) → no se hace nada, evita duplicados silenciosos.
  - **`description_changed`** — coincide el producto pero cambió *solo* la descripción → queda `resolution = 'pending'`, el staff debe aprobar o rechazar el cambio explícitamente antes de que se aplique.
  - **`new_variant`** — el importador reconoce filas repetidas del mismo producto base (mismo nombre+categoría) con un valor de `product_option_values` distinto (ej. mismo "Torta de Chocolate" con Relleno "Frutilla" en vez de "Manjar" ya cargado) y **agrega el nuevo valor de opción a la ficha existente**, en vez de crear un producto duplicado. Si en cambio el producto es estructuralmente distinto (ej. "Pan Amasado Salado" vs. "Pan Amasado Dulce", ya definidos como productos separados), se crea como producto nuevo — no como variante.
- Antes de confirmar la importación completa, se muestra un resumen ("X nuevos, Y pendientes de confirmar, Z sin cambios, W variantes agregadas") — nada se aplica a ciegas.

### Trazabilidad de lotes y vencimientos (liquidación)

- El stock real vive en `product_batches`, no directamente en `store_products.stock_quantity` (que es solo un cache, mantenido por trigger). Cada lote tiene su propia cantidad y `expiration_date` — al llegar producción nueva, se **agrega un lote nuevo**, nunca se mezcla con el stock existente de un lote más viejo.
- **Consumo FIFO:** al confirmarse un pago, el descuento de stock consume primero del lote con vencimiento más próximo (o más antiguo si no tiene fecha), pudiendo abarcar más de un lote si la cantidad pedida excede lo que queda en el más próximo a vencer.
- **Liquidación:** Operaciones/Admin marcan manualmente `is_clearance = true` y un `clearance_discount_percent` sobre un lote específico — nunca sobre el producto completo — así el descuento aplica solo a las unidades de ese lote próximo a vencer, y no arriesga vender con descuento unidades de un lote más nuevo que todavía tiene vida útil.
- El módulo "Gestión de productos y Stock" muestra una vista de lotes ordenados por `expiration_date` ascendente, para que el equipo vea de un vistazo qué sacar primero.

### Variantes de producto (grupos de opciones)

Productos como tortas o café necesitan personalización al momento de la compra, distinta de la taxonomía de arriba. Se modela con `product_option_groups` (ej. "Relleno", "Cobertura", "Tamaño") + `product_option_values` (ej. "Manjar", "Chocolate", cada uno con su propio `price_delta`), asociados a un producto específico — no son globales, cada producto define sus propios grupos.

```
Producto "Torta de Cumpleaños"
  ├── Relleno (única)    → Manjar / Chocolate / Frutilla
  ├── Cobertura (única)  → Chocolate / Fondant / Merengue
  └── Tamaño (única)     → 10 / 20 / 30 personas (cada uno con recargo de precio)
```

**Nota:** para pan (salado/dulce) y café (negro/con leche), se confirmó que estas variantes son en realidad **productos distintos** en el catálogo (ej. "Pan Amasado Salado" y "Pan Amasado Dulce" son dos fichas separadas, cada una con su propio stock y precio) — no usan este sistema de opciones, que queda reservado para personalización real al momento de comprar (tortas, donas, café).

Al agregar un producto al carrito, cada valor elegido queda registrado en `order_item_options` como snapshot (nombre y recargo al momento de la compra), igual que `order_items.product_name_snapshot` protege el precio — si el grupo de opciones cambia después, el pedido histórico no se ve afectado.

### Eventos especiales y productos de edición limitada

Para productos como "Pan de Jamón Navideño": se marca `products.is_special_event = true`, ligado a una `collections` de evento con `starts_at`/`ends_at` (ej. "Navidad"). El producto solo es comprable mientras esa colección esté vigente, con un cupo duro (`max_orders`) que se valida server-side igual que el tope de usos de una promoción (`special_orders_count` se incrementa atómicamente en cada compra confirmada, se rechaza si ya alcanzó `max_orders`). Si `requires_production_notes = true`, el checkout exige que el cliente deje una nota (`order_items.customization_note`) para que Operaciones planifique la producción del lote. Esto es un caso especial y acotado — el resto del catálogo se mantiene como stock disponible normal, sin manejo general de "bajo pedido".

### Mi Cuenta (cliente)

- **Direcciones:** CRUD sobre `addresses` (ya modelado).
- **Datos personales:** edición de `profiles.full_name`/`phone` (el cambio de email requiere re-verificación vía Supabase Auth).
- **Mis pedidos:** historial completo (`orders` + `order_items` + `order_item_options`) con el estado actual de cada uno.
- **Repetir pedido:** toma los `order_items` (y sus `order_item_options`) de un pedido anterior, revalida **stock y precio actuales** de cada producto (nunca reutiliza el precio histórico) y, si todo está disponible, arma el carrito y lleva directo al checkout. Si algún producto ya no existe, está inactivo o sin stock, se le informa al cliente para que ajuste antes de continuar — nunca se bloquea todo el repedido por un solo ítem no disponible.
- **Canjes y puntos de fidelidad:** vista de solo lectura sobre `points_ledger` (filtrado por su propio `user_id`) mostrando acumulaciones y canjes, más el saldo actual (`profiles.points_balance`).

### Landing

- **Banners/carrusel:** gestionado por Marketing vía la tabla `banners` (con vigencia opcional `starts_at`/`ends_at`, igual que promociones y colecciones de evento).
- **Botones principales:** ir a la tienda, seguimiento de pedido (consulta pública por `order_id` + validación de pertenencia, muestra el estado actual del pipeline de la sección 07 — **sin mapa en vivo de la ubicación del delivery**, decisión explícita para v1: solo estado textual), y contacto.
- **Contacto:** dirección, email, teléfono, horarios y redes sociales — servido desde `stores` (`contact_address`, `contact_email`, `contact_phone`, `business_hours`, `social_links`); si hay más de una sucursal activa, la landing muestra los datos de cada una (ej. selector de sucursal o listado), editable solo por Admin.
- **Instagram (integración automática):** un job programado (Vercel Cron) sincroniza las publicaciones recientes de la cuenta Business vía la API de Instagram/Meta, usando el token cifrado en `instagram_integration`. El token de acceso de larga duración expira cada ~60 días — el mismo job debe **renovarlo automáticamente antes de que expire** (ej. cada 50 días) y alertar a Admin si la renovación falla. **Prerequisito de negocio:** el cliente necesita una cuenta de Instagram Business/Creator vinculada a una página de Meta Business antes de la Fase 10 (ver sección 20).
- **Newsletter:** formulario de opt-in que inserta en `newsletter_subscribers` con `consent_at` explícito — nunca se suscribe a nadie sin una acción positiva del usuario (checkbox desmarcado por defecto).
- **Términos y condiciones:** en el registro, el cliente acepta una versión específica de los T&C, registrada en `terms_acceptances` (no un simple booleano) — permite demostrar qué aceptó y cuándo si los términos cambian más adelante.

### Filtros de la tienda

- Filtro por departamento/categoría (botones, navegación jerárquica de la sección 13).
- Filtro "En oferta" → la colección computada "Descuentos" (sección 13, ya definida).
- Filtro de evento especial → se activa solo mientras haya una `collections` de evento vigente (`starts_at <= now() <= ends_at`); fuera de esa ventana, el filtro ni siquiera aparece en la UI.

## 14. Gestión de Ofertas, Promociones y Programa de Puntos

- `promotions` soporta descuentos porcentuales (con `max_discount_amount` opcional como tope) o de monto fijo, aplicables a un producto específico, a toda una categoría, a todo un departamento, o globales, con vigencia (`starts_at`/`ends_at`), tope de usos (`max_uses`) y monto mínimo de compra opcional (`min_order_amount` nulo/0 = sin mínimo).
- **Uso único por cliente:** `single_use_per_customer` es un flag configurable **por cupón** (no una regla global) — Marketing decide caso a caso si un código es de una sola vez por cliente (ej. cupón de bienvenida) o reutilizable (ej. "10% los viernes"). Cuando está activo, el Server Action de checkout rechaza el cupón si ya existe una fila en `coupon_redemptions` para ese `promotion_id` + `user_id`.
- Aplicación de cupón: Server Action valida (vigencia, uso máximo no alcanzado, monto mínimo, código correcto, uso único si aplica) **server-side** contra la base de datos en el momento del checkout — nunca se confía en un descuento calculado en el cliente. Cada aplicación exitosa inserta una fila en `coupon_redemptions`.
- Solo `admin` y `marketing` pueden crear/editar promociones; toda creación/edición queda en `audit_log`.

### Análisis de Ofertas

Módulo de solo lectura (Admin y Marketing) que cruza `promotions`, `orders`, `order_items` y `coupon_redemptions` — sin tablas nuevas más allá de `coupon_redemptions`:
- **Comparativo de cupones/ofertas:** uso (`usage_count`/`max_uses`), descuento total otorgado, ingresos generados por pedidos que usaron cada `promotion_id`.
- **Productos más vendidos con descuento** vs. sin descuento, para medir si una promoción realmente movió el producto o solo restó margen a ventas que iban a ocurrir igual.
- **Ventas totales por evento/cupón:** suma de `orders.total` agrupado por `promotion_id`.
- **Performance de uso:** tasa de conversión (canjes / vistas o clics del cupón, cuando se trackee) y % del cupo (`usage_count`/`max_uses`) consumido.
- **Captura de nuevos clientes:** compara la primera compra histórica de cada cliente (`MIN(orders.created_at)` por `user_id`) contra el `promotion_id` usado en esa primera compra — cuántos clientes nuevos entraron por cada promoción específica.

### Programa de Puntos (Canje de Puntos)

- **Acumulación:** por cada pedido con `status = 'paid'`, el sistema acredita puntos proporcionales al monto pagado, según una tasa configurable (`LOYALTY_POINTS_PER_CLP`, por defecto 1 punto por cada $1.000 CLP — ver sección 20). La acreditación es automática al confirmarse el pago (mismo evento que dispara la emisión del DTE), insertando una fila `type = 'earn_purchase'` en `points_ledger` y actualizando `profiles.points_balance` en la misma transacción.
- **Canje — dos modalidades, ambas soportadas desde el inicio:**
  1. **Descuento en dinero en el checkout:** el cliente convierte X puntos en un descuento fijo aplicado al carrito, según una tasa de conversión configurable (`LOYALTY_POINTS_TO_CLP_RATE`, ej. 100 puntos = $1.000 CLP). Se valida server-side que el cliente tenga saldo suficiente (`profiles.points_balance`) antes de aplicar el descuento, con la misma lógica de validación que un cupón.
  2. **Productos canjeables:** Marketing marca productos específicos como canjeables (`products.points_cost` no nulo) desde el módulo "Canje de puntos". El cliente cambia un producto por sus puntos en vez de pagarlo en dinero.
  - Todo canje descuenta puntos insertando una fila negativa en `points_ledger` (`type = 'redeem_discount'` o `'redeem_product'`) de forma atómica junto con la creación/actualización del pedido — nunca se descuenta el saldo sin que quede el registro correspondiente en el ledger.
- **Gestión:** el módulo "Canje de puntos" (Admin y Marketing) permite configurar la tasa de acumulación, la tasa de conversión del descuento y el catálogo de productos canjeables. Toda esa configuración queda registrada en `audit_log`.

### Performance de Clientes (Segmentación RFM)

Módulo de solo lectura y etiquetado (Admin y Marketing) — **no dispara ninguna acción automática**, solo muestra el segmento y la acción sugerida para que el staff decida qué hacer manualmente (ej. exportar la lista de "clientes en riesgo" y contactarlos por su cuenta).

- Un **Vercel Cron Job** (semanal) recalcula, para cada cliente con al menos un pedido `paid`, sus métricas: `recency_days` (días desde su última compra), `frequency_count` y `monetary_total` (ambas dentro de la ventana `RFM_ANALYSIS_WINDOW_DAYS`, comportamiento reciente), y `ltv_total` (gasto histórico **completo**, sin ventana — todas las compras desde siempre) — cada corrida inserta una fila nueva en `customer_rfm_snapshot` (no se sobreescribe: permite ver cómo evoluciona un cliente en el tiempo).
- Cada métrica se puntúa de 1 a 5 (`r_score`/`f_score`/`m_score`) por quintiles sobre la base de clientes activa, y la combinación de puntajes define el `segment` (5 categorías):

| Segmento | Perfil | Acción sugerida |
|---|---|---|
| Estrella | R, F, M altos — el mejor grupo | **Premiar** |
| Leal | Compra seguido, gasto sólido, sin ser el tope | **Premiar** |
| Promedio | Comportamiento intermedio en las tres métricas | **Impulsar venta** |
| Dormido | Fue bueno, dejó de comprar recientemente | **Retener** |
| Perdido | Ausencia larga, F/M bajos | **Activar** |

- El dashboard muestra la distribución de clientes por segmento, permite ordenar por "mejores"/"peores" clientes (por `ltv_total` o por `monetary_total`+`frequency_count` recientes), y filtrar por acción sugerida — pero el envío de cualquier comunicación sigue siendo manual (fuera de alcance de v1 automatizar campañas por segmento, sección 20).
- Esta misma base de datos alimenta la vista de **"atracción de nuevos clientes"** (clientes con `frequency_count = 1` y `recency_days` bajo, cruzado con `coupon_redemptions` de la sección de Análisis de Ofertas) — no es un sistema aparte, es el mismo dato mirado desde otro ángulo.

## 15. Notificaciones y Auditoría

**Notificaciones (Resend, canal único: email):**
- Confirmación de registro (verificación de email).
- Confirmación de compra / pago aprobado (incluye el código de confirmación de entrega, sección 07).
- Cambios de estado relevantes para el cliente: `ready_for_pickup`, `in_route`, `delivered`, `delivery_issue` ("no pudimos entregar tu pedido"), `returned_to_store` (con las dos opciones: reenviar con costo o retirar gratis).
- Fallos de pago.
- Newsletter: separado de las notificaciones transaccionales — el opt-in vive en `newsletter_subscribers`, no se mezcla con los emails operativos de pedidos.
- Cada envío se registra en `notifications_log` con estado `sent`/`failed` para poder diagnosticar entregabilidad.

**Auditoría (`audit_log`):**
- Se registra automáticamente (vía trigger de Postgres o wrapper en `lib/audit/log-action.ts` llamado desde cada Server Action sensible) en: cambios de precio, aplicación/creación de descuentos y cupones, edición/cancelación de pedidos, visualización de datos completos de cliente (RUT/dirección) por parte de `operaciones` o `admin`, creación de cuentas de staff, reembolsos, aprobación/rechazo de comprobantes de transferencia bancaria (`bank_transfer_reviewed`), y anonimización de cuenta de cliente (`account_anonymized`).
- Solo `admin` puede consultar `audit_log` (sección 09).

## 16. Restricciones, Reglas y Rate Limiting

Implementado con Upstash Redis (`@upstash/ratelimit`, sliding window) en Edge Middleware, por IP y/o por identidad autenticada según el endpoint.

| Endpoint | Límite | Ventana | Clave |
|---|---|---|---|
| `POST /auth/login` (cliente y staff) | 5 intentos | 15 min | IP + email combinados |
| `POST /auth/registro` | 10 intentos | 1 hora | IP |
| `POST /auth/recuperar-password` | 3 intentos | 1 hora | email |
| `POST /api/checkout/create-preference` | 20 requests | 1 min | user_id autenticado |
| `POST /api/coupons/apply` | 10 requests | 1 min | user_id autenticado |
| `GET /api/products`, `/tienda/**` (catálogo público) | 100 requests | 1 min | IP (con cache CDN delante para reducir carga real) |
| `POST /api/webhooks/mercadopago` | Sin límite por IP (viene de MP) | — | Se protege por validación de firma + idempotencia por `mp_payment_id`, no por rate limit |
| `/api/admin/**` (cualquier mutación) | 60 requests | 1 min | user_id staff |
| `/repartidor/**` (actualizar estado de entrega) | 30 requests | 1 min | user_id repartidor |
| `POST /api/repartidor/confirmar-codigo` | 5 intentos | por pedido (no por ventana de tiempo) | order_id + user_id repartidor — al 5º intento fallido, `delivery_code_locked = true` (ver sección 07); no se libera con el tiempo, requiere Operaciones/Admin |
| `POST /api/direcciones/geocodificar` | 10 requests | 1 min | user_id autenticado (evita abusar de la cuota gratuita diaria de OpenRouteService) |
| `POST /api/newsletter/suscribir` | 5 requests | 1 hora | IP (evita spam de suscripciones/bombing de emails ajenos) |
| `POST /api/webhooks/whatsapp` | Sin límite por IP (viene de Meta) | — | Se protege por validación de firma (`X-Hub-Signature-256`) + idempotencia por mensaje, no por rate limit |
| `POST /api/checkout/create-bank-transfer` | 10 requests | 1 hora | user_id autenticado (evita spamear el envío de mensajes de WhatsApp) |
| `POST /api/admin/bank-transfer/revisar` | 60 requests | 1 min | user_id staff (operaciones/admin) |

**Reglas adicionales:**
- Al superar el límite de login, la respuesta es `429` genérico (no revela si el email existe o no, para no facilitar enumeración de cuentas).
- El middleware aplica el rate limit **antes** de cualquier consulta a la base de datos, para minimizar carga en ataques de fuerza bruta.
- Los límites son configurables vía variables de entorno (no hardcodeados) para poder ajustarlos post-lanzamiento sin redeploy de lógica.

## 17. Fases de Construcción (Build Plan)

Cada fase incluye criterios de aceptación en formato EARS y un comando de verificación ejecutable.

### Fase 0 — Setup del proyecto
- Crear proyecto Next.js 15 + TypeScript + Tailwind; crear proyecto Supabase; configurar Vercel; extraer logo/colores del sitio de referencia (ver sección 20).
- **Aceptación:** CUANDO se ejecuta el build, EL SISTEMA DEBE compilar sin errores con las variables de entorno mínimas configuradas.
- **Verificar:** `npm run build`

### Fase 1 — Esquema de base de datos y RLS
- Migraciones SQL de la sección 05 (incluidas `stores`/`store_products` desde el inicio, aunque v1 opere con una sola sucursal activa), políticas RLS de la sección 10 para cada tabla.
- **Aceptación 1:** SI un usuario sin sesión intenta leer `orders` vía la API de Supabase, ENTONCES la respuesta DEBE ser una lista vacía (denegado por RLS), no un error 500.
- **Aceptación 2:** CUANDO existen dos sucursales de prueba con pedidos propios cada una, un `operaciones` de la sucursal A que consulta `orders` DEBE ver únicamente los pedidos con `store_id` igual al suyo, nunca los de la sucursal B.
- **Verificar:** script de test que consulta `orders` con un cliente anónimo de Supabase y confirma 0 filas devueltas pese a haber datos; test con dos sucursales y dos cuentas `operaciones` distintas confirma el aislamiento cruzado.

### Fase 2 — Autenticación
- Registro/login/logout de clientes (email+password, Google OAuth), verificación de email, recuperación de contraseña.
- Creación de cuentas de staff desde `admin` con `must_change_password`.
- **Aceptación:** CUANDO un usuario staff inicia sesión por primera vez, EL SISTEMA DEBE redirigir obligatoriamente a la pantalla de cambio de contraseña.
- **Verificar:** test E2E de login de un staff recién creado → confirma redirect a `/auth/cambiar-password` antes de llegar a `/admin`.

### Fase 3 — Catálogo (departamentos, categorías, colecciones, variantes, productos de evento)
- CRUD de departamentos/categorías en árbol, colecciones (incluidas las de evento con `starts_at`/`ends_at`), productos, subida de imágenes a Storage, grupos de opciones/variantes (`product_option_groups`/`product_option_values`), productos de edición limitada (`is_special_event`/`max_orders`).
- **Aceptación 1:** CUANDO `marketing` intenta modificar `stock_quantity` de un producto, EL SISTEMA DEBE rechazar la operación con 403.
- **Aceptación 2:** SI se intentan comprar más unidades de un producto `is_special_event` que las que permite `max_orders`, ENTONCES EL SISTEMA DEBE rechazar la compra excedente, incluso con requests concurrentes simultáneos.
- **Verificar:** test de integración llamando al Server Action de actualizar stock autenticado como `marketing`, confirma error 403; test de compras concurrentes de un producto de evento con cupo bajo confirma que nunca se supera `max_orders`.

### Fase 4 — Carrito, Envío y Checkout (Mercado Pago)
- Carrito client-side, geocodificación de direcciones (OpenRouteService), validación de radio de entrega y tarifa por tramo (`shipping_zones`), creación de preferencia MP, redirect a Checkout Pro, webhook de confirmación, tarjetas guardadas.
- **Aceptación 1:** CUANDO el webhook de MP recibe un payload con firma inválida, EL SISTEMA DEBE responder 401 y no debe crear ni modificar ningún registro en `payments` u `orders`.
- **Aceptación 2:** SI la distancia real de ruta entre `stores.origin_lat/lng` de la sucursal elegida y la dirección del cliente supera `max_delivery_radius_km` de esa sucursal, ENTONCES EL SISTEMA DEBE rechazar la creación de la preferencia de pago con `delivery_method = 'shipping'`, incluso si el request llega directo al Server Action sin pasar por la UI.
- **Aceptación 4:** SI el subtotal del carrito es menor que `stores.min_order_amount` de la sucursal elegida, ENTONCES EL SISTEMA DEBE bloquear el checkout hasta que se alcance el mínimo; SI el subtotal alcanza `stores.free_shipping_min_amount`, ENTONCES el costo de envío DEBE quedar en 0 sin importar el tramo de distancia.
- **Aceptación 3:** CUANDO la distancia está dentro del radio, EL SISTEMA DEBE aplicar el precio del tramo de `shipping_zones` que corresponda y guardar `delivery_distance_km` en el pedido.
- **Verificar:** test que envía un payload al webhook con firma manipulada y confirma que no hay side-effects; test que llama al Server Action de checkout con una dirección geocodificada fuera del radio y confirma el rechazo; test con una dirección dentro de cada tramo y confirma el precio correcto.

### Fase 5 — Pipeline de pedidos, SLA, seguimiento y notificaciones
- Los 13 estados del pipeline (sección 07), Vercel Cron Job que transiciona pedidos a `preparing` según `scheduled_at`/`ORDER_PREP_SLA_MINUTES`, flujo completo de envío (`driver_assigned` → `in_route` → `at_address` → `delivery_issue` → `returning_to_store` → `returned_to_store` con reapertura del mismo pedido), página de seguimiento pública (por `order_id` + validación de pertenencia, solo estado textual, sin mapa en vivo), emails transaccionales.
- **Aceptación 1:** CUANDO un pedido cambia a `in_route`, EL SISTEMA DEBE enviar un email al cliente y registrar el envío en `notifications_log`.
- **Aceptación 2:** CUANDO un pedido con `scheduled_at` definido llega a 30 minutos antes de esa hora, EL SISTEMA DEBE pasarlo automáticamente a `preparing` sin intervención manual.
- **Aceptación 3:** SI un repartidor marca `delivery_issue` y pasan `MAX_DELIVERY_ISSUE_WAIT_MINUTES` sin que el cliente confirme el código, ENTONCES EL SISTEMA DEBE permitir marcar `returning_to_store`; antes de ese tiempo, EL SISTEMA DEBE rechazar esa transición.
- **Verificar:** test que fuerza el cambio de estado a `in_route` y confirma un registro `sent` en `notifications_log`; test con un pedido `scheduled_at` próximo y confirma la transición automática vía el cron; test de `delivery_issue` con reloj simulado antes y después de los 10 minutos.

### Fase 6 — Panel Admin (módulos por rol, scoping por sucursal) y vista Repartidor
- Módulos diferenciados por rol según la tabla de la sección 09: Operaciones (pedidos, productos/stock, performance, asignación de repartidor — todo limitado a su `store_id`), Marketing (promociones, canje de puntos, CRM — todas las sucursales), Admin (todos los módulos, todas las sucursales, + gestión de usuarios + gestión de sucursales/radio/tramos de envío), Repartidor (solo `/repartidor`, limitado a su `store_id`, con confirmación de entrega por código).
- **Aceptación 0:** CUANDO un `operaciones` de la sucursal A intenta ver o modificar un pedido/stock de la sucursal B (por URL directa o manipulando el request), EL SISTEMA DEBE rechazarlo — el aislamiento por sucursal no depende solo de la UI.
- **Aceptación 1:** CUANDO un `repartidor` accede a `/repartidor`, EL SISTEMA DEBE mostrar únicamente pedidos donde `assigned_driver_id` sea su propio `user_id`, y CUALQUIER intento de acceder a otra ruta de `/admin/**` DEBE resultar en redirect o 403.
- **Aceptación 2:** SI un usuario Admin intenta crear un staff con `role = 'admin'` vía el formulario de "Gestión de usuarios" o llamando directamente al Server Action, ENTONCES EL SISTEMA DEBE rechazar la operación (el rol ni siquiera aparece como opción en el formulario, y el Server Action lo rechaza con 400 aunque se manipule el payload).
- **Aceptación 3:** CUANDO `marketing` intenta acceder a "Gestión de productos y Stock" o a "Gestión de pedidos", EL SISTEMA DEBE denegar el acceso — esos módulos no existen en su navegación ni son accesibles por URL directa.
- **Aceptación 4:** CUANDO un `repartidor` ingresa el código correcto para un pedido asignado a otro repartidor, EL SISTEMA DEBE rechazar la confirmación (la validación exige código correcto Y `assigned_driver_id` propio a la vez).
- **Aceptación 5:** DESPUÉS de 5 intentos fallidos de código en un mismo pedido, EL SISTEMA DEBE marcar `delivery_code_locked = true` y rechazar cualquier intento adicional del repartidor, incluso con el código correcto, hasta que Operaciones/Admin regenere el código o confirme manualmente.
- **Verificar:** test con dos repartidores y pedidos cruzados confirma aislamiento; test de intento de creación de un admin vía la API confirma rechazo (400); test de acceso directo por URL de `marketing` a rutas de productos/pedidos confirma 403; test de 6 intentos de código consecutivos (5 fallidos + 1 correcto) confirma que el sexto también es rechazado por bloqueo.

### Fase 7 — Ofertas, promociones, programa de puntos y auditoría
- CRUD de promociones/cupones, programa de puntos (acumulación automática al pagar, canje por descuento y por producto), aplicación en checkout, `audit_log` conectado a las acciones sensibles listadas en sección 15.
- **Aceptación 1:** CUANDO `admin` cambia el precio de un producto, EL SISTEMA DEBE crear una fila en `audit_log` con `before_data`/`after_data` y sin exponer campos redactados de más.
- **Aceptación 2:** CUANDO un pedido pasa a `status = 'paid'`, EL SISTEMA DEBE insertar una fila `earn_purchase` en `points_ledger` proporcional al monto pagado y actualizar `profiles.points_balance` de forma consistente (la suma del ledger debe igualar el balance cacheado).
- **Aceptación 3:** SI un cliente intenta canjear más puntos de los que tiene disponibles, ENTONCES EL SISTEMA DEBE rechazar el canje sin modificar `points_ledger` ni el pedido.
- **Verificar:** test que cambia un precio y consulta `audit_log`; test que paga un pedido y confirma la fila `earn_purchase` y el balance actualizado; test que intenta canjear puntos insuficientes y confirma rechazo sin side-effects.

### Fase 8 — Facturación electrónica SII
- Integración con el proveedor DTE elegido (sección 12/20), emisión automática post-pago, manejo de fallos.
- **Aceptación:** CUANDO un pedido pasa a `paid`, EL SISTEMA DEBE intentar emitir el DTE correspondiente y registrar el resultado en `invoices_dte`.
- **Verificar:** test contra el sandbox del proveedor DTE elegido.

### Fase 9 — Rate limiting y hardening final
- Implementación de todos los límites de la sección 16, revisión de la checklist de la sección 19.
- **Aceptación:** SI se realizan 6 intentos de login fallidos en 15 minutos para el mismo email, ENTONCES el sexto intento DEBE ser rechazado con 429 sin llegar a validar la contraseña.
- **Verificar:** script que dispara 6 intentos de login fallidos consecutivos y confirma el código 429 en el sexto.

### Fase 10 — Mi Cuenta, Landing y funcionalidades de marketing adicionales
- Módulo "Mi Cuenta" completo (direcciones, datos, historial de pedidos, repetir pedido con revalidación de stock/precio por sucursal, canjes y puntos), landing con banners/carrusel (`banners`), información de contacto desde `stores`, filtros de tienda (departamento/categoría, ofertas, evento especial), sincronización automática de Instagram (`instagram_integration` + Vercel Cron de renovación de token), formulario de newsletter (`newsletter_subscribers`), y aceptación versionada de T&C (`terms_acceptances`).
- **Aceptación 1:** CUANDO un cliente usa "Repetir pedido" y uno de los productos ya no está disponible, EL SISTEMA DEBE informarlo y permitir continuar con el resto del pedido, sin bloquear todo el repedido.
- **Aceptación 2:** CUANDO un cliente se suscribe al newsletter, EL SISTEMA DEBE exigir una acción explícita de opt-in (checkbox desmarcado por defecto) y registrar `consent_at`.
- **Aceptación 3:** SI el token de Instagram está a punto de expirar, EL SISTEMA DEBE intentar renovarlo automáticamente antes de la fecha de expiración y alertar a Admin si la renovación falla.
- **Verificar:** test de "Repetir pedido" con un producto descontinuado confirma que el resto del carrito se arma igual; test de suscripción a newsletter sin marcar el checkbox confirma que no se crea el registro; test simulando un token de Instagram próximo a expirar confirma el intento de renovación y la alerta en caso de fallo.

### Fase 11 — Carga masiva, lotes/vencimientos, cupones avanzados y analítica de clientes
- Carga masiva de productos con deduplicación (`product_imports`/`product_import_rows`), generación automática de SKU, deduplicación por nombre normalizado en productos/categorías/departamentos/colecciones, trazabilidad de lotes con FIFO (`product_batches`) y liquidación por lote, cupones a nivel de producto con tope de descuento y uso único configurable (`coupon_redemptions`), módulo de Análisis de Ofertas, y segmentación RFM (`customer_rfm_snapshot` + cron semanal).
- **Aceptación 1:** CUANDO se importa un archivo con dos filas del mismo producto base pero distinto valor de relleno, EL SISTEMA DEBE agregar ambos valores como opciones del mismo producto, no crear dos productos separados.
- **Aceptación 2:** SI se intenta crear una categoría cuyo nombre normalizado ya existe en el mismo departamento (aunque difiera en mayúsculas/tildes), ENTONCES EL SISTEMA DEBE rechazar la creación.
- **Aceptación 3:** CUANDO se vende un producto con dos lotes activos, EL SISTEMA DEBE descontar primero del lote con `expiration_date` más próxima (FIFO), abarcando el segundo lote solo si el primero no alcanza.
- **Aceptación 4:** SI un cupón tiene `single_use_per_customer = true` y un cliente ya tiene una fila en `coupon_redemptions` para ese cupón, ENTONCES EL SISTEMA DEBE rechazar un segundo canje del mismo cliente, sin afectar a otros cupones con el flag en `false`.
- **Verificar:** test de importación con variantes repetidas confirma una sola ficha de producto con dos valores de opción; test de creación de categoría duplicada (con tilde/mayúscula distinta) confirma el rechazo; test de venta con dos lotes de distinta fecha confirma el orden de consumo; test de cupón de uso único confirma el rechazo del segundo canje del mismo cliente.

### Fase 12 — Transferencia bancaria por WhatsApp, cumplimiento legal y observabilidad
- Integración con WhatsApp Business API (mensaje inicial automático, webhook de recepción de comprobante, cola de revisión manual en "Gestión de pedidos"), banner de consentimiento de cookies, flujo de baja/anonimización de cuenta, declaración de exención de retracto en T&C, Sentry configurado, y proyecto Supabase de `staging` separado de `production`.
- **Aceptación 1:** CUANDO un cliente elige transferencia bancaria, EL SISTEMA DEBE enviar automáticamente el mensaje de WhatsApp con los datos bancarios y el detalle del pedido, y crear el `bank_transfer_payments` correspondiente.
- **Aceptación 2:** SI el webhook de WhatsApp recibe un payload con firma inválida, EL SISTEMA DEBE responder 401 y no debe crear ni modificar ningún registro.
- **Aceptación 3:** CUANDO `operaciones` aprueba un comprobante, EL SISTEMA DEBE pasar el pedido a `paid`, disparar el mismo flujo posterior al pago que Mercado Pago (puntos, DTE, pipeline), y notificar al cliente por WhatsApp y por email.
- **Aceptación 4:** CUANDO un cliente solicita la baja de su cuenta y tiene pedidos asociados, EL SISTEMA DEBE anonimizar sus datos personales pero conservar `orders`/`invoices_dte` intactos, nunca borrar la fila.
- **Verificar:** test de creación de pedido por transferencia confirma el envío del mensaje y la fila `bank_transfer_payments`; test de firma inválida en el webhook de WhatsApp confirma 401 sin side-effects; test de aprobación de comprobante confirma el pedido `paid` y ambas notificaciones; test de baja de cuenta con pedidos existentes confirma la anonimización sin pérdida de `orders`.

## 18. Variables de Entorno y Secretos

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo server-side, jamás en cliente

# Mercado Pago
MP_ACCESS_TOKEN=                    # server-side
MP_WEBHOOK_SECRET=                  # para validar firma del webhook
NEXT_PUBLIC_MP_PUBLIC_KEY=          # sí es pública, usada por el SDK de checkout en el cliente

# Cifrado de campos sensibles (RUT)
FIELD_ENCRYPTION_KEY=               # 32 bytes, generada una sola vez, jamás rotada sin plan de re-cifrado

# Email
RESEND_API_KEY=

# Rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Programa de puntos
LOYALTY_POINTS_PER_CLP=0.001          # 1 punto por cada $1.000 CLP gastado en un pedido pagado
LOYALTY_POINTS_TO_CLP_RATE=10         # 100 puntos = $1.000 CLP de descuento (10 CLP por punto)

# Geocodificación y rutas (delivery)
ORS_API_KEY=                          # server-side; OpenRouteService — Geocoding (Pelias) + Directions, tier gratuito

# Pipeline de pedidos (SLA)
ORDER_PREP_SLA_MINUTES=30             # tiempo de preparación estándar, igual para todo el catálogo en v1
MAX_DELIVERY_ISSUE_WAIT_MINUTES=10    # minutos de espera antes de permitir "regresando a tienda"

# Cron jobs
CRON_SECRET=                          # Vercel Cron lo manda como Authorization: Bearer <valor> — rechaza cualquier otro caller

# Inventario y analítica
CLEARANCE_ALERT_DAYS_BEFORE_EXPIRY=3  # ventana en días para que un lote aparezca como candidato a liquidación
RFM_ANALYSIS_WINDOW_DAYS=365           # ventana de historial que considera el cálculo de frequency/monetary

# Instagram (landing)
INSTAGRAM_ACCESS_TOKEN=               # server-side; se guarda cifrado en instagram_integration, no se reutiliza en texto plano
INSTAGRAM_BUSINESS_ACCOUNT_ID=

# Proveedor DTE (SII) — nombres exactos dependen del proveedor elegido, ver sección 20
DTE_PROVIDER_API_KEY=

# WhatsApp Business API (solo transferencia bancaria, sección 07)
WHATSAPP_ACCESS_TOKEN=                # server-side; se guarda cifrado en whatsapp_integration
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=        # token de verificación del webhook (requerido por Meta)
BANK_TRANSFER_PROOF_TIMEOUT_HOURS=48  # tras este plazo sin comprobante, el pedido se cancela solo

# Observabilidad
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

Todas viven en Vercel Environment Variables, con `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `FIELD_ENCRYPTION_KEY` y `DTE_PROVIDER_API_KEY` marcadas como "Sensitive" (ocultas tras guardarse) y jamás prefijadas con `NEXT_PUBLIC_`.

## 19. Checklist de Seguridad Pre-Lanzamiento

- [ ] RLS habilitado y probado en **todas** las tablas (deny-by-default confirmado con un cliente anónimo).
- [ ] Ningún endpoint de mutación confía solo en el middleware — cada Server Action revalida rol.
- [ ] Webhook de Mercado Pago valida firma y es idempotente por `mp_payment_id`.
- [ ] No existe ninguna ruta que devuelva número de tarjeta, CVV o RUT en texto plano en una respuesta HTTP.
- [ ] `FIELD_ENCRYPTION_KEY` generada, almacenada solo en Vercel, con backup seguro fuera del repositorio.
- [ ] Rate limiting activo y probado en login, registro, checkout y aplicación de cupones.
- [ ] `audit_log` capturando las 6 acciones sensibles listadas en sección 15, sin filtrar valores sensibles en `before_data`/`after_data`.
- [ ] Cuentas de staff no pueden autoregistrarse (verificar que no existe ruta pública que asigne rol distinto de `customer`).
- [ ] Emails transaccionales probados (confirmación, cambio de estado, fallo de pago) en modo sandbox de Resend.
- [ ] Proveedor DTE probado en modo sandbox antes de emitir el primer documento real.
- [ ] Revisión de que ninguna clave sensible quedó commiteada en el repositorio (`git log -p | grep` de patrones de API key).
- [ ] Validación de radio de entrega y tarifa por distancia probada tanto en el cliente como, de forma independiente, forzando un request directo al Server Action de checkout con una dirección fuera de rango (debe rechazarse igual).
- [ ] Confirmación de entrega probada con código incorrecto 5 veces seguidas — el 6º intento debe estar bloqueado (`delivery_code_locked = true`) y no debe validar aunque el código sea correcto, hasta que Operaciones/Admin intervenga.
- [ ] Cuota gratuita diaria de OpenRouteService (2000 requests/día) monitoreada — si el volumen la supera, migrar a un tier pago o a Google Maps Platform vía la interfaz aislada de `lib/geo/`.
- [ ] Job de renovación del token de Instagram probado antes de que el token real expire (~60 días) — con alerta a Admin si la renovación automática falla.
- [ ] Edición de un pedido pagado (agregar/quitar/sustituir productos) probada con recálculo correcto de `total` y su cobro/reembolso asociado en Mercado Pago, verificando que quede en `audit_log` y `order_status_history`.
- [ ] Cupo de productos de edición limitada (`max_orders`/`special_orders_count`) probado con compras concurrentes — no debe permitir vender más unidades que el cupo definido.
- [ ] Opt-in de newsletter y aceptación de T&C probados: ninguno se activa sin una acción explícita del usuario, y ambos quedan con fecha (y versión, en el caso de T&C) registrada.
- [ ] Aislamiento entre sucursales probado con al menos 2 sucursales de prueba: `operaciones`/`repartidor` de una sucursal no pueden ver ni modificar pedidos, stock o asignaciones de otra, ni por RLS ni por Server Action.
- [ ] Webhook de WhatsApp valida firma (`X-Hub-Signature-256`) y es idempotente por mensaje, igual que el webhook de Mercado Pago.
- [ ] Pedido por transferencia sin comprobante recibido tras `BANK_TRANSFER_PROOF_TIMEOUT_HOURS` se cancela automáticamente y libera cualquier estado pendiente.
- [ ] Banner de cookies probado: ninguna cookie de analítica/marketing se carga antes del consentimiento explícito de esa categoría.
- [ ] Flujo de baja de cuenta probado: anonimiza PII pero conserva `orders`/`invoices_dte` intactos para retención legal — nunca borra físicamente un cliente con pedidos asociados.
- [ ] T&C incluyen la declaración de exención del derecho a retracto (SERNAC) para productos perecibles/hechos a pedido.
- [ ] Sentry capturando errores en producción, con alertas configuradas para fallos en webhooks (MP y WhatsApp) y en los Vercel Cron Jobs.
- [ ] Migraciones probadas primero en el proyecto Supabase de `staging` antes de aplicarse a `production`.

## 20. Supuestos y Puntos Abiertos

Estos puntos se asumieron para poder avanzar, pero deben confirmarse con el cliente antes o durante la Fase 0:

1. **Colores institucionales y logo — RESUELTO:** extraídos directamente del código fuente del sitio de referencia (`docs/legacy-reference/branding/`). Tema premium negro + dorado:
   - Fondo `#0B0B0B` · Texto/crema `#F5F5DC`
   - Dorado principal `#D4AF37` · Dorado hover `#E6CCA8` · Dorado oscuro `#A3835B`
   - Onyx (superficies) `#161616` · Borde glass `rgba(255,255,255,0.08)` · Glass fill `rgba(22,22,22,0.7)`
   - Logo en `docs/legacy-reference/branding/logo.png`, imagen de tienda en `storefront.jpg`.
1b. **Catálogo legado como datos semilla:** `docs/legacy-reference/catalog/catalog_pedidosya_import.csv` (26 productos reales con foto, en `docs/legacy-reference/catalog/images/`) sirve como caso de prueba real para la carga masiva (sección 13) — incluye un ejemplo real de `new_variant` (Profiteroles PAS-005-A/B, mismo producto con dos coberturas distintas). El CSV usa departamentos `Pastelería`, `Desayuno`, `Panadería`, `Hojaldrados` (no `Cafetería`) — ajustar la lista de `departments` de la Fase 1 a la realidad del negocio en vez de a los ejemplos genéricos usados en este documento.
2. **Proveedor de facturación electrónica (SII):** se recomienda evaluar Haulmer/OpenFactura, Bsale o Simple API, pero la elección final y la contratación es una decisión de negocio del cliente, no técnica — bloquea la Fase 8.
3. **Un solo rol por staff:** si en el futuro una persona necesita, por ejemplo, ser `marketing` y `operaciones` a la vez, el modelo actual (`profiles.role` como columna única) requeriría migrar a una tabla `user_roles` many-to-many. Se documenta como decisión consciente de simplicidad para v1.
4. **Tasa de acumulación y conversión de puntos:** se asume 1 punto por cada $1.000 CLP gastado y una tasa de conversión de descuento de 100 puntos = $1.000 CLP (ambas configurables vía variables de entorno, sección 18, sin requerir cambios de esquema). Confirmar con el cliente la tasa exacta antes de la Fase 7.
5. **RUT opcional en boleta:** se asume que, si el cliente no entrega RUT, se emite boleta electrónica con RUT genérico "66666666-6" (práctica común y válida en Chile para boletas, no para facturas). Si el negocio emitirá facturas a empresas, el RUT del receptor pasa a ser obligatorio en ese flujo.
6. **2FA:** explícitamente fuera de v1 por decisión del cliente. El esquema (Supabase Auth con soporte nativo de MFA) permite activarlo después sin romper nada existente.
7. **Tramos de envío por defecto:** se documentan como ejemplo en la sección 07 (0-3km, 3-6km, 6-8km) pero los montos exactos y la cantidad de tramos los define el cliente antes de la Fase 4 — el modelo (`shipping_zones`) ya soporta agregar o modificar tramos libremente.
8. **Coordenadas de origen de la panadería:** `stores.origin_lat/origin_lng` de la sucursal inicial se debe cargar con la ubicación real del local antes de poder probar la validación de radio — dato pendiente de confirmar con el cliente.
9. **Rollout multi-sucursal:** v1 se construye con el modelo `stores`/`store_products` completo desde la Fase 0, pero se lanza con **una sola** fila activa en `stores` — agregar la segunda sucursal más adelante es solo cargar datos (fila nueva + sus `shipping_zones`), sin cambios de código.
10. **Montos de mínimo de compra y envío gratis:** quedan como campos configurables por sucursal (`stores.min_order_amount`, `stores.free_shipping_min_amount`); los montos exactos los define el cliente antes de la Fase 4.
11. **Venta por mayor (B2B):** queda explícitamente **fuera de este proyecto** — el cliente indicó que se resuelve con una solución separada (catálogo acotado, validación de nivel de endeudamiento, aprobación manual de cuentas por un administrador distinto). No se integra con este e-commerce B2C ni comparte base de datos con él.
12. **Blog:** fuera de alcance de v1, evaluable como fase futura.
13. **SLA de preparación:** se confirmó un valor fijo (`ORDER_PREP_SLA_MINUTES = 30`) para todo el catálogo en v1, sin diferenciar por producto/categoría — si más adelante un producto necesita mucho más tiempo (ej. una torta grande), este supuesto habría que revisarlo.
14. **Cuenta de Instagram Business:** la integración automática (sección 13) requiere que el cliente tenga (o cree) una cuenta de Instagram Business/Creator vinculada a una página de Meta Business **antes** de la Fase 10 — sin eso no se puede generar el token de acceso inicial.
15. **Reenvío tras devolución a tienda:** se confirmó que se reabre el **mismo pedido** (no se crea uno nuevo) cuando el cliente paga el costo adicional de un segundo intento de envío.
16. **RFM sin automatización:** confirmado que el módulo de Performance de Clientes es solo dashboard/etiquetado — no dispara campañas de email automáticas por segmento. Si más adelante se quiere automatizar (ej. email automático a clientes "Perdido"), es una fase nueva que requeriría plantillas de campaña y un motor de envío masivo, no solo el transaccional de Resend.
17. **Trazabilidad de lotes:** confirmado que se necesita el modelo completo de `product_batches` (no una fecha simple por producto) para poder diferenciar lote nuevo vs. lote próximo a vencer y evitar liquidar más cantidad de la que realmente está por vencer.
18. **Variantes en carga masiva:** confirmado que el importador debe reconocer filas repetidas del mismo producto base con distinto valor de opción (relleno/cobertura) y agregarlas como `product_option_values` de una sola ficha, no crear productos duplicados — la excepción sigue siendo Salado/Dulce u otras distinciones ya definidas como productos separados.
19. **Cuenta de WhatsApp Business:** igual que Instagram, la integración requiere que el cliente tenga (o cree) una cuenta de WhatsApp Business verificada vía Meta Business **antes** de la Fase 12 — sin eso no se puede enviar el mensaje inicial ni recibir comprobantes.
20. **Contenido legal (T&C, retracto, cookies):** la redacción exacta de la exención de retracto SERNAC y de la política de cookies es contenido legal que el cliente debe definir (idealmente con asesoría legal) antes del lanzamiento — el blueprint deja el mecanismo técnico listo (`terms_acceptances` versionado, `cookie_consents`), pero no redacta el texto legal por él.
21. **Cuenta de Sentry:** se asume que el cliente crea una cuenta (el plan gratuito alcanza para v1) antes de la Fase 12; el DSN se configura como variable de entorno.
22. **Retención de backups:** Supabase ofrece point-in-time recovery según el plan contratado — el plan exacto (y por lo tanto cuántos días de retención de backup se tienen) es una decisión de negocio/costo del cliente, no técnica, a confirmar antes de la Fase 0.
