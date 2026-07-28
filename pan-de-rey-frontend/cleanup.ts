import { getDbPool } from './src/utils/db.ts';

async function cleanupEmptyProducts() {
    const pool = getDbPool();
    const connection = await pool.getConnection();
    
    try {
        console.log('Fetching empty products...');
        const [products]: any = await connection.query("SELECT * FROM public.products WHERE name IS NULL OR name = '' OR name = ' ' OR name = 'null'");
        
        console.log(`Found ${products.length} empty products.`);
        
        for (const p of products) {
            const pid = p.id || p.Id;
            console.log(`Deleting product ID: ${pid}`);
            // First delete variants and inventory
            const [variants]: any = await connection.query('SELECT id FROM public.product_variants WHERE product_id = ?', [pid]);
            for (const v of variants) {
                const vid = v.id || v.Id;
                await connection.query('DELETE FROM public.inventory WHERE variant_id = ?', [vid]);
                await connection.query('DELETE FROM public.variant_attribute_values WHERE variant_id = ?', [vid]);
                await connection.query('DELETE FROM public.product_variants WHERE id = ?', [vid]);
            }
            await connection.query('DELETE FROM public.products WHERE id = ?', [pid]);
        }
        console.log('Cleanup complete.');
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await connection.release();
        process.exit(0);
    }
}

cleanupEmptyProducts();
