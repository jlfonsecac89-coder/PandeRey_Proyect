import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.nndvmnsrzlrmyqzzhldv:jX3H9K_2p#mQv!8f@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  const { rows } = await pool.query('SELECT "Status", "OrderNumber" FROM public."Orders" ORDER BY "CreatedAt" DESC LIMIT 5;');
  console.log('Orders:', rows);
  process.exit(0);
}
run();
