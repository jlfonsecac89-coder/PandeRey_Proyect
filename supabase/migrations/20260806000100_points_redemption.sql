-- Fase 7: canje de producto por puntos (sección 14) — el pedido resultante
-- se paga enteramente en puntos, no vía Mercado Pago, así que necesita su
-- propio valor de payment_method para que el resto del pipeline (SLA,
-- notificaciones, panel de pedidos) lo trate como cualquier otro pedido.
alter table orders drop constraint orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('mercadopago', 'bank_transfer', 'points'));
