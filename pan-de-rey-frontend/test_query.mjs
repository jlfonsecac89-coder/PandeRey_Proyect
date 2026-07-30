import { getDbPool } from './src/shared/utils/db.js';

async function run() {
  const pool = getDbPool();
  try {
    const [rows] = await pool.query(`
      SELECT Id as id, OrderNumber as order_number, Status as status, CustomerName as customer_name, CustomerPhone as customer_phone, DeliveryAddress as delivery_address, TotalAmount as total_amount
      FROM public.Orders
      WHERE Status IN ('Preparación', 'En Camino', 'En Ruta')
      ORDER BY CreatedAt DESC
    `);
    console.log('Returned rows:', rows);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
