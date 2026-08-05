-- Fase 11: el módulo de Análisis de Ofertas (sección 14) necesita saber
-- cuánto descuento otorgó específicamente un CUPÓN/promoción, separado del
-- descuento por canje de puntos — pero `orders.discount_total` guarda ambos
-- sumados desde la Fase 4/7, sin desglose. Se agrega el desglose hacia
-- adelante (no hay pedidos reales en producción todavía, sección 19), y se
-- deja `discount_total` intacto como el total combinado que ya usa el resto
-- de la UI (resumen de pedido, Mi Cuenta, admin de pedidos).
alter table orders add column coupon_discount_clp numeric(12,2) not null default 0;
alter table orders add column points_discount_clp numeric(12,2) not null default 0;
