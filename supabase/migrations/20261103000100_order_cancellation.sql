-- Cancelación de pedidos pagados y reembolso por Mercado Pago. Aditiva:
-- columnas nulas en orders, no cambia ningún dato existente.

alter table orders add column if not exists cancelled_at timestamptz;
alter table orders add column if not exists cancelled_by uuid references profiles(id) on delete set null;
alter table orders add column if not exists cancel_reason text;

-- null = no hubo (ni se pidió) reembolso.
--   requested: Mercado Pago aceptó el reembolso; el abono al cliente demora
--              según su medio de pago y banco (no es inmediato).
--   failed:    la llamada a Mercado Pago falló; se puede reintentar.
alter table orders add column if not exists refund_status text
  check (refund_status in ('requested', 'failed'));
alter table orders add column if not exists refund_amount numeric(12,2);
alter table orders add column if not exists refund_requested_at timestamptz;
