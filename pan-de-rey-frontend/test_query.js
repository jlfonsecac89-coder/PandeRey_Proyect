const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    .split('=')[1]
    .replace(/["']/g, '')
    .trim();

const pool = new Pool({ connectionString: env });

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
