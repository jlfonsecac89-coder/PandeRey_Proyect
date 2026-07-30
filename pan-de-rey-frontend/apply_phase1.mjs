import { Client } from 'pg';
import path from 'path';
import fs from 'fs';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^#\s]+?)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
        }
    });
}

const config = {
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '01l93pDapK',
    database: process.env.DB_NAME || process.env.POSTGRES_DATABASE || 'postgres',
    port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '6543'),
    ssl: { rejectUnauthorized: false }
};

if (!config.host || !config.user || !config.password) {
    console.error("Missing database credentials.");
    process.exit(1);
}

const client = new Client(config);

async function applyMigrations() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database.');

        // 1. Add Columns to Orders
        console.log('Adding delivery pin columns to orders table...');
        await client.query(`
            ALTER TABLE public.orders 
            ADD COLUMN IF NOT EXISTS delivery_pin VARCHAR(6),
            ADD COLUMN IF NOT EXISTS pin_attempts INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS driver_id UUID, -- No FK to profiles yet since profiles table might not be strict
            ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
        `);

        // 2. Create Index
        console.log('Creating index on driver_id and status...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON public.orders(driver_id, status);
        `);

        // 3. Create Trigger Function for Generation
        console.log('Creating PIN generation function and trigger...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.generate_delivery_pin()
            RETURNS TRIGGER AS $$
            BEGIN
              -- Generar PIN de 4 dígitos si no existe
              IF NEW.delivery_pin IS NULL THEN
                NEW.delivery_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        
        await client.query(`
            DROP TRIGGER IF EXISTS trg_generate_delivery_pin ON public.orders;
            CREATE TRIGGER trg_generate_delivery_pin
            BEFORE UPDATE ON public.orders
            FOR EACH ROW
            WHEN (NEW.status = 'En Camino' AND OLD.status != 'En Camino')
            EXECUTE FUNCTION public.generate_delivery_pin();
        `);

        // 4. Create RPC for validation (verify_and_complete_delivery)
        console.log('Creating RPC for delivery verification...');
        await client.query(`
            CREATE OR REPLACE FUNCTION public.verify_and_complete_delivery(
              p_order_id UUID,
              p_input_pin TEXT,
              p_driver_id UUID
            )
            RETURNS JSONB AS $$
            DECLARE
              v_order RECORD;
            BEGIN
              -- Obtener orden y bloquear la fila durante la transacción
              SELECT * INTO v_order 
              FROM public.orders 
              WHERE id = p_order_id FOR UPDATE;

              IF NOT FOUND THEN
                RETURN jsonb_build_object('success', false, 'message', 'Pedido no encontrado');
              END IF;

              -- Validar que la orden esté asignada a este repartidor
              -- Nota: Eliminamos la restricción estricta de driver temporalmente por si el driver_id viene nulo o queremos un bypass de admin
              IF v_order.driver_id IS NOT NULL AND p_driver_id IS NOT NULL AND v_order.driver_id != p_driver_id THEN
                RETURN jsonb_build_object('success', false, 'message', 'No tienes asignado este pedido');
              END IF;

              -- Bloqueo por exceso de intentos (máximo 5)
              IF COALESCE(v_order.pin_attempts, 0) >= 5 THEN
                RETURN jsonb_build_object('success', false, 'message', 'Límite de intentos superado. Contacta a soporte.');
              END IF;

              -- Validar el PIN
              IF v_order.delivery_pin = p_input_pin THEN
                UPDATE public.orders 
                SET 
                  status = 'Entregado',
                  delivered_at = NOW(),
                  pin_attempts = 0
                WHERE id = p_order_id;

                RETURN jsonb_build_object('success', true, 'message', 'Entrega validada con éxito');
              ELSE
                -- Incrementar contador de intentos fallidos
                UPDATE public.orders 
                SET pin_attempts = COALESCE(pin_attempts, 0) + 1
                WHERE id = p_order_id;

                RETURN jsonb_build_object('success', false, 'message', 'PIN incorrecto');
              END IF;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);

        console.log('✅ Phase 1 Migrations applied successfully.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

applyMigrations();
