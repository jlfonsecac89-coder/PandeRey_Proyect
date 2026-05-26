import { Router } from 'express';
import { getDbPool } from '../db';

const router = Router();

// Webhook para sincronizar stock desde el POS físico (o Defontana)
router.post('/webhooks/pos', async (req, res) => {
    const { variantId, newQuantity, reason } = req.body;
    
    try {
        const pool = getDbPool();
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Update Inventory
            await connection.query(
                'UPDATE Inventory SET Quantity = ?, LastUpdated = UTC_TIMESTAMP() WHERE VariantId = ?',
                [newQuantity, variantId]
            );
                
            // Record Movement (generando UUID localmente en MySQL)
            await connection.query(
                'INSERT INTO InventoryMovements (Id, VariantId, QuantityChange, MovementType) VALUES (UUID(), ?, ?, ?)',
                [variantId, newQuantity, 'POS Sync: ' + (reason || 'Ajuste Manual')]
            );
                
            await connection.commit();
            res.json({ status: 'success', message: 'Stock synchronized' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
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
        const pool = getDbPool();
        
        // 1. Check current stock and safety buffer
        const [stockRows]: any = await pool.query(
            'SELECT Quantity, SafetyBuffer FROM Inventory WHERE VariantId = ?', 
            [variantId]
        );
            
        if (stockRows.length === 0) {
            return res.status(404).json({ error: 'Variant not found in inventory' });
        }
        
        const { Quantity, SafetyBuffer } = stockRows[0];
        
        // Safety Rule: Si stock cae del buffer de seguridad, marcar "Agotado"
        if ((Quantity - quantity) <= SafetyBuffer) {
            return res.status(400).json({ 
                error: 'Insufficient stock. Product is out of stock or reserved.',
                status: 'Agotado'
            });
        }
        
        // 2. Perform logical reservation (using connection for consistency)
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            await connection.query(
                'INSERT INTO InventoryMovements (Id, VariantId, QuantityChange, MovementType, ReferenceId) VALUES (UUID(), ?, ?, \'Reserva Temporal\', \'CART_SESSION\')',
                [variantId, -quantity]
            );
                
            // Reduce the actual quantity
            await connection.query(
                'UPDATE Inventory SET Quantity = Quantity - ? WHERE VariantId = ?',
                [quantity, variantId]
            );
            
            await connection.commit();
            res.json({ status: 'success', message: 'Stock reserved for 10 minutes' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reserve stock' });
    }
});

export default router;
