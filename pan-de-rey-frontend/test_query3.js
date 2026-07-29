const { Pool } = require('pg');

const dbConfig = {
    host: 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: 'postgres',
    password: 'L8nhPn1v*0624',
    database: 'postgres',
    port: 6543,
    ssl: { rejectUnauthorized: false }
};

const pool = new Pool(dbConfig);

pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'payments'
`)
.then(res => {
    console.log("=== COLUMNS IN PAYMENTS ===");
    console.table(res.rows);
    process.exit(0);
})
.catch(err => {
    console.error("=== ERROR ===");
    console.error(err);
    process.exit(1);
});
