-- =========================================================
-- Pan de Rey - Migración para Hardening de Privilegios (Julio 2026)
-- Ejecuta este script en tu Supabase SQL Editor.
-- IMPORTANTE: Reemplaza '<CONTRASENA_SEGURA>' por una contraseña generada de forma segura
-- y configúrala como variable de entorno DATABASE_URL / POSTGRES_URL en Vercel.
-- =========================================================

-- 1. Crear el Rol de Aplicación (sin privilegios de DDL)
CREATE ROLE pdr_app_role;

-- 2. Crear el Usuario de la Aplicación
CREATE USER pdr_app_user WITH PASSWORD '<CONTRASENA_SEGURA>';
GRANT pdr_app_role TO pdr_app_user;

-- 3. Otorgar permisos de uso sobre el esquema público
GRANT USAGE ON SCHEMA public TO pdr_app_role;

-- 4. Otorgar exclusivamente privilegios DML sobre las tablas actuales
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pdr_app_role;

-- 5. Asegurar que las tablas creadas en el futuro hereden estos mismos permisos automáticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pdr_app_role;

-- 6. Otorgar privilegios sobre secuencias (necesario para secuencias de pedido y SERIALs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pdr_app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO pdr_app_role;

-- 7. Otorgar el atributo BYPASSRLS directamente al usuario que se conecta
ALTER ROLE pdr_app_user BYPASSRLS;
