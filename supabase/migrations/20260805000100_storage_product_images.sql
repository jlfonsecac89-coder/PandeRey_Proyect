-- El bucket "product-images" ya se creó vía API (público: la lectura no
-- necesita política, Supabase Storage la sirve directo). Estas políticas
-- solo cubren escritura (INSERT/UPDATE/DELETE) — mismo criterio que
-- staff_manage_product_images en la tabla product_images (sección 13).
create policy "staff_upload_product_images" on storage.objects
  for insert
  with check (bucket_id = 'product-images' and current_app_role() in ('admin', 'operaciones'));

create policy "staff_update_product_images_storage" on storage.objects
  for update
  using (bucket_id = 'product-images' and current_app_role() in ('admin', 'operaciones'));

create policy "staff_delete_product_images_storage" on storage.objects
  for delete
  using (bucket_id = 'product-images' and current_app_role() in ('admin', 'operaciones'));
