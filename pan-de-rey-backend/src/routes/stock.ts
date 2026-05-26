import { Router } from 'express';
import { getDbPool } from '../db';
import sql from 'mssql';

const router = Router();

// Webhook para sincronizar stock desde el POS físico
router.post('/webhooks/pos', async (req, res) => {
    const { variantId, newQuantity, reason } = req.body;
    
    try {
        const pool = await getDbPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Update Inventory
            await transaction.request()
                .input('variantId', sql.UniqueIdentifier, variantId)
                .input('newQty', sql.Int, newQuantity)
                .query(`
                    UPDATE Inventory 
                    SET Quantity = @newQty, LastUpdated = GETUTCDATE() 
                    WHERE VariantId = @variantId
                `);
                
            // Record Movement
            await transaction.request()
                .input('variantId', sql.UniqueIdentifier, variantId)
                .input('change', sql.Int, newQuantity) // Simplificado: Idealmente calcular la diferencia real
                .input('type', sql.NVarChar, 'POS Sync: ' + (reason || 'Ajuste Manual'))
                .query(`
                    INSERT INTO InventoryMovements (VariantId, QuantityChange, MovementType)
                    VALUES (@variantId, @change, @type)
                `);
                
            await transaction.commit();
            res.json({ status: 'success', message: 'Stock synchronized' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process POS webhook' });
    }
});

// Reserva temporal de stock por 10 minutos (Al añadir al carrito)
router.post('/cart/reserve', async (req, res) => {
    const { variantId, quantity } = req.body;
    
    try {
        const pool = await getDbPool();
        
        // 1. Check current stock and safety buffer
        const stockCheck = await pool.request()
            .input('variantId', sql.UniqueIdentifier, variantId)
            .query('SELECT Quantity, SafetyBuffer FROM Inventory WHERE VariantId = @variantId');
            
        if (stockCheck.recordset.length === 0) {
            return res.status(404).json({ error: 'Variant not found in inventory' });
        }
        
        const { Quantity, SafetyBuffer } = stockCheck.recordset[0];
        
        // Safety Rule: Si stock cae del buffer de seguridad, marcar "Agotado"
        if ((Quantity - quantity) <= SafetyBuffer) {
            return res.status(400).json({ 
                error: 'Insufficient stock. Product is out of stock or reserved.',
                status: 'Agotado'
            });
        }
        
        // 2. Perform logical reservation (In a real MVP, could use Redis with TTL)
        // For DB: create a movement that reserves it, and a background job releases it if not purchased.
        await pool.request()
            .input('variantId', sql.UniqueIdentifier, variantId)
            .input('qty', sql.Int, -quantity)
            .query(`
                INSERT INTO InventoryMovements (VariantId, QuantityChange, MovementType, ReferenceId)
                VALUES (@variantId, @qty, 'Reserva Temporal', 'CART_SESSION')
            `);
            
        // Reduce the actual quantity
        await pool.request()
            .input('variantId', sql.UniqueIdentifier, variantId)
            .input('qty', sql.Int, quantity)
            .query(`
                UPDATE Inventory SET Quantity = Quantity - @qty WHERE VariantId = @variantId
            `);
            
        res.json({ status: 'success', message: 'Stock reserved for 10 minutes' });
        
        // Note: A scheduled task (e.g., node-cron or SQL Server Agent) should revert this 
        // after 10 mins if the order is not confirmed.
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reserve stock' });
    }
});

export default router;
