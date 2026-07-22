-- =========================================================
-- Pan de Rey - Migración para Número de Seguimiento (Julio 2026)
-- Ejecuta este script en Supabase SQL Editor si deseas aplicarlo manualmente.
-- =========================================================

-- 1. Crear el secuenciador starting at 1000
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1000;

-- 2. Agregar columna order_number a orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;
