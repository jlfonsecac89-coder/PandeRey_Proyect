-- =========================================================
-- Pan de Rey - Migración de Base de Datos (SLA y PIN de Delivery)
-- Ejecuta este script en tu phpMyAdmin para actualizar la tabla Orders.
-- =========================================================

-- Inicia la transacción
START TRANSACTION;

-- Agregar columnas de control del SLA y PIN de delivery a la tabla Orders
ALTER TABLE Orders 
ADD COLUMN SlaStartedAt TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN SlaPausedAt TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN SlaPausedTime INT NOT NULL DEFAULT 0, -- Almacena el acumulado en segundos
ADD COLUMN DeliveryPin VARCHAR(4) NULL DEFAULT NULL;

-- Confirmar la transacción
COMMIT;
