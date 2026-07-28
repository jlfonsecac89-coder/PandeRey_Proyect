const { Pool } = require('pg');

const connectionString = 'postgres://postgres:L8nhPn1v*0624@db.cxhjthmgkzqpldkkdqkv.supabase.co:6543/postgres';

async function check() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log("=== CATEGORÍAS ===");
    const cats = await pool.query('SELECT * FROM public.categories');
    console.log(JSON.stringify(cats.rows, null, 2));

    console.log("=== GRUPOS DE ATRIBUTOS ===");
    const groups = await pool.query('SELECT * FROM public.attribute_groups');
    console.log(JSON.stringify(groups.rows, null, 2));

    console.log("=== VALORES DE ATRIBUTOS ===");
    const vals = await pool.query(`
      SELECT v.id, g.name as group_name, v.value 
      FROM public.attribute_values v
      JOIN public.attribute_groups g ON v.group_id = g.id
    `);
    console.log(JSON.stringify(vals.rows, null, 2));
    
    console.log("=== CATEGORY ATTRIBUTE GROUPS ===");
    const catAttr = await pool.query(`
      SELECT c.name as category_name, g.name as group_name
      FROM public.category_attribute_groups ca
      JOIN public.categories c ON ca.category_id = c.id
      JOIN public.attribute_groups g ON ca.attribute_group_id = g.id
    `);
    console.log(JSON.stringify(catAttr.rows, null, 2));
  } catch(e) {
    console.error("Database query failed:", e.message);
  } finally {
    await pool.end();
  }
}

check();
