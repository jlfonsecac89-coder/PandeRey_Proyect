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
    const { rows } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders';
    `);
    console.log('Columns:', rows.map(r => r.column_name));
    
    const { rows: orders } = await pool.query(`
      SELECT * FROM public.orders ORDER BY created_at DESC LIMIT 5;
    `);
    console.log('Orders:', orders);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}
run();
