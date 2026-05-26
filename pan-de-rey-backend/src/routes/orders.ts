import { Router } from 'express';
import { getDbPool } from '../db';
import crypto from 'crypto';
import { sendStatusEmail, sendStatusWhatsApp } from '../services/notifications';
import { pushSalesOrderToDefontana } from '../services/defontana';
import { printFiscalTicket } from '../services/fiscalPrinter';

const router = Router();

// Checkout: Crear pedido, Pago y registrar en ERP
router.post('/checkout', async (req, res) => {
    const { userId, addressId, couponId, items, shippingMethod, pickupTime, notes, paymentMethod } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }
    
    try {
        const pool = getDbPool();
        const orderId = crypto.randomUUID();
        const paymentId = crypto.randomUUID();
        
        let subtotal = 0;
        const itemInserts: any[] = [];
        
        // 1. Calculate totals and check details
        for (const item of items) {
            const [variantRows]: any = await pool.query(
                'SELECT PriceAdjustment, BasePrice FROM ProductVariants pv JOIN Products p ON pv.ProductId = p.Id WHERE pv.Id = ?',
                [item.variantId]
            );
            
            if (variantRows.length === 0) {
                return res.status(404).json({ error: `Variant ${item.variantId} not found` });
            }
            
            const price = parseFloat(variantRows[0].BasePrice) + parseFloat(variantRows[0].PriceAdjustment);
            const qty = parseInt(item.quantity);
            const itemSubtotal = price * qty;
            subtotal += itemSubtotal;
            
            itemInserts.push([
                crypto.randomUUID(),
                orderId,
                item.variantId,
                qty,
                price,
                itemSubtotal
            ]);
        }
        
        // Shipping Cost calculation
        const shippingCost = shippingMethod === 'Delivery' ? 3500 : 0;
        const totalAmount = subtotal + shippingCost;
        
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // A. Create Order
            await connection.query(
                `INSERT INTO Orders (Id, UserId, AddressId, CouponId, TotalAmount, Status, ShippingMethod, PickupTime, ShippingCost, Notes) 
                 VALUES (?, ?, ?, ?, ?, 'Nuevo', ?, ?, ?, ?)`,
                [orderId, userId || null, addressId || null, couponId || null, totalAmount, shippingMethod, pickupTime || null, shippingCost, notes || null]
            );
            
            // B. Create Order Items
            for (const row of itemInserts) {
                await connection.query(
                    'INSERT INTO OrderItems (Id, OrderId, VariantId, Quantity, UnitPrice, Subtotal) VALUES (?, ?, ?, ?, ?, ?)',
                    row
                );
                
                // Reduce inventory stock
                await connection.query(
                    'UPDATE Inventory SET Quantity = Quantity - ? WHERE VariantId = ?',
                    [row[3], row[2]]
                );
                
                // Log inventory movement
                await connection.query(
                    'INSERT INTO InventoryMovements (Id, VariantId, QuantityChange, MovementType, ReferenceId) VALUES (UUID(), ?, ?, \'Venta\', ?)',
                    [row[2], -row[3], orderId]
                );
            }
            
            // C. Create Payment Record (Simulating payment transaction success)
            const gatewayToken = crypto.randomBytes(16).toString('hex');
            await connection.query(
                `INSERT INTO Payments (Id, OrderId, Amount, PaymentMethod, Status, TransactionId) 
                 VALUES (?, ?, ?, ?, 'Aprobado', ?)`,
                [paymentId, orderId, totalAmount, paymentMethod || 'Webpay', gatewayToken]
            );
            
            await connection.commit();
            connection.release();
            
            // D. Integrations post-commit (Defontana, Impresora Fiscal, Email)
            // Emitir boleta electrónica en ERP Defontana
            const defontanaRes = await pushSalesOrderToDefontana(orderId, { totalAmount }, items);
            
            // Imprimir boleta en impresora fiscal de panadería
            if (defontanaRes.success) {
                await printFiscalTicket(orderId);
            }
            
            // Fetch User Details to get the email address
            let customerEmail = 'panderey.cl@gmail.com'; // Default placeholder
            let customerPhone = '+56912345678';
            if (userId) {
                const [userRows]: any = await pool.query('SELECT Email, Phone FROM Users WHERE Id = ?', [userId]);
                if (userRows.length > 0) {
                    customerEmail = userRows[0].Email;
                    customerPhone = userRows[0].Phone || customerPhone;
                }
            }
            
            // Enviar correo electrónico de confirmación al cliente
            await sendStatusEmail(customerEmail, orderId, 'Confirmado (En Preparación)', totalAmount);
            await sendStatusWhatsApp(customerPhone, orderId, 'Confirmado');
            
            // E. AUTOMATIZACIÓN DE ESTADOS (Simulación Asíncrona en el Servidor)
            simulateOrderLifeCycle(orderId, shippingMethod, customerEmail, customerPhone, totalAmount);
            
            res.json({ 
                status: 'success', 
                message: 'Order checked out and settled successfully', 
                orderId,
                boletaNumber: defontanaRes.success ? defontanaRes.folio : null,
                boletaUrl: defontanaRes.success ? defontanaRes.url : null
            });
            
        } catch (err) {
            await connection.rollback();
            connection.release();
            throw err;
        }
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Checkout failed' });
    }
});

// Update Order Status manually (CMS)
router.post('/update-status', async (req, res) => {
    const { orderId, newStatus } = req.body;
    
    if (!orderId || !newStatus) {
        return res.status(400).json({ error: 'Order ID and New Status are required' });
    }
    
    try {
        const pool = getDbPool();
        
        await pool.query('UPDATE Orders SET Status = ? WHERE Id = ?', [newStatus, orderId]);
        
        // Fetch Order Amount and Client Details
        const [orderRows]: any = await pool.query(
            'SELECT o.TotalAmount, u.Email, u.Phone FROM Orders o LEFT JOIN Users u ON o.UserId = u.Id WHERE o.Id = ?',
            [orderId]
        );
        
        if (orderRows.length > 0) {
            const { TotalAmount, Email, Phone } = orderRows[0];
            const email = Email || 'panderey.cl@gmail.com';
            const phone = Phone || '+56912345678';
            
            // Dispatch notifications
            await sendStatusEmail(email, orderId, newStatus, TotalAmount);
            await sendStatusWhatsApp(phone, orderId, newStatus);
        }
        
        res.json({ status: 'success', message: `Order status updated to ${newStatus}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Analytics Dashboard Report (CRM and Sales analysis)
router.get('/analytics', async (req, res) => {
    try {
        const pool = getDbPool();
        
        // Total sales revenue and unit count
        const [kpiRows]: any = await pool.query(`
            SELECT 
                SUM(TotalAmount) as totalSales, 
                COUNT(Id) as totalOrders,
                (SELECT SUM(Quantity) FROM OrderItems) as totalUnits
            FROM Orders
            WHERE Status != 'Cancelado'
        `);
        
        // Sales distribution by category
        const [categoryDistribution]: any = await pool.query(`
            SELECT c.Name as name, SUM(oi.Subtotal) as value
            FROM OrderItems oi
            JOIN ProductVariants pv ON oi.VariantId = pv.Id
            JOIN Products p ON pv.ProductId = p.Id
            JOIN Categories c ON p.CategoryId = c.Id
            GROUP BY c.Name
        `);
        
        // Sales distribution by product (Top 5)
        const [productSales]: any = await pool.query(`
            SELECT p.Name as name, SUM(oi.Subtotal) as totalAmount, SUM(oi.Quantity) as totalUnits
            FROM OrderItems oi
            JOIN ProductVariants pv ON oi.VariantId = pv.Id
            JOIN Products p ON pv.ProductId = p.Id
            GROUP BY p.Name
            ORDER BY totalAmount DESC
            LIMIT 5
        `);
        
        // Recent signups (CRM)
        const [recentSignups]: any = await pool.query(`
            SELECT FirstName, LastName, Email, CreatedAt 
            FROM Users 
            ORDER BY CreatedAt DESC 
            LIMIT 5
        `);

        res.json({
            kpis: kpiRows[0],
            categoryDistribution,
            productSales,
            recentSignups
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve sales analytics' });
    }
});

// Helper function to simulate order lifecycle changes automatically
const simulateOrderLifeCycle = (orderId: string, shippingMethod: string, email: string, phone: string, total: number) => {
    const pool = getDbPool();
    
    // Step 1: transition to "Preparando" after 30 seconds
    setTimeout(async () => {
        try {
            await pool.query('UPDATE Orders SET Status = ? WHERE Id = ?', ['Preparando', orderId]);
            await sendStatusEmail(email, orderId, 'Preparando', total);
            await sendStatusWhatsApp(phone, orderId, 'Preparando');
            console.log(`[Order Lifecycle Sim] Order ${orderId.substring(0,8)} transitioned to: Preparando`);
            
            // Step 2: Transition to next step after another 60 seconds
            setTimeout(async () => {
                try {
                    const nextStatus = shippingMethod === 'Delivery' ? 'En Ruta' : 'Listo para Retiro';
                    await pool.query('UPDATE Orders SET Status = ? WHERE Id = ?', [nextStatus, orderId]);
                    await sendStatusEmail(email, orderId, nextStatus, total);
                    await sendStatusWhatsApp(phone, orderId, nextStatus);
                    console.log(`[Order Lifecycle Sim] Order ${orderId.substring(0,8)} transitioned to: ${nextStatus}`);
                    
                    // Step 3 (Only for Delivery): Transition to "Entregado" after another 60 seconds
                    if (shippingMethod === 'Delivery') {
                        setTimeout(async () => {
                            try {
                                await pool.query('UPDATE Orders SET Status = ? WHERE Id = ?', ['Entregado', orderId]);
                                await sendStatusEmail(email, orderId, 'Entregado', total);
                                await sendStatusWhatsApp(phone, orderId, 'Entregado');
                                console.log(`[Order Lifecycle Sim] Order ${orderId.substring(0,8)} transitioned to: Entregado`);
                            } catch (e) {
                                console.error('Sim error step 3:', e);
                            }
                        }, 60000);
                    }
                } catch (e) {
                    console.error('Sim error step 2:', e);
                }
            }, 60000);
            
        } catch (e) {
            console.error('Sim error step 1:', e);
        }
    }, 30000);
};

export default router;
