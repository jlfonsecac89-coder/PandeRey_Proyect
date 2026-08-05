-- El bucket "banners" ya se creó vía API (público: la lectura no necesita
-- política). Estas políticas solo cubren escritura — mismo criterio que
-- staff_manage_banners en la tabla `banners` (Admin y Marketing, sección 13).
create policy "staff_upload_banners" on storage.objects
  for insert
  with check (bucket_id = 'banners' and current_app_role() in ('admin', 'marketing'));

create policy "staff_update_banners_storage" on storage.objects
  for update
  using (bucket_id = 'banners' and current_app_role() in ('admin', 'marketing'));

create policy "staff_delete_banners_storage" on storage.objects
  for delete
  using (bucket_id = 'banners' and current_app_role() in ('admin', 'marketing'));
