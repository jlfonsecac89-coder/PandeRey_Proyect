import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function cleanup() {
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Fetching empty products...');
        const result = await pool.query("SELECT id FROM public.products WHERE name IS NULL OR name = '' OR name = ' '");
        console.log(`Found ${result.rows.length} empty products.`);
        
        for (const p of result.rows) {
            console.log(`Deleting product ID: ${p.id}`);
            const variants = await pool.query('SELECT id FROM public.product_variants WHERE product_id = $1', [p.id]);
            for (const v of variants.rows) {
                await pool.query('DELETE FROM public.inventory WHERE variant_id = $1', [v.id]);
                await pool.query('DELETE FROM public.variant_attribute_values WHERE variant_id = $1', [v.id]);
                await pool.query('DELETE FROM public.product_variants WHERE id = $1', [v.id]);
            }
            await pool.query('DELETE FROM public.products WHERE id = $1', [p.id]);
        }
        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
cleanup();
