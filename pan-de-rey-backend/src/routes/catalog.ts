import { Router } from 'express';
import { getDbPool } from '../db';

const router = Router();

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const pool = getDbPool();
        const [rows] = await pool.query('SELECT * FROM Categories WHERE IsActive = 1');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get products by category
router.get('/products', async (req, res) => {
    const { categoryId } = req.query;
    try {
        const pool = getDbPool();
        let query = 'SELECT * FROM Products WHERE IsActive = 1';
        const params: any[] = [];
        
        if (categoryId) {
            query += ' AND CategoryId = ?';
            params.push(parseInt(categoryId as string));
        }
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product details with variants and stock
router.get('/products/:id', async (req, res) => {
    try {
        const pool = getDbPool();
        const productId = req.params.id;
        
        // Fetch Product
        const [productRows]: any = await pool.query('SELECT * FROM Products WHERE Id = ?', [productId]);
            
        if (productRows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = productRows[0];
        
        // Fetch Variants and Inventory
        const [variantsRows]: any = await pool.query(`
            SELECT v.*, i.Quantity, i.SafetyBuffer 
            FROM ProductVariants v
            LEFT JOIN Inventory i ON v.Id = i.VariantId
            WHERE v.ProductId = ? AND v.IsActive = 1
        `, [productId]);
            
        // Map available stock: Si Quantity <= SafetyBuffer, está "Agotado" (lógicamente)
        product.variants = variantsRows.map((v: any) => ({
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
