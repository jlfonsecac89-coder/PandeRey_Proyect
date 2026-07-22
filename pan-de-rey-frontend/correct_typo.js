const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.trim().match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^"|"$/g, '');
        process.env[key] = value;
      }
    });
  }
}

async function run() {
  loadEnv();
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'L8nhPn1v*21',
    database: process.env.DB_NAME || 'postgres',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });
  
  const client = await pool.connect();
  try {
    console.log("⚡ Executing attribute value correction...");
    const res = await client.query("UPDATE public.attribute_values SET value = 'Frosting de Queso Crema' WHERE id = 3");
    console.log(`✅ Typos corrected successfully! Rows affected: ${res.rowCount}`);
  } catch (e) {
    console.error("❌ Error running update:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
