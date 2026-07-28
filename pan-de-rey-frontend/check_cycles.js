const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let password = '01l93pDapK';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DB_PASSWORD=')) {
    password = line.split('=')[1].trim();
    break;
  }
}

const pool = new Pool({
  host: 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
  user: 'postgres',
  password: password,
  database: 'postgres',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

async function checkCycles() {
  const query = `
    WITH RECURSIVE category_chain AS (
        SELECT id, parent_id, name, ARRAY[id] AS path, false AS is_cycle
        FROM public.categories
        WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, c.parent_id, c.name, cc.path || c.id, c.id = ANY(cc.path)
        FROM public.categories c
        JOIN category_chain cc ON c.parent_id = cc.id
        WHERE NOT cc.is_cycle
    )
    SELECT * FROM category_chain WHERE is_cycle = true;
  `;
  try {
    const res = await pool.query(query);
    console.log('Cycle check result:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

checkCycles();
