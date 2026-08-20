<!--
MERGE NOTE: este contenido debe agregarse al CLAUDE.md existente del repo
(que hoy solo tiene `@AGENTS.md`), no reemplazarlo. Repo-relative paths.
-->

## Convención: cambio "admin-redesign"

Mientras el blueprint `blueprints/admin-redesign/` esté en construcción:

- Las rutas `/admin/analisis-ofertas` y las vistas viejas de `/admin/clientes`
  (RFM/Ranking como páginas separadas) **coexisten a propósito** con las
  nuevas vistas con pestañas — no borrar hasta completar la epic
  `07-decommission`.
- Ninguna Server Action existente (`markInRoute`, `markAtAddress`,
  `markDeliveryIssue`, `markReturningToStore`, `confirmDeliveryCode`,
  creación de usuario en Configuración → Usuarios) cambia de firma en este
  cambio — si algo parece requerirlo, releer §5 del blueprint antes de tocarla.
- El enum `orders.status` no se toca — el track visual de 4 pasos del
  repartidor se deriva de estados existentes (ver §4 del blueprint).
