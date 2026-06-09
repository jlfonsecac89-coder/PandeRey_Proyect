-- =========================================================
-- Pan de Rey - Migración para Tabla de Seguimiento Admin (Junio 2026)
-- Ejecuta este script en tu phpMyAdmin para actualizar la tabla Orders.
-- =========================================================

START TRANSACTION;

-- Agregar columnas para el seguimiento de etiquetas impresas, completitud, estado y fecha de entrega real
ALTER TABLE Orders 
ADD COLUMN CompletenessPercent INT NOT NULL DEFAULT 100,
ADD COLUMN OrderState VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
ADD COLUMN LabelPrintedCount INT NOT NULL DEFAULT 0,
ADD COLUMN ActualDeliveryTime TIMESTAMP NULL DEFAULT NULL;

COMMIT;
