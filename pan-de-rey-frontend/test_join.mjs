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
      SELECT 
        o.id, 
        o.order_number, 
        o.status, 
        u.first_name || ' ' || u.last_name as customer_name, 
        u.phone as customer_phone, 
        a.street as delivery_address, 
        o.total_amount
      FROM public.orders o
      LEFT JOIN public.profiles u ON o.user_id = u.id
      LEFT JOIN public.addresses a ON o.address_id = a.id
      WHERE o.status IN ('Preparación', 'En Camino', 'En Ruta')
      ORDER BY o.created_at DESC
    `);
    console.log('Returned rows:', rows);
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

run();
