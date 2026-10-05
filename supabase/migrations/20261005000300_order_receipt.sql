-- N° de boleta (emitida a mano en Defontana) con que el equipo cierra un pedido
-- de retiro, y quién lo entregó. Aditiva: columnas nulas, no toca datos.

alter table orders add column if not exists receipt_number text;
alter table orders add column if not exists delivered_by uuid references profiles(id) on delete set null;

-- Una boleta corresponde a un solo pedido.
create unique index if not exists orders_receipt_number_key
  on orders (receipt_number)
  where receipt_number is not null;
