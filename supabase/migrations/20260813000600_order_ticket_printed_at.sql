-- Fase 5: la comanda de preparación (no fiscal) ahora dispara el inicio del
-- SLA de armado al imprimirse (manual o automático), en vez de que el SLA
-- arranque en el momento del pago. `scheduled_at` sigue guardando intacta la
-- hora/día que pidió el cliente (no se toca); `ticket_printed_at` registra
-- cuándo se mandó a imprimir, y evita que un pedido dispare el auto-print o
-- se reinicie el SLA más de una vez.
alter table orders add column ticket_printed_at timestamptz;
