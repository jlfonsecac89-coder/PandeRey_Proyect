-- Reseñas/valoraciones de clientes — subsistema nuevo, no estaba en el
-- blueprint original. Decisión del cliente: solo se puede reseñar un
-- ítem de un pedido ya ENTREGADO (evita reseñas falsas de quien nunca
-- compró), y queda pendiente de moderación (Admin/Marketing) antes de
-- publicarse.
create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  order_id uuid not null references orders(id),
  order_item_id uuid not null references order_items(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  moderated_by uuid references profiles(id),
  moderated_at timestamptz,
  created_at timestamptz default now(),
  unique (order_item_id)
);

create index product_reviews_product_status_idx on product_reviews (product_id, status);

alter table product_reviews enable row level security;

-- Público: solo reseñas aprobadas.
create policy "public_select_approved_reviews" on product_reviews
  for select using (status = 'approved');

-- El cliente ve también sus propias reseñas aunque estén pendientes/rechazadas.
create policy "self_select_own_reviews" on product_reviews
  for select using (auth.uid() = user_id);

-- Solo se puede reseñar un ítem de UN PEDIDO PROPIO YA ENTREGADO — se
-- valida acá, en la política, no solo en el Server Action (defensa en
-- profundidad, mismo principio de toda la sección 04 del blueprint).
create policy "customer_insert_own_delivered_review" on product_reviews
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from order_items oi
      join orders o on o.id = oi.order_id
      where oi.id = product_reviews.order_item_id
        and oi.product_id = product_reviews.product_id
        and o.id = product_reviews.order_id
        and o.user_id = auth.uid()
        and o.status = 'delivered'
    )
  );

-- Moderación: Admin y Marketing (mismo criterio que el resto del CRM/contenido).
create policy "staff_select_all_reviews" on product_reviews
  for select using (current_app_role() in ('admin', 'marketing'));
create policy "staff_moderate_reviews" on product_reviews
  for update using (current_app_role() in ('admin', 'marketing'))
  with check (current_app_role() in ('admin', 'marketing'));
