-- Bug real encontrado en la Fase 10: self_update_profile (creada en la
-- migración base de profiles, antes de que existiera current_app_role())
-- comparaba el role nuevo contra un SELECT crudo a la propia tabla
-- `profiles` en su WITH CHECK — evaluar esa subquery vuelve a disparar RLS
-- sobre `profiles`, que a su vez vuelve a evaluar este mismo WITH CHECK:
-- "infinite recursion detected in policy for relation profiles" (42P17) en
-- CUALQUIER UPDATE de un cliente sobre su propia fila (ej. editar nombre/
-- teléfono en Mi Cuenta). Nunca se había detectado porque el único otro
-- self-update (changePasswordFirstLogin) usa el cliente admin a propósito,
-- saltándose RLS por completo.
--
-- current_app_role() es security definer: internamente bypassea RLS al
-- leer profiles, así que no recursiona.
drop policy "self_update_profile" on profiles;
create policy "self_update_profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id AND role = current_app_role());
