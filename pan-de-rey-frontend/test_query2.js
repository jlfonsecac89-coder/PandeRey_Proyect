const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '01l93pDapK',
    database: process.env.DB_NAME || process.env.POSTGRES_DATABASE || 'postgres',
    port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '6543'),
    ssl: { rejectUnauthorized: false }
};

const pool = new Pool(dbConfig);

pool.query(`
    SELECT id, order_number, status, created_at 
    FROM public.orders 
    WHERE id::text LIKE '8df5fe6d%' OR order_number IS NULL 
    ORDER BY created_at DESC 
    LIMIT 5
`)
.then(res => {
    console.log("=== RESULTADOS ===");
    console.table(res.rows);
    process.exit(0);
})
.catch(err => {
    console.error("=== ERROR ===");
    console.error(err);
    process.exit(1);
});
