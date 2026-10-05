-- Disponibilidad por producto (lanzamiento sin control de stock).
-- Aditiva: default true, así ningún producto cambia de comportamiento al
-- aplicarla. Es independiente de is_active (que oculta el producto): un
-- producto no disponible sigue visible en la tienda pero no se puede comprar.
alter table products
  add column if not exists is_available boolean not null default true;

comment on column products.is_available is
  'false = visible en la tienda pero no se puede agregar al carrito ni comprar';
