-- =========================================================
-- Pan de Rey - Migración de Fusión de Cuentas de Invitados (Julio 2026)
-- Ejecuta este script en Supabase SQL Editor.
-- =========================================================

-- 1. Agregar columna is_guest a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- 2. Asegurar que no hay restricción de FK profiles_id_fkey bloqueando perfiles huérfanos de autenticación (invitados)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Actualizar la función trigger handle_new_user para realizar la fusión atómica
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id INT;
    old_guest_id UUID;
BEGIN
    -- Buscar si existe un perfil de invitado previo con el mismo email
    SELECT id INTO old_guest_id FROM public.profiles WHERE email = new.email AND is_guest = true LIMIT 1;

    -- Si existía un invitado con el mismo correo, renombrar temporalmente su email para liberar el índice único
    IF old_guest_id IS NOT NULL THEN
        UPDATE public.profiles SET email = email || '.fused-' || old_guest_id::text WHERE id = old_guest_id;
    END IF;

    -- Insertar el nuevo perfil de usuario autenticado
    INSERT INTO public.profiles (id, email, first_name, last_name, phone, is_guest)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', 'Cliente'),
        COALESCE(new.raw_user_meta_data->>'last_name', 'Invitado'),
        new.phone,
        false
    );

    -- Migrar sus registros al nuevo perfil y limpiar
    IF old_guest_id IS NOT NULL THEN
        -- Mudar direcciones
        UPDATE public.addresses SET user_id = new.id WHERE user_id = old_guest_id;
        
        -- Mudar pedidos
        UPDATE public.orders SET user_id = new.id WHERE user_id = old_guest_id;

        -- Limpiar roles antiguos del invitado para evitar conflictos
        DELETE FROM public.user_roles WHERE user_id = old_guest_id;

        -- Eliminar el perfil temporal de invitado
        DELETE FROM public.profiles WHERE id = old_guest_id;
    END IF;

    -- Obtener ID del rol Cliente
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'Cliente' LIMIT 1;

    -- Asignar rol de Cliente al nuevo perfil
    IF default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (new.id, default_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-crear el trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
