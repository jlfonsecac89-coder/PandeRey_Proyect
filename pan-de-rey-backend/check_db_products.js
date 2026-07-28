const { Pool } = require('pg');

const host = 'db.cxhjthmgkzqpldkkdqkv.supabase.co';
const user = 'postgres';
const dbName = 'postgres';
const port = 5432;

const passwords = ['L8nhPn1v*21', '01l93pDapK'];

async function testConnection(password) {
  const connectionString = `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const res = await pool.query('SELECT count(*) FROM public.products');
    console.log(`✅ Conexión exitosa con contraseña: ${password}`);
    console.log(`Total productos: ${res.rows[0].count}`);
    
    if (parseInt(res.rows[0].count) > 0) {
      const products = await pool.query(`
        SELECT p.name as product_name, c.name as category_name, p.base_price, p.description
        FROM public.products p
        LEFT JOIN public.categories c ON p.category_id = c.id
        LIMIT 100
      `);
      console.log("DB_PRODUCTS_RESULT_START");
      console.log(JSON.stringify(products.rows, null, 2));
      console.log("DB_PRODUCTS_RESULT_END");
    } else {
      console.log("La tabla public.products está vacía.");
    }
    return true;
  } catch (e) {
    console.error(`❌ Falló conexión con contraseña: ${password}. Error: ${e.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

async function run() {
  for (const pw of passwords) {
    const success = await testConnection(pw);
    if (success) break;
  }
}

run();
