# Pan de Rey V2 — Admin Redesign — Blueprint

> Change slug: `admin-redesign`
> Shape: brownfield UI migration + 1 tabla aditiva
> Runtime track: Next.js 16.3.0 / React 19.2.8 / TypeScript 5 (del lockfile del repo, sin cambios)
> Emission mode: bundle (13 pasos → bundle, umbral 12+)
> Blueprint version: 2 (revisado tras FAIL de blueprint-validator v1)
> Versions last verified: 2026-08-18 — ver §11, sin pines nuevos (cero dependencias nuevas)

---

## 1. Project Overview & Non-Goals

### Vision
Adecuar el panel de administración real de Pan de Rey (panadería con tienda online, Next.js + Supabase) al rediseño ya aprobado en una maqueta HTML estática: menú en acordeón, Pedidos con selección múltiple y stepper, Clientes y Promociones unificados con pestañas, y un portal nuevo de Repartidor con chat de incidencia. Es visual y de organización de información — no cambia qué hace el negocio, cambia cómo el equipo lo opera día a día.

### Usuarios
| Persona | Qué viene a hacer | Frecuencia |
|---|---|---|
| Admin/Operaciones | Gestionar pedidos, catálogo, stock, promociones | Varias veces al día |
| Marketing | CRM, cupones, banners, reseñas | Diaria |
| Repartidor | Ver pedidos asignados, actualizar estado de entrega, resolver incidencias con la tienda | Durante cada turno de reparto |

### Goals — v1 scope
1. El admin tiene un menú lateral organizado en grupos colapsables (solo 2 abiertos por defecto).
2. Pedidos soporta selección múltiple, acciones masivas, detalle expandible, stepper visual y Kanban real.
3. Clientes y Promociones dejan de estar duplicados en pantallas separadas — cada uno vive en una vista con pestañas.
4. Existe un portal de Repartidor con estados de entrega, código de confirmación, y un chat con la tienda durante una incidencia con countdown de espera.
5. El alta de cuentas de Repartidor es una pantalla separada de Usuarios.

### Non-Goals — explicitamente fuera de alcance para v1

| No se construye | Por qué no ahora | Revisar cuando |
|---|---|---|
| Nuevos valores en el enum `orders.status` | El track visual de 4 pasos del repartidor se deriva de estados ya existentes (`ready`→`driver_assigned`→`in_route`→`at_address`), sin necesidad de tocar el enum | El negocio necesite reportar tiempos separados de "en tienda esperando repartidor" con precisión propia |
| Drag & drop en el Kanban de Pedidos | No existe hoy en `KanbanBoard.tsx`; la maqueta lo deja igual a propósito | Un repartidor/operador pida reordenar pedidos visualmente entre columnas |
| Server Action "bulk" nueva para acciones masivas | Las acciones unitarias ya existentes (`markInRoute`, etc.) cubren la validación necesaria; llamarlas N veces evita duplicar lógica | El volumen de pedidos por acción masiva vuelva lenta la ejecución secuencial |
| Supabase Realtime para el chat de incidencia | El proyecto no usa Realtime en ningún otro lugar (ni el Vigía de impresión, que también podría beneficiarse); se mantiene consistencia con el patrón de polling existente | El negocio reporte que 15-20s de latencia es inaceptable para coordinar una entrega en curso |
| Reenvío pagado como feature nueva | **Ya existe end-to-end** (`orders.status='returned_to_store'`, `src/lib/checkout/actions.ts:809+`) — este blueprint solo verifica que el botón de la maqueta llame a la acción real | Nunca — es trabajo ya hecho, no una omisión |
| Cambios al storefront público, checkout, Mercado Pago o webhooks | Fuera del alcance de un rediseño de admin | Si el negocio pide una feature de tienda relacionada |
| Pipeline de CI nuevo | El repo no tiene `.github/workflows` hoy; agregar uno es una decisión de infraestructura aparte de este rediseño | Si el equipo decide adoptar CI como iniciativa propia |

**El builder no debe implementar nada de esta tabla**, aunque parezca una adición chica mientras trabaja en un paso adyacente.

### Success metrics
| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Paridad funcional | 0 regresiones reportadas en los módulos migrados durante la primera semana de uso real | Reporte manual del equipo operativo (no hay analítica de producto en este proyecto) |
| Build verde | `npm run build` sale 0 en cada paso del build order | Comando ejecutado en cada Checkpoint |
| RLS de la tabla nueva | 0 filas visibles entre pedidos de distinto repartidor en la prueba manual | Consulta SQL con 2 cuentas repartidor de prueba |

### Current state (Repo Map)

| Eje | Detalle |
|---|---|
| Runtime | Next.js 16.3.0 (App Router), React 19.2.8, TypeScript 5, Node nativo de Next |
| Estilos | Tailwind CSS v4 + tokens propios en `src/app/globals.css` (dark-first, acento `--color-gold` #D4AF37) |
| Datos | Supabase Postgres — 37 migraciones en `supabase/migrations/`, RLS habilitado en todas las tablas de `public` |
| Auth/RBAC | `@supabase/ssr`, roles `customer/admin/marketing/operaciones/repartidor` (`src/lib/auth/rbac.ts` + `requireRole`) |
| Server Actions | `"use server"` en `src/lib/**/actions.ts`, `requireRole` como primera línea + RLS como segunda capa |
| Admin | `src/app/admin/**`, nav en `src/components/admin/AdminNav.tsx` |
| Componentes admin ya construidos | `KanbanBoard.tsx`, `ProductDrawer.tsx` + `DrawerSection.tsx` (4 secciones acordeón YA existen), `DashboardCharts.tsx`, `ProductosTable.tsx`, `PedidosTable.tsx`, `AdminOrderRow.tsx` |
| Repartidor | Portal separado `src/app/repartidor/` con `OrderCard.tsx` — acciones reales: `markInRoute`, `markAtAddress`, `markDeliveryIssue`, `confirmDeliveryCode`, `markReturningToStore` |
| Lint | `eslint.config.mjs` (eslint-config-next core-web-vitals + typescript) |
| Test runner | **Ninguno configurado** — no hay `test` script, no hay Vitest/Jest instalado |
| Build | `next build` |
| CI | No hay `.github/workflows` en este repo |
| Deploy | Vercel (por convención del proyecto) |

Convenciones a respetar: Server Actions siempre con `requireRole` explícito; comentarios solo donde hay una decisión no obvia; componentes de admin en `src/components/admin/`; colores de estado semánticos centralizados en `PIPELINE_GROUPS`; el drawer de producto nunca navega de página.

### Target state
El admin visual queda alineado a la maqueta aprobada sin cambiar ninguna relación de datos existente. Ver el detalle por módulo en §3-§6.

---

## 2. Tech Stack

**Runtime track: el ya instalado en el repo — no se propone ningún cambio de versión.** Este cambio no agrega dependencias nuevas a `package.json`; toda la tabla es el estado actual, confirmado contra `package.json`/`package-lock.json` del repo (no investigado vía `stack-researcher` porque no se pinea nada nuevo).

| Capa | Elección | Por qué esta, sobre qué |
|---|---|---|
| Lenguaje / runtime | TypeScript 5 sobre Node (Next nativo) | Ya establecido en el repo, sin motivo para cambiar en un rediseño de UI |
| Framework | Next.js 16.3.0 (App Router) | Ya establecido — Server Components + Server Actions es el patrón que todo el admin usa hoy |
| Estilos | Tailwind CSS v4 | Ya establecido, tokens propios en `globals.css` |
| Componente layer | React Server/Client Components nativos, sin librería de UI adicional | El proyecto no usa shadcn/Radix en el admin (sí `shadcn` como devDependency para MCP de diseño, no como runtime de componentes) — se mantiene consistencia |
| Base de datos | Supabase Postgres | Ya establecido, RLS como mecanismo de aislamiento |
| ORM / acceso a datos | Supabase JS client (`@supabase/ssr`, `@supabase/supabase-js`) sin ORM | Ya establecido — Server Actions consultan directo vía el cliente tipado |
| Auth | Supabase Auth + RBAC propio (`requireRole`) | Ya establecido |
| Trabajo en background | Polling simple (`setInterval`/`useEffect`), sin colas | Ya es el patrón del Vigía de impresión; se replica para el chat de incidencia (§8, §9.1) |
| Pagos | Mercado Pago (`mercadopago` SDK) | Sin cambios — fuera de alcance de este blueprint |
| Almacenamiento de archivos | Supabase Storage (`product-images`, `banners`) | Sin cambios |
| Email / notificaciones | Resend + `notifications_log` | Sin cambios |
| Hosting | Vercel | Sin cambios |
| Gestor de paquetes | npm (lockfile `package-lock.json`) | Ya establecido |

### Compatibility check
No aplica una verificación contra `knowledge/stack-compatibility.md` porque no se introduce ninguna combinación nueva de tecnologías — todo el trabajo usa exactamente el stack ya en producción.

---

## 3. Directory Structure

```
src/components/admin/
  AdminNav.tsx                      # [MODIFICADO] acordeón colapsable por grupo
  AdminNavGroup.tsx                 # [NUEVO] subcomponente de grupo colapsable
  ClientesTabs.tsx                  # [NUEVO, opcional] wrapper visual de pestañas (o inline en page.tsx)
  PedidosTable.tsx                  # [MODIFICADO] selección múltiple, barra de acciones masivas
  OrderRowDetail.tsx                # [NUEVO] fila expandible con líneas de pedido
  OrderStepper.tsx                  # [NUEVO] stepper visual de 4/5 pasos
  ProductosTable.tsx                # [MODIFICADO] filtro "sin fotos", copiar SKU, toggle inline
  ProductKpiRow.tsx                 # [NUEVO] 4 KPIs de cabecera de Productos

src/app/admin/
  clientes/page.tsx                 # [MODIFICADO] orquesta por ?tab=
  clientes/SegmentosPanel.tsx       # [NUEVO] extraído de la vista RFM actual
  clientes/RankingPanel.tsx         # [NUEVO] extraído de la vista Mejores clientes actual
  promociones/page.tsx              # [MODIFICADO] orquesta por ?tab=
  promociones/RendimientoPanel.tsx  # [NUEVO] reutiliza queries de analisis-ofertas
  analisis-ofertas/page.tsx         # [MODIFICADO → luego eliminado en epic 07] redirige a /admin/promociones?tab=rendimiento
  configuracion/repartidores/page.tsx        # [NUEVO] alta de repartidores
  configuracion/repartidores/RepartidorForm.tsx  # [NUEVO]

src/app/repartidor/
  page.tsx                          # [MODIFICADO] agrega acceso al panel de chat
  IssueChatPanel.tsx                # [NUEVO] chat + countdown, cliente

src/lib/delivery-chat/
  actions.ts                        # [NUEVO] sendDeliveryMessage, listDeliveryMessages
  types.ts                          # [NUEVO]

supabase/migrations/
  {timestamp}_order_delivery_messages.sql   # [NUEVO] — nombre real generado por `supabase migration new order_delivery_messages` al momento de correrlo, prefijo de fecha no fijado por este blueprint

blueprints/admin-redesign/          # [NUEVO] este bundle
```

**Reglas de límite**
- Nada en `src/app/admin/**` importa directamente de otra sección de admin salvo componentes compartidos en `src/components/admin/`.
- `src/lib/delivery-chat/actions.ts` es el único lugar que escribe en `order_delivery_messages` (mismo principio que "un solo lugar escribe cada tabla" ya vigente en el resto del proyecto, ej. `sync_points_balance`).

No aplica una convención de resolución de módulos nueva — se usa el alias `@/*` ya configurado en `tsconfig.json`, sin cambios.

**Origen de cada archivo de este árbol**: cada archivo `[NUEVO]`/`[MODIFICADO]` aparece nombrado en el paso de §9 que lo crea/edita, y en el `files` array de la tarea correspondiente en `tasks.json`. No hay archivos de configuración verify-critical adicionales a los ya existentes (`eslint.config.mjs`, `tsconfig.json`) — ver §19.6.

---

## 4. Data Model

### Entidades

**`order_delivery_messages`** — un mensaje de chat entre un repartidor y la tienda durante una incidencia de entrega de un pedido específico.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `order_id` | uuid | not null, FK → `orders(id)` | pedido al que pertenece el hilo |
| `sender_role` | text | not null, check in ('repartidor','tienda') | quién envió, no el rol de Supabase (staff puede ser admin u operaciones) |
| `sender_id` | uuid | not null, FK → `profiles(id)` | usuario real que envió |
| `message` | text | not null, check `char_length(message) between 1 and 500` | contenido; rechazado si son solo 6 dígitos (posible código de entrega filtrado) |
| `created_at` | timestamptz | not null, default `now()` | |

**Ninguna otra tabla se modifica.** En particular, `orders` no gana columnas nuevas.

### Relaciones
`orders` —(1)→(N)— `order_delivery_messages`, `on delete cascade` (si un pedido se borra, su hilo de chat se borra con él — mismo criterio que `order_status_history`).

### Índices
| Tabla | Índice | Por qué |
|---|---|---|
| `order_delivery_messages` | `(order_id, created_at)` | listar el hilo de un pedido ordenado cronológicamente, la única query que existe sobre esta tabla |

### Schema
```sql
create table order_delivery_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sender_role text not null check (sender_role in ('repartidor','tienda')),
  sender_id uuid not null references profiles(id),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index on order_delivery_messages(order_id, created_at);

alter table order_delivery_messages enable row level security;

create policy repartidor_select_own_delivery_messages
  on order_delivery_messages for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and o.assigned_driver_id = auth.uid()
    )
  );

create policy repartidor_insert_own_delivery_messages
  on order_delivery_messages for insert
  with check (
    sender_role = 'repartidor'
    and sender_id = auth.uid()
    and exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and o.assigned_driver_id = auth.uid()
    )
  );

create policy staff_select_delivery_messages
  on order_delivery_messages for select
  using (
    current_app_role() in ('admin','operaciones')
    and exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and (current_app_role() = 'admin' or o.store_id = current_store_id())
    )
  );

create policy staff_insert_delivery_messages
  on order_delivery_messages for insert
  with check (
    sender_role = 'tienda'
    and sender_id = auth.uid()
    and current_app_role() in ('admin','operaciones')
    and exists (
      select 1 from orders o
      where o.id = order_delivery_messages.order_id
        and (current_app_role() = 'admin' or o.store_id = current_store_id())
    )
  );
```

Este SQL reutiliza `current_app_role()` y `current_store_id()`, funciones SECURITY DEFINER ya existentes en el proyecto — sin funciones nuevas.

### Migraciones
Herramienta: Supabase CLI, convención de nombre `YYYYMMDDHHMMSS_slug.sql` (misma que las 37 migraciones existentes). Correr `supabase migration new order_delivery_messages`, pegar el SQL de arriba, aplicar primero contra una rama/branch de desarrollo (`supabase db push` apuntando a esa rama), nunca directo a producción. Regla del repo (implícita en el resto de migraciones aditivas): nunca una migración destructiva en el mismo deploy que el código que la consume.

### Datos semilla
No aplica — no se requiere ninguna fila de ejemplo para que `order_delivery_messages` sea usable; se puebla orgánicamente cuando ocurre una incidencia real.

---

## 5. API Design (Server Actions — este proyecto no expone una API REST propia)

### Convenciones
- No hay rutas `/api/v1/*` de aplicación — el patrón del proyecto es Server Actions (`"use server"`) llamadas directo desde Server/Client Components, más un puñado de route handlers técnicos (`/api/webhooks/mercadopago`, `/api/cron/*`) que este blueprint no toca.
- Envelope de error: cada Server Action devuelve `{ error: string } | { success: string, ... }` (patrón ya usado por `OrderActionState`/`ConfirmCodeState` en `src/lib/orders/actions.ts`) — las Server Actions nuevas siguen el mismo shape.
- Validación: inline en cada Server Action con `requireRole` + chequeos de pertenencia (ej. `assigned_driver_id = auth.uid()`), sin librería de validación adicional (consistente con el resto del proyecto).
- Rate limiting: no aplica a las Server Actions nuevas — el proyecto usa Upstash solo para geocodificación y checkout, un chat de baja frecuencia no lo necesita.

### Server Actions — delta

| Acción | Descripción | Auth | Archivo |
|---|---|---|---|
| `sendDeliveryMessage(orderId, message)` | Inserta un mensaje en el hilo de un pedido | repartidor (dueño) o admin/operaciones (de la sucursal del pedido) | `src/lib/delivery-chat/actions.ts` |
| `listDeliveryMessages(orderId)` | Lista el hilo de un pedido ordenado por fecha | mismo control de acceso, vía RLS + `requireRole` | `src/lib/delivery-chat/actions.ts` |

### Detalle — `sendDeliveryMessage`
- Request: `orderId: string`, `message: string` (1-500 caracteres).
- Response: `{ success: true, message: { id, sender_role, message, created_at } } | { error: string }`.
- Validaciones: `requireRole(["repartidor","admin","operaciones"])`; si `repartidor`, verificar `assigned_driver_id = session.id` antes de insertar; rechazar si `message` son solo dígitos y tiene longitud 6 (posible código de entrega).
- Efectos secundarios: ninguno además del insert (no dispara notificación — el chat se lee por polling, no por push, consistente con §2 Non-Goals).

### Interfaces held constant
- `markInRoute`, `markAtAddress`, `markDeliveryIssue`, `markReturningToStore`, `confirmDeliveryCode` (`src/lib/orders/actions.ts`) — firmas sin cambios.
- Server Action de creación de usuario en Configuración → Usuarios — firma sin cambios, solo se le pasa `role: "repartidor"` desde la pantalla nueva.
- `updateSystemSettings` — sin cambios.

---

## 6. Frontend Architecture

### Rutas — delta
| Ruta | Página | Fuente de datos | Auth |
|---|---|---|---|
| `/admin/clientes?tab=lista\|segmentos\|ranking` | `clientes/page.tsx` (modificada) | Server Component, mismas queries que hoy, condicional por tab | `admin`, `marketing` |
| `/admin/promociones?tab=activos\|rendimiento` | `promociones/page.tsx` (modificada) | Server Component, reutiliza queries de `analisis-ofertas/page.tsx` para el tab rendimiento | `admin`, `marketing` |
| `/admin/analisis-ofertas` | redirige a `/admin/promociones?tab=rendimiento` | — | — |
| `/admin/configuracion/repartidores` | nueva página | Server Component, reutiliza Server Action de alta de usuario | `admin` |
| `/admin/pedidos` | sin cambio de ruta, gana selección múltiple + Kanban conectado | igual que hoy | `admin`, `operaciones` |
| `/repartidor` | gana panel de chat | igual que hoy + `listDeliveryMessages` | `repartidor` |

### Estrategia de renderizado
Todas las páginas de admin siguen siendo Server Components por defecto (patrón ya establecido) con islas cliente (`"use client"`) solo donde hay estado interactivo: selección múltiple de Pedidos, tabs (o vía `?tab=` server-driven, sin JS), chat, countdown. No se introduce ningún directive nuevo de caché — el admin no usa ISR, siempre `dynamic` (datos en vivo), sin cambios.

### Jerarquía de componentes (Pedidos, la pieza más grande)
```
app/admin/pedidos/page.tsx (Server)
  └─ PedidosTableClient (Client, NUEVO wrapper de selección)
       ├─ PedidosTable.tsx (existente, modificado)
       │    └─ AdminOrderRow.tsx (existente, modificado)
       │         ├─ OrderStepper.tsx (NUEVO, presentacional)
       │         └─ OrderRowDetail.tsx (NUEVO)
       └─ KanbanBoard.tsx (existente, SIN modificar)
```

### Manejo de estado
- Selección múltiple: `useState<Set<string>>` en un wrapper cliente nuevo — estado efímero, no persiste entre recargas (igual que el resto del admin).
- Tabs (Clientes/Promociones): estado en la URL (`?tab=`), server-driven — consistente con cómo Pedidos ya usa `?grupo=`/`?vista=` hoy. No se agrega una librería de tabs de cliente.
- Countdown del chat: `useState` + `setInterval` derivado de `delivery_issue_at` (timestamp del servidor) + `max_delivery_issue_wait_minutes` — cálculo puro en cliente, sin estado global.

### Estados de carga, vacío y error
- Chat sin mensajes: "Sin mensajes todavía — escribile a la tienda si el cliente no responde."
- Lista de repartidores vacía en la pantalla nueva: "Todavía no hay repartidores — crea el primero arriba."
- Falla al enviar un mensaje: mismo patrón que `OrderActionState.error` (texto rojo bajo el formulario, ya usado en `OrderCard.tsx`).

---

## 7. Design System

Ya auditado con `ui-ux-pro-max` en la fase de diseño previa a este blueprint (no se repite el proceso de descubrimiento — el sistema visual **ya existe** en el repo y este cambio lo respeta, no lo redefine).

### Colores (tokens reales del repo, `src/app/globals.css`)
| Token | Valor | Uso |
|---|---|---|
| `--background` | `#0B0B0B` | fondo de página (dark-first, sin modo claro en el admin) |
| `--background-alt` | `#161616` | paneles, sidebar |
| `--foreground` | `#F5F1E6` | texto principal |
| `--foreground-muted` | `#B2A996` | texto secundario |
| `--color-gold` | `#D4AF37` | foco, CTA primario, estado activo — **nunca** color semántico de estado |
| `--color-gold-hover` | `#E6CCA8` | hover de acentos dorados |

**Contraste**: no se re-verifica — son los mismos tokens en producción hoy, sin cambios.

### Colores semánticos de estado (ya existentes, `PIPELINE_GROUPS`/`COLUMN_COLORS`)
Amarillo (`pago_pendiente`), azul (`por_preparar`), índigo (`listos`), violeta (`en_camino`), naranja (`problemas`), verde (`entregados`), rojo (`cancelados`) — el stepper y el chat de incidencia reutilizan estos mismos colores, no introducen una paleta nueva.

### Tipografía
Sin cambios — la fuente y escala tipográfica del admin ya están definidas en `globals.css`, este blueprint no las toca.

### Espaciado, radio, elevación
Sin cambios — se reutiliza la escala de espaciado y radios ya en uso en `KanbanBoard.tsx`/`ProductDrawer.tsx` para los componentes nuevos (`OrderStepper`, `IssueChatPanel`), por consistencia visual.

### Movimiento
El acordeón del sidebar y el panel de chat usan transiciones CSS simples (150-200ms, igual que `ProductDrawer.tsx` ya hace con su `transition-transform duration-200`), respetando `prefers-reduced-motion` si el proyecto ya lo maneja globalmente (no se audita este punto específico en este blueprint — fuera de alcance, es una propiedad transversal del CSS global, no de este cambio).

### Estilo de componente
Denso, sin decoración gratuita, dark-first — igual que el resto del admin. Un componente nuevo "pertenece" si reutiliza `bg-background-alt`, bordes `border-white/10`, y el acento dorado solo para foco/CTA.

---

## 8. Authentication & Authorization

### Proveedor y justificación
Supabase Auth + RBAC propio (`src/lib/auth/rbac.ts`) — ya establecido, no se cambia. Roles: `customer`, `admin`, `marketing`, `operaciones`, `repartidor` (constraint en `profiles.role`, sin cambios).

### Flujos
Sin cambios — este blueprint no toca login, registro, recuperación de contraseña, ni sesión. La única pieza nueva relacionada con cuentas es la **pantalla de alta de repartidores**, que reutiliza el flujo de creación de usuario ya existente (contraseña temporal generada server-side, mostrada una sola vez) — no se crea un flujo de auth nuevo.

### Protección de rutas — delta
| Superficie | Regla | Enforced en |
|---|---|---|
| `/admin/configuracion/repartidores` | `role = admin` | `requireRole(["admin"])` al inicio del Server Component, mismo patrón que el resto de `/admin/configuracion/*` |
| `sendDeliveryMessage` / `listDeliveryMessages` | `role in (repartidor, admin, operaciones)` + pertenencia (repartidor dueño del pedido, o staff de la sucursal) | `requireRole` dentro de la Server Action + RLS de `order_delivery_messages` como segunda capa (defensa en profundidad, mismo patrón que todo el proyecto) |

**Regla de enforcement**: la autorización se verifica server-side en cada Server Action, nunca solo en el cliente — igual que ya hace todo el proyecto (`requireRole` como primera línea).

### Roles y permisos — delta
| Rol | Puede (nuevo en este cambio) | No puede |
|---|---|---|
| `repartidor` | Enviar/leer mensajes de chat de sus propios pedidos asignados | Ver o escribir mensajes de pedidos de otro repartidor |
| `admin` | Crear cuentas de repartidor desde la pantalla nueva; enviar/leer mensajes de cualquier pedido | — |
| `operaciones` | Enviar/leer mensajes de pedidos de su propia sucursal | Ver mensajes de pedidos de otra sucursal |

### Sesiones
Sin cambios — cookies `HttpOnly`/`Secure`/`SameSite` gestionadas por `@supabase/ssr`, sin modificación en este blueprint.

### Multi-tenancy / aislamiento por fila
Mecanismo: RLS de Postgres (no un filtro aplicativo "recordar filtrar por sucursal"). La tabla nueva sigue el mismo mecanismo que toda tabla del proyecto — políticas RLS con `current_app_role()`/`current_store_id()`, ver §4.

---

## 9. BUILD ORDER

13 pasos. Rango del template: 10-18 → válido. Epics: `ceil(13/9)=2` mínimo, `floor(13/5)=2` máximo → **exactamente 2 epics** por la fórmula del template... pero el trabajo real tiene 7 seams naturales de capa/superficie (UI compartida / Pedidos / Catálogo / CRM / Promociones / Repartidor / Decommission) que no colapsan limpiamente en 2 sin perder legibilidad. **Decisión registrada en §20.3**: se mantienen 7 epics por claridad de dominio en vez de forzar el rango 2-3 del template pensado para builds greenfield de features más homogéneas; cada epic tiene entre 1 y 5 pasos, coherente con la naturaleza brownfield de este cambio (módulos independientes del admin, no capas de una sola feature).

### Mapa de pasos

| # | Paso | Depende de | Toca | Gate |
|---|---|---|---|---|
| 1 | Sidebar en acordeón | — | `AdminNav.tsx`, `AdminNavGroup.tsx` | `npm run build` |
| 2 | Stepper + detalle expandible en Pedidos | 1 | `PedidosTable.tsx`, `AdminOrderRow.tsx`, `OrderStepper.tsx`, `OrderRowDetail.tsx` | `npm run build` |
| 3 | Selección múltiple + acciones masivas | 2 | `PedidosTable.tsx` | `npm run build` |
| 4 | Kanban real conectado | 3 | `app/admin/pedidos/page.tsx` | `npm run build` |
| 5 | KPIs + filtros de Productos | — | `ProductosTable.tsx`, `ProductKpiRow.tsx` | `npm run build` |
| 6 | Clientes unificado en tabs | — | `clientes/page.tsx`, `SegmentosPanel.tsx`, `RankingPanel.tsx` | `npm run build` |
| 7 | Promociones unificado en tabs | — | `promociones/page.tsx`, `RendimientoPanel.tsx`, `analisis-ofertas/page.tsx` | `npm run build` |
| 8 | Migración `order_delivery_messages` + RLS | — | `supabase/migrations/*.sql` | prueba RLS manual con 2 cuentas |
| 9 | Server Actions de chat | 8 | `src/lib/delivery-chat/*` | `npm run build` |
| 10 | Countdown de incidencia | — | `OrderCard.tsx` | prueba manual cronometrada |
| 11 | Panel de chat integrado | 9, 10 | `IssueChatPanel.tsx`, `repartidor/page.tsx` | prueba manual 2 sesiones |
| 12 | Alta de Repartidores separada | — | `configuracion/repartidores/*` | comparación manual de fila en `profiles` |
| 13 | Decommission | 1,4,5,6,7,11,12 | borra `analisis-ofertas/page.tsx` y vistas viejas de Clientes | `npm run build` + `grep` |

---

### Paso 1 — Sidebar en acordeón

**Do**
Extraer `AdminNavGroup.tsx` como componente cliente que recibe `title`, `items`, `defaultOpen`. Integrarlo en `AdminNav.tsx` (§3), abriendo por defecto los grupos "Resumen" y "Operación diaria", y expandiendo automáticamente el grupo del item activo según la ruta actual (mismo cálculo de `isActive` que `AdminNav.tsx` ya tiene para `CATALOGO_PATHS`).

**Done when**
- [ ] WHEN el admin carga para un usuario con rol `admin` THE SYSTEM SHALL renderizar "Resumen" y "Operación diaria" expandidos y el resto de los grupos colapsados.
- [ ] WHEN el usuario hace click en el header de un grupo colapsado THE SYSTEM SHALL expandirlo, sin navegar ni recargar.
- [ ] WHEN el usuario navega directo a `/admin/configuracion/usuarios` (grupo Configuración, colapsado por defecto) THE SYSTEM SHALL mostrar ese grupo ya expandido al cargar.
- [ ] WHEN se ejecuta `npx tsc --noEmit` THE SYSTEM SHALL salir con código 0.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**
```bash
git add -A && git commit -m "step 1: sidebar en acordeon"
git tag step-01-sidebar-acordeon
# rollback: git reset --hard step-01-sidebar-acordeon si el paso 2 falla
```

---

### Paso 2 — Stepper y detalle expandible en Pedidos

**Do**
Crear `OrderStepper.tsx` (presentacional puro, recibe `status: OrderStatus` y `deliveryMethod`) que deriva los pasos así: para envío, 5 pasos (`ready`/`driver_assigned`→"Pedido recibido", `in_route`→"Saliendo a entregar", `at_address`→"Ubicación alcanzada", `delivered`→completo); para retiro, 4 pasos equivalentes sin el paso de ruta. Estados `delivery_issue`/`cancelled`/`returned_to_store` no muestran stepper (badge simple, igual que hoy). Integrar en `AdminOrderRow.tsx` reemplazando/acompañando el badge de estado actual. Crear `OrderRowDetail.tsx` con las líneas de `order_items` ya disponibles en la query de `PedidosTable.tsx` (no se agrega ninguna query nueva).

**Done when**
- [ ] WHEN un pedido tiene `status='driver_assigned'` y `delivery_method='envio'` THE SYSTEM SHALL mostrar el paso 2 de 5 como actual y el paso 1 como completado.
- [ ] WHEN un pedido tiene `status` en (`delivery_issue`,`cancelled`,`returned_to_store`) THE SYSTEM SHALL ocultar el stepper.
- [ ] WHEN el usuario hace click en "Ver detalle" de una fila THE SYSTEM SHALL expandir una fila con las líneas de ese pedido sin request de red adicional.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**
```bash
git add -A && git commit -m "step 2: stepper y detalle expandible en pedidos"
git tag step-02-pedidos-stepper
```

---

### Paso 3 — Selección múltiple y acciones masivas

**Do**
Wrapper cliente que envuelve `PedidosTable.tsx` con `useState<Set<string>>` de ids seleccionados. Al haber selección, mostrar una barra con: conteo, botón de acción masiva (visible solo si el 100% de la selección comparte `status`, y para `pending_payment` solo si el 100% es `payment_method='bank_transfer'` — Mercado Pago no ofrece confirmación manual, regla ya vigente hoy), y "Cancelar selección". La acción masiva invoca la Server Action unitaria existente correspondiente una vez por pedido seleccionado (no se crea una acción bulk nueva, ver §1 Non-Goals).

**Done when**
- [ ] WHEN se seleccionan N pedidos con el mismo `status='preparing'` THE SYSTEM SHALL habilitar el botón "Marcar preparados", que invoca `markAtAddress`-equivalente N veces (una por pedido).
- [ ] WHEN la selección mezcla pedidos de distinto `status` THE SYSTEM SHALL deshabilitar toda acción masiva.
- [ ] WHEN todos los seleccionados están en `status='pending_payment'` y `payment_method='mercadopago'` THE SYSTEM SHALL no ofrecer ninguna acción masiva.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**
```bash
git add -A && git commit -m "step 3: seleccion multiple y acciones masivas en pedidos"
git tag step-03-pedidos-seleccion-multiple
```

---

### Paso 4 — Kanban real conectado al toggle

**Do**
Conectar el toggle Tabla/Tablero ya presente en la página de Pedidos a `KanbanBoard.tsx` (existente, sin modificar). El estado de qué vista está activa vive en `?vista=tabla|kanban` (mismo patrón de estado en URL que el resto de Pedidos).

**Done when**
- [ ] WHEN el usuario alterna a "Tablero" THE SYSTEM SHALL renderizar `KanbanBoard.tsx` con los pedidos del filtro de rango/entrega activo.
- [ ] WHEN el usuario busca algo en la vista Tabla y alterna a Tablero y vuelve THE SYSTEM SHALL preservar el texto de búsqueda de la vista Tabla (búsquedas independientes entre vistas, igual que hoy).

**Verify**
```bash
npm run build
```

**Checkpoint**
```bash
git add -A && git commit -m "step 4: kanban conectado al toggle de pedidos"
git tag step-04-pedidos-kanban
```

---

### Paso 5 — KPIs, filtro "sin fotos", copiar SKU y toggle inline en Productos

**Do**
`ProductKpiRow.tsx` con 4 KPIs (Total, Activos, Inactivos, Edición limitada) calculados en el Server Component padre (mismos datos que `ProductosTable.tsx` ya recibe, sin query nueva). Agregar filtro "Sin fotos" (productos con 0 filas en `product_images`, dato ya consultado para el badge de advertencia existente), botón de copiar SKU por fila, y toggle activo/inactivo inline que invoca la misma Server Action que ya usa `ProductDrawer.tsx` para ese campo.

**Done when**
- [ ] WHEN la página de Productos carga THE SYSTEM SHALL mostrar 4 KPIs cuyo valor coincide con un `select count(*)` equivalente ejecutado contra la misma base al momento de la verificación.
- [ ] WHEN se activa el filtro "Sin fotos" THE SYSTEM SHALL mostrar solo productos sin filas en `product_images`.
- [ ] WHEN se usa el toggle inline THE SYSTEM SHALL invocar la Server Action ya existente de `ProductDrawer.tsx`, sin duplicar lógica.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**
```bash
git add -A && git commit -m "step 5: kpis y filtros de productos"
git tag step-05-productos-kpis
```

---

### Paso 6 — Clientes unificado en tabs

**Do**
Extraer el contenido de la vista RFM a `SegmentosPanel.tsx` y el de Mejores Clientes a `RankingPanel.tsx`, reutilizando exactamente las queries que hoy usan esas vistas (dedup manual sobre `customer_rfm_snapshot`, mismo criterio de "última fila por cliente"). `clientes/page.tsx` orquesta por `?tab=lista|segmentos|ranking`, default `lista`.

**Done when**
- [ ] WHEN se visita `/admin/clientes?tab=lista` THE SYSTEM SHALL mostrar los mismos filtros de segmento y las mismas opciones de orden que la página actual antes de este cambio.
- [ ] WHEN se visita `/admin/clientes?tab=segmentos` THE SYSTEM SHALL mostrar 5 columnas con conteo y valor total coincidentes con un cálculo manual sobre `customer_rfm_snapshot`.
- [ ] WHEN se visita `/admin/clientes?tab=ranking` THE SYSTEM SHALL mostrar el mismo top N por LTV que la vista actual.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**
```bash
git add -A && git commit -m "step 6: clientes unificado en tabs"
git tag step-06-clientes-tabs
```

---

### Paso 7 — Promociones unificado en tabs

**Do**
`RendimientoPanel.tsx` reutiliza las queries de `analisis-ofertas/page.tsx` (KPIs de ingresos/descuento/canjeados/cupón más usado + tabla de productos con descuento). `promociones/page.tsx` orquesta por `?tab=activos|rendimiento`, default `activos`. `analisis-ofertas/page.tsx` pasa a hacer `redirect("/admin/promociones?tab=rendimiento")` (Next `redirect()`), sin borrarse todavía.

**Done when**
- [ ] WHEN se visita `/admin/promociones?tab=activos` THE SYSTEM SHALL mostrar el mismo formulario "Nueva promoción" completo (incluidos los campos condicionales) que la página actual.
- [ ] WHEN se visita `/admin/promociones?tab=rendimiento` THE SYSTEM SHALL mostrar los mismos KPIs y la misma tabla de productos con descuento que hoy muestra `/admin/analisis-ofertas`.
- [ ] WHEN se visita `/admin/analisis-ofertas` THE SYSTEM SHALL redirigir sin devolver 404.

**Verify**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Checkpoint**
```bash
git add -A && git commit -m "step 7: promociones unificado en tabs"
git tag step-07-promociones-tabs
```

---

### Paso 8 — Migración `order_delivery_messages` + RLS

**Do**
Crear la migración con el SQL completo de §4 (tabla + índice + 4 policies RLS, reutilizando `current_app_role()`/`current_store_id()` ya existentes). Aplicar primero contra una rama/branch de desarrollo de Supabase.

**Done when**
- [ ] WHEN se aplica la migración en una rama de desarrollo THE SYSTEM SHALL crear la tabla con RLS habilitado (verificable con `select relrowsecurity from pg_class where relname='order_delivery_messages';` → `t`).
- [ ] WHEN un repartidor de prueba A consulta mensajes de un pedido asignado a un repartidor de prueba B THE SYSTEM SHALL devolver 0 filas.
- [ ] WHEN un repartidor de prueba A consulta mensajes de su propio pedido asignado THE SYSTEM SHALL devolver esas filas.

**Verify**
```bash
# manual — aplicar contra rama/branch de desarrollo de Supabase, nunca directo a producción:
# supabase migration up (o el comando equivalente del flujo del proyecto)
# select relrowsecurity from pg_class where relname='order_delivery_messages'; # expect: t
# probar con 2 cuentas repartidor de prueba, cada una viendo solo sus propios pedidos
```

**Checkpoint**
```bash
git add -A && git commit -m "step 8: migracion order_delivery_messages"
git tag step-08-migracion-chat
```

---

### Paso 9 — Server Actions de chat

**Do**
`sendDeliveryMessage(orderId, message)` y `listDeliveryMessages(orderId)` en `src/lib/delivery-chat/actions.ts`, con `requireRole(["repartidor","admin","operaciones"])` y verificación de pertenencia antes de tocar la tabla (defensa en profundidad sobre la RLS del paso 8).

**Done when**
- [ ] WHEN un repartidor autenticado llama `sendDeliveryMessage` sobre un pedido asignado a él THE SYSTEM SHALL insertar la fila y devolver `{ success: true, message }`.
- [ ] WHEN un repartidor autenticado llama `sendDeliveryMessage` sobre un pedido no asignado a él THE SYSTEM SHALL devolver `{ error }` sin insertar fila.
- [ ] WHEN el mensaje son solo 6 dígitos THE SYSTEM SHALL rechazarlo con `{ error }`.

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: probar con 2 cuentas repartidor distintas
```

**Checkpoint**
```bash
git add -A && git commit -m "step 9: server actions de chat de delivery"
git tag step-09-chat-actions
```

---

### Paso 10 — Countdown de incidencia

**Do**
En `OrderCard.tsx` (o el componente de portal repartidor equivalente), cuando `status='delivery_issue'`, calcular `deadline = delivery_issue_at + max_delivery_issue_wait_minutes` (leyendo `system_settings` ya existente, default 10) y renderizar countdown en vivo. El botón "Volver a la tienda" (ya conectado a `markReturningToStore`, sin cambios de esa acción) queda deshabilitado hasta `now() >= deadline`.

**Done when**
- [ ] WHEN faltan más de 0 minutos para el deadline THE SYSTEM SHALL mostrar el botón deshabilitado con el tiempo restante.
- [ ] WHEN se alcanza el deadline THE SYSTEM SHALL habilitar el botón sin recargar la página.

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: bajar max_delivery_issue_wait_minutes a 1 minuto en Ajustes del sistema y cronometrar
```

**Checkpoint**
```bash
git add -A && git commit -m "step 10: countdown de incidencia de entrega"
git tag step-10-countdown-incidencia
```

---

### Paso 11 — Panel de chat integrado

**Do**
`IssueChatPanel.tsx`, cliente, consume `sendDeliveryMessage`/`listDeliveryMessages` del paso 9 con polling cada 15-20s (mismo orden de magnitud que el Vigía de impresión). Se integra en `repartidor/page.tsx` visible solo cuando `status='delivery_issue'`.

**Done when**
- [ ] WHEN el staff envía un mensaje desde el admin THE SYSTEM SHALL mostrarlo en el portal del repartidor dentro de una ventana de polling de 15-20s.
- [ ] WHEN el repartidor envía un mensaje THE SYSTEM SHALL mostrarlo del lado del staff dentro de la misma ventana.

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: 2 sesiones simultaneas (staff + repartidor)
```

**Checkpoint**
```bash
git add -A && git commit -m "step 11: panel de chat integrado al portal repartidor"
git tag step-11-chat-panel
```

---

### Paso 12 — Alta de Repartidores separada de Usuarios

**Do**
`configuracion/repartidores/page.tsx` con formulario propio (nombre, email, teléfono, sucursal), `role` fijo en `"repartidor"`, reutilizando la Server Action de creación de usuario ya existente en Configuración → Usuarios (sin duplicar la lógica de generación de contraseña temporal).

**Done when**
- [ ] WHEN un admin crea un repartidor desde esta pantalla THE SYSTEM SHALL producir en `profiles` una fila con `role='repartidor'` idéntica en estructura a la que produce hoy el alta desde Usuarios con ese mismo rol.
- [ ] WHEN la pantalla carga THE SYSTEM SHALL no mostrar selector de rol.

**Verify**
```bash
npm run lint
npx tsc --noEmit
# manual: comparar fila resultante en profiles contra alta desde Usuarios
```

**Checkpoint**
```bash
git add -A && git commit -m "step 12: alta de repartidores separada de usuarios"
git tag step-12-alta-repartidores
```

---

### Paso 13 — Decommission

**Do**
Solo después de que los pasos 1-12 estén verificados en producción sin incidentes durante unos días de uso real (ver §9.1 punto 4). Borrar `src/app/admin/analisis-ofertas/page.tsx` y cualquier archivo de las vistas viejas de Clientes que haya quedado sin uso.

**Done when**
- [ ] WHEN se borran los archivos THE SYSTEM SHALL seguir compilando.
- [ ] WHEN se busca `analisis-ofertas` en `src/` THE SYSTEM SHALL no encontrar referencias fuera de las ya removidas.

**Verify**
```bash
npm run build
! grep -r "analisis-ofertas" src/
```

**Checkpoint**
```bash
git add -A && git commit -m "step 13: decommission de rutas viejas"
git tag step-13-decommission
```

---

### 9.1 Parity and cutover

**Requerido — este es un cambio con ventana de coexistencia entre pantallas viejas y nuevas** (Clientes 3→1, Promociones 2→1), aunque no es una migración de framework/DB/proveedor.

#### Parity set

| # | Comportamiento sostenido | Cómo se prueba la paridad | Tolerancia |
|---|---|---|---|
| 1 | Filtro por segmento + orden en Clientes | comparación manual 1:1 de filas entre página vieja y tab nuevo | exacta |
| 2 | 5 columnas RFM con conteo/valor | comparación manual contra query sobre `customer_rfm_snapshot` | exacta |
| 3 | Ranking por LTV | comparación manual de los mismos N primeros | exacta |
| 4 | Formulario "Nueva promoción" completo | comparación manual campo por campo | exacta |
| 5 | KPIs + tabla de análisis de ofertas | comparación manual de los mismos valores | exacta |
| 6 | Reportar incidencia → código → volver a tienda | Server Actions sin cambio de firma, comportamiento idéntico | exacta (no se toca la lógica, solo la UI que la envuelve) |

**Ventana de coexistencia:** no aplica un "shadow period" con tráfico dual porque no hay dos sistemas sirviendo el mismo tráfico en paralelo — es una sola app; la "coexistencia" es que las rutas viejas (`/admin/analisis-ofertas`) siguen compilando y accesibles (antes de redirigir en el paso 7, y la redirección en sí es reversible con un `git revert`) mientras se verifica cada módulo nuevo.

#### Cutover

| Fase | Qué cambia | A quién afecta | Reversible por | Verify |
|---|---|---|---|---|
| UI sin DB (pasos 1-7) | Sidebar, Pedidos, Productos, Clientes, Promociones | Todo el equipo admin | `git revert` del commit del paso | `npm run build` |
| Migración en desarrollo (paso 8) | Tabla nueva en una rama de Supabase | Nadie en producción todavía | `drop table` en esa rama | consulta RLS manual |
| Migración en producción (paso 8, aplicado a prod) | Tabla nueva en producción, vacía | Nadie (tabla sin consumidores todavía) | `drop table order_delivery_messages cascade;` | `select relrowsecurity ...` |
| Chat + countdown + alta de repartidores (pasos 9-12) | Portal repartidor gana funciones nuevas | Repartidores en turno | `git revert` de cada paso | pruebas manuales de cada paso |
| Decommission (paso 13) | Se borran rutas viejas | Nadie (ya redirigidas) | `git revert` restaura los archivos | `npm run build` |

**El kill switch**: revertir el/los commits del paso problemático con `git revert` y redeployar — no hay feature flag en este proyecto (no está en el stack), así que el mecanismo de reversión es control de versiones + redeploy, no un toggle en caliente. Tiempo estimado: el de un deploy de Vercel (minutos, no instantáneo).

#### Abort criteria
- [ ] WHEN la prueba manual de RLS del paso 8 muestra que un repartidor ve mensajes de un pedido no asignado a él THE SYSTEM SHALL revertir la migración inmediatamente (`drop table`) antes de continuar a los pasos 9-12.
- [ ] WHEN `npm run build` falla tras cualquier paso y no se corrige en la misma sesión THE SYSTEM SHALL revertir ese commit específico, sin tocar los anteriores.
- Responsable de observar: quien ejecute el despliegue — no hay alertas automatizadas en este repo (sin CI/monitoring de builds).

#### Data migration
NOT APPLICABLE — no se mueven datos existentes; la única migración es aditiva (tabla nueva, vacía al desplegarse).

#### Decommission
Cubierto en el paso 13 arriba. No es un "algún día": tiene una tarea con id (`E07-T1`) y dependencias explícitas en `tasks.json` que impiden ejecutarla antes de que los módulos 1-12 estén verificados.

---

## 10. Environment Setup

### Prerequisitos
| Herramienta | Versión | Chequeo |
|---|---|---|
| Node.js | la que ya usa el repo (ver `package.json`/`.nvmrc` si existe) | `node --version` |
| npm | la del lockfile | `npm --version` |
| Supabase CLI | la que el equipo ya usa para las 37 migraciones existentes | `supabase --version` |

### Cuentas a crear primero
Ninguna cuenta de servicio nueva — este cambio no integra ningún proveedor externo nuevo (usa Supabase y el resto del stack ya configurado).

### Variables de entorno
NOT APPLICABLE — no se agrega ninguna variable de entorno nueva. El único parámetro que este cambio lee (`max_delivery_issue_wait_minutes`) ya vive en la tabla `system_settings` con fallback a la variable de entorno `MAX_DELIVERY_ISSUE_WAIT_MINUTES` ya existente — no se crea una variable nueva.

### Archivos que deben quedar commiteados
La migración que emite `supabase migration new order_delivery_messages` (nombre real con timestamp de ejecución, no fijado por este blueprint), todos los archivos `[NUEVO]`/`[MODIFICADO]` listados en §3. Ninguno está cubierto por `.gitignore` (mismo patrón que el resto de `src/` y `supabase/migrations/`, ya versionados).

---

## 11. Dependencies

**Cero dependencias nuevas.** Toda la tabla de §2 refleja paquetes ya presentes en `package-lock.json` del repo — no hay pines nuevos que investigar con `stack-researcher` porque no se instala nada. Si en el futuro se decide agregar una librería de chat en tiempo real (revisitando el Non-Goal de §1), en ese momento sí correspondería una investigación de versión con `stack-researcher`.

---

## 12. Deployment Strategy

Despliegue vía Vercel (ya establecido, sin cambios). Cada paso de §9 es su propio commit desplegable independientemente — no hay un "big bang deploy" de todo el blueprint de una vez (consistente con la decisión de rollout gradual tomada en la interview comprimida). La migración de base de datos (paso 8) se aplica primero contra una rama/branch de desarrollo de Supabase y luego a producción como un paso separado del deploy de código — nunca en el mismo commit que el código que la consume (pasos 9-12 dependen de que el paso 8 ya esté aplicado en producción).

No hay pipeline de CI en este repo — el gate de cada paso es manual: quien lo ejecuta corre `npm run lint && npx tsc --noEmit && npm run build` localmente antes de hacer push.

---

## 13. Testing Strategy

No hay test runner configurado en este repo (ni Vitest ni Jest instalado, sin `test` script en `package.json`). Estrategia de verificación, documentada explícitamente en vez de inventar infraestructura que no existe:
- `npx tsc --noEmit` en cada paso — atrapa errores de tipos entre Server/Client Component.
- `npm run lint` en cada paso.
- `npm run build` como gate final — Next falla el build ante errores de límite Server/Client, el tipo de error más probable en este cambio.
- Verificación manual en navegador real contra datos reales de Supabase (no hay infraestructura de mocks en el proyecto) — cada paso list a su verificación manual específica en §9.

---

## 14. Security & Secrets

- No se introduce ningún secreto nuevo — el chat y el countdown reutilizan credenciales y configuración ya existentes (conexión a Supabase, `system_settings`).
- La tabla nueva sigue el mismo patrón de RLS que toda tabla del proyecto (auditado previamente: 100% de las tablas de `public` tienen RLS habilitado) — su propia migración debe mantener esa propiedad desde el día 1.
- Medida defensiva: un mensaje de chat que sea únicamente 6 dígitos se rechaza server-side, para reducir el riesgo de que el código de entrega circule fuera del flujo de confirmación (`delivery_confirmation_code` nunca se expone en el chat).
- Repartidores no pueden ver pedidos de otros repartidores ni de otras sucursales — ya garantizado por `assigned_driver_id = auth.uid()` en `orders`; la tabla nueva hereda la misma restricción vía RLS (§4).

---

## 15. Accessibility

- El acordeón del sidebar y las pestañas de Clientes/Promociones deben ser operables por teclado (botones reales con `aria-expanded`, no `<div onclick>` sin rol) — mismo estándar que ya aplica al resto del admin.
- El panel de chat debe anunciar mensajes nuevos de forma accesible (`aria-live="polite"` en el contenedor de mensajes) dado que llegan por polling sin interacción directa del usuario.
- Validado con la skill `ui-ux-pro-max` ya usada en la fase de diseño (prioridad 1 de su checklist: accesibilidad, contraste, foco, aria-labels) — no se repite el proceso de descubrimiento de estilo, solo se aplica su checklist de accesibilidad a los componentes nuevos.

---

## 16. Observability & Cost

- Sentry (`@sentry/nextjs`) ya está integrado — las Server Actions nuevas (`sendDeliveryMessage`, `listDeliveryMessages`) deben capturar errores con el mismo patrón que el resto del proyecto, sin introducir un mecanismo de manejo de errores nuevo.
- Costo adicional: una tabla nueva de bajo volumen (mensajes de chat solo durante incidencias, no en cada pedido) — impacto de almacenamiento y de cómputo en Supabase despreciable frente al resto del esquema.
- No se agrega ningún servicio de monitoreo nuevo.

---

## 17. Model Routing

NOT APPLICABLE — este cambio no integra ningún modelo de lenguaje ni funcionalidad de IA; es un rediseño de interfaz administrativa sobre datos estructurados.

---

## 18. Skills to Use During Build

| Skill | Cuándo se usa | Instalación |
|---|---|---|
| `ui-ux-pro-max` | Ya se usó en la fase de diseño previa a este blueprint para auditar indicadores y validar accesibilidad de la maqueta — durante el build, re-consultar su checklist de accesibilidad (§15) al construir `OrderStepper.tsx` e `IssueChatPanel.tsx` | Ya instalada en este proyecto en `.claude/skills/ui-ux-pro-max/` (agregada en una sesión anterior de este mismo repo) — no requiere instalación nueva |

No se requiere ninguna skill adicional — el resto del build es código de aplicación directo sobre patrones ya existentes en el repo.

---

## 19. Agent Workspace

Los archivos reales de esta sección viven en `workspace/` de este bundle y se copian al root del repo antes del paso 1. **En este repo brownfield, `CLAUDE.md` y `AGENTS.md` son deltas que se agregan a los archivos existentes, no reemplazos** — el repo ya tiene un `CLAUDE.md` que incluye `@AGENTS.md`, y `AGENTS.md` con contenido autogenerado por `next dev` que no debe borrarse.

### 19.1 `CLAUDE.md`
Ver `workspace/CLAUDE.md` — nota de convención sobre coexistencia de rutas viejas/nuevas durante el build de este cambio.

### 19.2 `AGENTS.md`
Ver `workspace/AGENTS.md` — rutina de verificación (`lint && tsc --noEmit && build`) y protocolo de migraciones contra rama de desarrollo antes de producción.

### 19.3 `.claude/settings.json`
Ver `workspace/.claude/settings.json` — permisos para los comandos que este build ejecuta repetidamente: `npm run lint`, `npm run build`, `npx tsc --noEmit`, `npm run dev`, y los comandos de git de cada Checkpoint (`git add`, `git commit`, `git tag`, `git status`, `git log`).

### 19.4 Project skills
Ver `workspace/.claude/skills/admin-redesign-verify/SKILL.md` — encapsula la rutina de verificación de cada paso para que el builder no tenga que redescubrirla en cada sesión.

### 19.5 `.claude/rules/*.md`
NOT APPLICABLE — no se emite ninguna regla nueva; las convenciones ya documentadas en el `CLAUDE.md`/`AGENTS.md` del repo (leídas en §1 Current state) son suficientes y este delta solo las referencia, no las duplica.

### 19.6 Verify-critical config y infraestructura local
No hay configuración de test runner que emitir (no existe test runner en el proyecto, ver §13). No hay servicio local nuevo que levantar — el desarrollo usa `npm run dev` contra el proyecto Supabase remoto ya configurado, sin Docker Compose ni infraestructura local adicional. El bundle (`blueprints/admin-redesign/`) no interfiere con `eslint.config.mjs` ni `tsconfig.json`: ninguno de los dos está en realidad acotado a `src/` (el `include` de `tsconfig.json` es `**/*.ts`/`**/*.tsx` de todo el repo, y los `globalIgnores` de ESLint solo cubren `.next/**`/`out/**`/`build/**`/`next-env.d.ts`), pero este bundle no emite ningún archivo de configuración nuevo ni ningún `.ts`/`.tsx`/`.js`/`.jsx` bajo `workspace/` (solo `.md`/`.json`), así que el recorrido de árbol de ambas herramientas queda inafectado hoy. Si en el futuro se agrega un `.ts` bajo `blueprints/`, esta afirmación debe revisarse.

**Matriz de convención de resolución**: NOT APPLICABLE — no se introduce ninguna convención de resolución de módulos nueva (mismo `@/*` alias de siempre).

**Reconciliación de valores cruzados**: NOT APPLICABLE — ningún artefacto emitido por este blueprint declara un path/puerto/nombre que otro artefacto también declare (no hay build config ni manifest nuevos).

**Reconciliación de artefactos byte-exactos**: NOT APPLICABLE — ningún paso de §9 compara salida real contra un fixture/golden-file escrito de antemano; toda verificación de paridad (§9.1) es manual contra la UI real, no un diff automatizado de bytes.

---

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Global acceptance gate

El proyecto está listo cuando **todos** los comandos siguientes salen 0, en un checkout limpio tras el paso 13:

```bash
npm run lint        # expect: exit 0
npx tsc --noEmit     # expect: exit 0
npm run build        # expect: exit 0
! grep -r "analisis-ofertas" src/   # expect: exit 0 (sin coincidencias)
git tag -l "step-*"  # expect: 13 tags, step-01-sidebar-acordeon .. step-13-decommission
```

Gate manual (no automatizable en este repo sin test runner ni CI):
- [ ] Los 6 ítems del Parity set de §9.1 fueron comparados 1:1 y coinciden.
- [ ] La prueba de RLS del paso 8 se ejecutó con 2 cuentas repartidor distintas y pasó.
- [ ] El countdown del paso 10 se probó cronometrado con `max_delivery_issue_wait_minutes=1`.
- [ ] El chat del paso 11 se probó con 2 sesiones simultáneas (staff + repartidor).
- [ ] El alta de repartidor del paso 12 produce la misma fila en `profiles` que el flujo de Usuarios.

### 20.2 Risk register

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| RLS de `order_delivery_messages` mal configurada expone mensajes entre repartidores | Baja | Alto | Prueba manual obligatoria con 2 cuentas antes de pasar del paso 8 al 9 (§9.1 Abort criteria) |
| Unificar Clientes/Promociones en tabs pierde algún filtro o columna que la página vieja tenía | Media | Medio | Parity checklist explícito por módulo en §9.1, comparación manual 1:1 antes de dar el paso por cerrado |
| Sin CI, un paso con `npm run build` roto se mergea sin que nadie lo note | Media | Medio | Cada Checkpoint exige correr los 3 comandos localmente antes de commitear; el gate de §20.1 es la última línea de defensa |
| El polling del chat (15-20s) resulta muy lento para coordinar una entrega urgente en la práctica | Baja | Bajo | Registrado como trigger de revisión en §1 Non-Goals — si ocurre, se evalúa Supabase Realtime en un blueprint aparte |

### 20.3 Decision log

**20.3.1 — 7 epics en vez de 2-3**
El template pide `ceil(steps/9)` a `floor(steps/5)` epics para 13 pasos (2 exactos). Se optó por 7 epics agrupados por módulo de dominio (UI compartida, Pedidos, Catálogo, CRM, Promociones, Repartidor, Decommission) porque este es un cambio brownfield sobre módulos de negocio independientes del admin, no una feature greenfield con capas homogéneas — forzar 2 epics habría mezclado módulos sin relación funcional entre sí (ej. Productos y Clientes en el mismo epic) solo para cumplir el rango numérico.
**Se revertiría si**: el equipo que ejecuta el build prefiere trabajar por capas técnicas en vez de por módulo de producto — en ese caso, recolapsar a 2 epics (UI pura vs. Repartidor+datos) es una reorganización de `tasks.json` sin tocar el código.

**20.3.2 — No agregar estados nuevos al enum `orders.status`**
Se mapea el track visual de 4 pasos del repartidor sobre estados ya existentes en vez de crear `en_tienda`/`pedido_recibido` como estados reales.
**Would reverse if**: el negocio necesita reportar tiempos separados de "en tienda esperando repartidor" vs. "recién asignado" con precisión propia de reporting — ahí sí ameritaría una columna de timestamp adicional, no un cambio de enum.

**20.3.3 — Reutilizar Server Actions unitarias para "acciones masivas" en vez de una acción bulk**
Evita duplicar la lógica de validación de transición de estado que ya vive en `orders/actions.ts`.
**Would reverse if**: el volumen de pedidos por acción masiva crece lo suficiente como para que N llamadas secuenciales sean perceptiblemente lentas.

**20.3.4 — Chat con polling, no Supabase Realtime**
El proyecto no usa Realtime en ningún otro lugar (ni el Vigía de impresión). Se mantiene consistencia con el patrón existente en vez de introducir una tecnología nueva para un solo caso de uso.
**Would reverse if**: el negocio reporta que 15-20s de latencia es inaceptable para coordinar una entrega en curso (ver riesgo en §20.2).

### 20.4 What to build next

Fuera de alcance de este blueprint, candidatos para uno futuro si el negocio los pide: persistencia del estado del acordeón del sidebar por usuario (`localStorage`), Supabase Realtime para el chat si el polling resulta insuficiente, columna de timestamp separada para "en tienda esperando repartidor" si se necesita reporting fino de esa espera.
