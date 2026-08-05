-- Bug real encontrado en la Fase 12: `cookie_consents.user_id` está pensado
-- para ser null en visitantes sin cuenta (comentario original en la
-- migración base), pero la única policy existente (`self_manage_cookie_consents`)
-- exige `auth.uid() = user_id` — con una sesión anónima `auth.uid()` es NULL,
-- y en SQL `null = null` no es `true`, es `NULL` (RLS lo trata como
-- denegado). Ningún visitante sin cuenta podía insertar su consentimiento.
create policy "anon_insert_cookie_consent" on cookie_consents
  for insert to anon
  with check (user_id is null);
