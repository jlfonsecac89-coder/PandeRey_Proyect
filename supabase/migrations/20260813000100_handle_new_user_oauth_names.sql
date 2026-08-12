-- El trigger original solo leía `full_name` de raw_user_meta_data, que es la
-- clave que manda nuestro formulario de registro propio. Google (y el resto
-- de proveedores OAuth) no siempre usan esa clave: mandan `name`, y a veces
-- solo `given_name`/`family_name`. Con el trigger anterior, un cliente que
-- entraba con Google terminaba con `full_name = ''` en profiles — la cuenta
-- quedaba creada pero sin nombre, y el saludo del sitio salía vacío.
--
-- Se agregan los fallbacks en orden de preferencia y, como último recurso,
-- la parte local del email (mejor "jperez" que una cadena vacía). El
-- comportamiento para el registro con email/contraseña no cambia.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_name text;
begin
  resolved_name := nullif(trim(coalesce(meta->>'full_name', '')), '');

  if resolved_name is null then
    resolved_name := nullif(trim(coalesce(meta->>'name', '')), '');
  end if;

  if resolved_name is null then
    resolved_name := nullif(
      trim(concat_ws(' ', meta->>'given_name', meta->>'family_name')),
      ''
    );
  end if;

  if resolved_name is null then
    resolved_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(resolved_name, ''), 'customer');

  return new;
end;
$$;
