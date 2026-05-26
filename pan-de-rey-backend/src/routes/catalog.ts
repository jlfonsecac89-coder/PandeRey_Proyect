import { Router } from 'express';
import { getDbPool } from '../db';
import sql from 'mssql';

const router = Router();

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const pool = await getDbPool();
        const result = await pool.request().query('SELECT * FROM Categories WHERE IsActive = 1');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get products by category
router.get('/products', async (req, res) => {
    const { categoryId } = req.query;
    try {
        const pool = await getDbPool();
        let query = 'SELECT * FROM Products WHERE IsActive = 1';
        const request = pool.request();
        
        if (categoryId) {
            query += ' AND CategoryId = @categoryId';
            request.input('categoryId', sql.Int, parseInt(categoryId as string));
        }
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product details with variants and stock
router.get('/products/:id', async (req, res) => {
    try {
        const pool = await getDbPool();
        const productId = req.params.id;
        
        // Fetch Product
        const productResult = await pool.request()
            .input('id', sql.UniqueIdentifier, productId)
            .query('SELECT * FROM Products WHERE Id = @id');
            
        if (productResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = productResult.recordset[0];
        
        // Fetch Variants and Inventory
        const variantsResult = await pool.request()
            .input('productId', sql.UniqueIdentifier, productId)
            .query(`
                SELECT v.*, i.Quantity, i.SafetyBuffer 
                FROM ProductVariants v
                LEFT JOIN Inventory i ON v.Id = i.VariantId
                WHERE v.ProductId = @productId AND v.IsActive = 1
            `);
            
        // Map available stock: Si Quantity <= SafetyBuffer, está "Agotado" (lógicamente)
        product.variants = variantsResult.recordset.map(v => ({
            ...v,
            isAvailable: v.Quantity > v.SafetyBuffer,
            stockStatus: v.Quantity > v.SafetyBuffer ? 'Disponible' : 'Agotado'
        }));

        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch product details' });
    }
});

export default router;
