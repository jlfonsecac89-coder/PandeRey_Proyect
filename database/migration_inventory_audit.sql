-- =========================================================
-- Pan de Rey - Migración para Columnas de Auditoría de Inventario (Julio 2026)
-- Ejecuta este script en tu Supabase SQL Editor.
-- =========================================================

-- 1. Agregar columnas explicitas para auditoria en la tabla inventory_movements
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS performed_by VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS reason TEXT NULL;
