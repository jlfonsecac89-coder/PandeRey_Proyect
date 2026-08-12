-- Tope de pedidos por horario agendado (Fase 4 checkout: evita que el
-- equipo de despacho/retiro se sature si muchos clientes eligen el mismo
-- slot). Configurable por Admin junto con el resto de la sucursal.
alter table stores add column max_orders_per_slot int not null default 10;
