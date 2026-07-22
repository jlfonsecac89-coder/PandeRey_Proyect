const { Pool } = require('pg');

const dbConfig = {
    host: process.env.DB_HOST || 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'L8nhPn1v*21',
    database: process.env.DB_NAME || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        rejectUnauthorized: false
    }
};

async function run() {
    const pool = new Pool(dbConfig);
    const conn = await pool.connect();
    
    console.log("🔍 Conectando a Supabase para verificación independiente de persistencia...");

    try {
        // Query 1: Products
        const prodRes = await conn.query(
            "SELECT id, name, slug FROM public.products WHERE name ILIKE '%prueba%e2e%'"
        );
        console.log(`\n📦 Consulta 1 (public.products): Encontrados ${prodRes.rows.length} registros.`);
        if (prodRes.rows.length > 0) {
            console.log(prodRes.rows);
        }

        // Query 2: Coupons
        const couponRes = await conn.query(
            "SELECT code, discount_type, discount_value FROM public.coupons WHERE code = 'TEST_E2E_99'"
        );
        console.log(`🎟️ Consulta 2 (public.coupons): Encontrados ${couponRes.rows.length} registros.`);
        if (couponRes.rows.length > 0) {
            console.log(couponRes.rows);
        }

        // Query 3: Orders
        const orderRes = await conn.query(
            "SELECT id, order_number, total_amount FROM public.orders WHERE order_number = 'PDR-001004'"
        );
        console.log(`📋 Consulta 3 (public.orders): Encontrados ${orderRes.rows.length} registros.`);
        if (orderRes.rows.length > 0) {
            console.log(orderRes.rows);
        }

        console.log("\n✅ Verificación completada.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error ejecutando queries de verificación:", err.message);
        process.exit(1);
    } finally {
        conn.release();
    }
}

run();
