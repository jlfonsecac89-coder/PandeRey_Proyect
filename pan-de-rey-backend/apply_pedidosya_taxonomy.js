const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres:L8nhPn1v*21@db.cxhjthmgkzqpldkkdqkv.supabase.co:5432/postgres';

async function run() {
  console.log("🔌 Conectando a la base de datos de Supabase...");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  const client = await pool.connect();
  
  try {
    console.log("📖 Leyendo el archivo SQL de migración...");
    const sqlPath = path.join(__dirname, '../database/migration_pedidosya_taxonomy.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("🚀 Iniciando transacción de migración de taxonomía...");
    await client.query('BEGIN');
    
    // Execute the SQL queries
    await client.query(sqlContent);
    
    await client.query('COMMIT');
    console.log("✅ Migración de taxonomía aplicada exitosamente.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Error aplicando la migración:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
