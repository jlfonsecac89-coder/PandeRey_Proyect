import pg from 'pg';

const pool = new pg.Pool({
  host: 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
  user: 'postgres',
  password: 'L8nhPn1v*0624',
  database: 'postgres',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const script = `
-- 1. Crear tipos ENUM para tipo de orden y estado de SLA
DO $$ BEGIN
    CREATE TYPE order_type_enum AS ENUM ('DELIVERY', 'PICKUP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sla_status_enum AS ENUM ('EN_TIEMPO', 'POR_VENCER', 'ATRASADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Modificar la tabla orders para agregar campos de logística y SLA
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type order_type_enum DEFAULT 'DELIVERY',
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time_slot VARCHAR(50), 
ADD COLUMN IF NOT EXISTS customer_phone_snapshot VARCHAR(20),
ADD COLUMN IF NOT EXISTS shipping_address_snapshot TEXT;

-- 3. Función auxiliar para calcular el SLA
CREATE OR REPLACE FUNCTION get_order_sla_status(
  p_scheduled_date DATE,
  p_time_slot TEXT,
  p_delivered_at TIMESTAMP WITH TIME ZONE
)
RETURNS sla_status_enum AS $$
DECLARE
  v_target_timestamp TIMESTAMP WITH TIME ZONE;
  v_end_hour INT;
BEGIN
  IF p_scheduled_date IS NULL THEN
    RETURN 'EN_TIEMPO';
  END IF;

  IF p_time_slot LIKE '%-%' THEN
    v_end_hour := SPLIT_PART(SPLIT_PART(p_time_slot, '-', 2), ':', 1)::INT;
  ELSE
    v_end_hour := 20; 
  END IF;

  v_target_timestamp := (p_scheduled_date + (v_end_hour || ' hours')::INTERVAL) AT TIME ZONE 'UTC';

  IF p_delivered_at IS NOT NULL THEN
    IF p_delivered_at <= v_target_timestamp THEN
      RETURN 'EN_TIEMPO';
    ELSE
      RETURN 'ATRASADO';
    END IF;
  END IF;

  IF NOW() > v_target_timestamp THEN
    RETURN 'ATRASADO';
  ELSIF NOW() >= (v_target_timestamp - INTERVAL '1 hour') THEN
    RETURN 'POR_VENCER';
  ELSE
    RETURN 'EN_TIEMPO';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
    `;
    await pool.query(script);
    console.log('SQL Script executed successfully.');
  } catch (err) {
    console.error('Error executing SQL script:', err);
  }
  process.exit(0);
}
run();
