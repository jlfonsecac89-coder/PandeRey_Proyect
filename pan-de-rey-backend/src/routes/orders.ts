import { Router } from 'express';
import { getDbPool } from '../db';
import crypto from 'crypto';
import { sendStatusEmail, sendStatusWhatsApp } from '../services/notifications';
import { pushSalesOrderToDefontana } from '../services/defontana';
import { printFiscalTicket } from '../services/fiscalPrinter';

const router = Router();

// List all orders with client and item details for Admin Kanban
router.get('/', async (req, res) => {
    try {
        const pool = getDbPool();
        
        // Query to get all orders with User details (if associated)
        const [orderRows]: any = await pool.query(`
            SELECT o.Id, o.UserId, o.AddressId, o.CouponId, o.TotalAmount, o.Status, 
                   o.ShippingMethod, o.PickupTime, o.ShippingCost, o.Notes, o.CreatedAt,
                   u.FirstName, u.LastName, u.Phone, u.Email
            FROM Orders o
            LEFT JOIN Users u ON o.UserId = u.Id
            ORDER BY o.CreatedAt DESC
        `);
        
        // Query to get all order items
        const [itemRows]: any = await pool.query(`
            SELECT oi.OrderId, oi.Quantity, oi.UnitPrice, oi.Subtotal, p.Name as ProductName, pv.VariantName
            FROM OrderItems oi
            JOIN ProductVariants pv ON oi.VariantId = pv.Id
            JOIN Products p ON pv.ProductId = p.Id
        `);
        
        // Group items by OrderId
        const itemsByOrder: { [key: string]: any[] } = {};
        for (const item of itemRows) {
            if (!itemsByOrder[item.OrderId]) {
                itemsByOrder[item.OrderId] = [];
            }
            itemsByOrder[item.OrderId].push(item);
        }
        
        // Assemble orders with their corresponding items
        const orders = orderRows.map((order: any) => {
            const items = itemsByOrder[order.Id] || [];
            // Format items as a simple array of strings: e.g., ["2x Croissant (Clásico)", "1x Baguette (Clásico)"]
            const formattedItems = items.map((it: any) => 
                `${it.Quantity}x ${it.ProductName} (${it.VariantName})`
            );
            
            // Format time as locale string or human readable
            const date = new Date(order.CreatedAt);
            const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return {
                id: order.Id,
                customerName: order.FirstName ? `${order.FirstName} ${order.LastName || ''}`.trim() : 'Invitado',
                email: order.Email || 'No Registrado',
                phone: order.Phone || 'No Registrado',
                items: formattedItems,
                total: parseFloat(order.TotalAmount),
                status: order.Status,
                time: timeFormatted,
                createdAt: order.CreatedAt,
                shippingMethod: order.ShippingMethod
            };
        });
        
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve orders list' });
    }
});

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
        
        // Inventory alert counts
        const [inventoryAlerts]: any = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN Quantity = 0 THEN 1 ELSE 0 END), 0) as sinStock,
                COALESCE(SUM(CASE WHEN Quantity >= 1 AND Quantity <= 3 THEN 1 ELSE 0 END), 0) as critico,
                COALESCE(SUM(CASE WHEN Quantity >= 4 AND Quantity <= 5 THEN 1 ELSE 0 END), 0) as riesgo,
                COALESCE(SUM(CASE WHEN Quantity >= 6 AND Quantity <= 9 THEN 1 ELSE 0 END), 0) as alerta
            FROM Inventory
        `);

        // Pending orders count by shipping method
        const [pendingOrders]: any = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN ShippingMethod = 'Retiro' AND Status IN ('Nuevo', 'Preparando', 'Listo') THEN 1 ELSE 0 END), 0) as pendientesRetiro,
                COALESCE(SUM(CASE WHEN ShippingMethod = 'Delivery' AND Status IN ('Nuevo', 'Preparando', 'En Ruta') THEN 1 ELSE 0 END), 0) as pendientesEnvio
            FROM Orders
        `);

        // Sales distribution by category
        const [categoryDistribution]: any = await pool.query(`
            SELECT c.Name as name, SUM(oi.Subtotal) as value, SUM(oi.Quantity) as units
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
            kpis: {
                ventas: parseFloat(kpiRows[0].totalSales || 0),
                pedidos: parseInt(kpiRows[0].totalOrders || 0),
                unidades: parseInt(kpiRows[0].totalUnits || 0),
                alerta: parseInt(inventoryAlerts[0].alerta || 0),
                riesgo: parseInt(inventoryAlerts[0].riesgo || 0),
                critico: parseInt(inventoryAlerts[0].critico || 0),
                sinStock: parseInt(inventoryAlerts[0].sinStock || 0),
                pendientesRetiro: parseInt(pendingOrders[0].pendientesRetiro || 0),
                pendientesEnvio: parseInt(pendingOrders[0].pendientesEnvio || 0)
            },
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

// Seeder endpoint to populate MySQL database with simulated testing pool
router.get('/seed', async (req, res) => {
    try {
        const pool = getDbPool();
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Disable foreign key checks
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            
            // Truncate tables
            await connection.query('TRUNCATE TABLE Payments');
            await connection.query('TRUNCATE TABLE OrderItems');
            await connection.query('TRUNCATE TABLE Orders');
            await connection.query('TRUNCATE TABLE InventoryMovements');
            await connection.query('TRUNCATE TABLE Inventory');
            await connection.query('TRUNCATE TABLE ProductVariants');
            await connection.query('TRUNCATE TABLE Products');
            await connection.query('TRUNCATE TABLE Categories');
            await connection.query('TRUNCATE TABLE UserRoles');
            await connection.query('TRUNCATE TABLE Users');
            
            // Seed Categories
            const categories = [
                [1, 'Panadería', 'panaderia'],
                [2, 'Pastelería', 'pasteleria'],
                [3, 'Sin Gluten', 'sin-gluten'],
                [4, 'Bebestibles', 'bebestibles'],
                [5, 'Ofertas', 'offers']
            ];
            for (const cat of categories) {
                await connection.query('INSERT INTO Categories (Id, Name, Slug, IsActive) VALUES (?, ?, ?, 1)', cat);
            }
            
            // Seed Products & Variants & Inventory
            const products = [
                ['prod-1', 1, 'Pan de Masa Madre Clásico', 'pan-de-masa-madre-clasico', 4500, 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80'],
                ['prod-2', 1, 'Focaccia al Romero', 'focaccia-al-romero', 3800, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'],
                ['prod-3', 1, 'Baguette Tradicional', 'baguette-tradicional', 1800, 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80'],
                ['prod-6', 2, 'Croissant de Mantequilla', 'croissant-de-mantequilla', 2200, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80'],
                ['prod-7', 2, 'Pain au Chocolat', 'pain-au-chocolat', 2500, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&sat=1'],
                ['prod-10', 3, 'Brownie Sin Gluten', 'brownie-sin-gluten', 2500, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80'],
                ['prod-13', 4, 'Café Latte XL', 'cafe-latte-xl', 3500, 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80']
            ];
            
            for (const prod of products) {
                await connection.query(
                    'INSERT INTO Products (Id, CategoryId, Name, Slug, BasePrice, ImageUrl, IsActive) VALUES (?, ?, ?, ?, ?, ?, 1)',
                    prod
                );
                
                // Add default variant
                const variantId = `var-${prod[0]}`;
                const sku = `SKU-${String(prod[3]).toUpperCase()}`;
                await connection.query(
                    'INSERT INTO ProductVariants (Id, ProductId, VariantName, PriceAdjustment, SKU, IsActive) VALUES (?, ?, ?, 0.00, ?, 1)',
                    [variantId, prod[0], 'Clásico', sku]
                );
                
                // Inventory
                await connection.query(
                    'INSERT INTO Inventory (VariantId, Quantity, SafetyBuffer) VALUES (?, 100, 2)',
                    [variantId]
                );
            }
            
            // Add extra Sourdough Surtido variants
            await connection.query(
                'INSERT INTO ProductVariants (Id, ProductId, VariantName, PriceAdjustment, SKU, IsActive) VALUES (?, ?, ?, 2000.00, ?, 1)',
                ['var-prod-1-semillas', 'prod-1', 'Con Semillas', 'SKU-MASA-MADRE-SEMILLAS']
            );
            await connection.query(
                'INSERT INTO Inventory (VariantId, Quantity, SafetyBuffer) VALUES (?, 50, 2)',
                ['var-prod-1-semillas']
            );

            await connection.query(
                'INSERT INTO ProductVariants (Id, ProductId, VariantName, PriceAdjustment, SKU, IsActive) VALUES (?, ?, ?, 3500.00, ?, 1)',
                ['var-prod-1-nuez', 'prod-1', 'Nuez y Pasas (Agotado)', 'SKU-MASA-MADRE-NUEZ']
            );
            await connection.query(
                'INSERT INTO Inventory (VariantId, Quantity, SafetyBuffer) VALUES (?, 1, 2)',
                ['var-prod-1-nuez']
            );

            // Seed Users (CRM)
            const users = [
                ['user-1', 'maria.gonzalez@gmail.com', 'Maria', 'Gonzalez', '+56987654321'],
                ['user-2', 'juan.perez@yahoo.com', 'Juan', 'Perez', '+56911112222'],
                ['user-3', 'diego.munoz@outlook.com', 'Diego', 'Munoz', '+56933334444'],
                ['user-4', 'camila.rojas@gmail.com', 'Camila', 'Rojas', '+56955556666'],
                ['user-5', 'jose.fonseca@gmail.com', 'Jose', 'Fonseca', '+56977778888']
            ];
            
            for (const user of users) {
                const pash = crypto.createHash('sha256').update('password123').digest('hex');
                await connection.query(
                    'INSERT INTO Users (Id, Email, PasswordHash, FirstName, LastName, Phone) VALUES (?, ?, ?, ?, ?, ?)',
                    [user[0], user[1], pash, user[2], user[3], user[4]]
                );
                await connection.query('INSERT INTO UserRoles (UserId, RoleId) VALUES (?, 2)', [user[0]]);
            }

            // Seed Orders & Payments
            const orderCount = 28;
            const statuses = ['Nuevo', 'Preparando', 'Listo', 'En Ruta', 'Entregado', 'Cancelado'];
            const methods = ['Retiro', 'Delivery'];
            const paymentMethods = ['Webpay', 'Transferencia', 'Efectivo'];
            const variantsPool = [
                { id: 'var-prod-1', price: 4500 },
                { id: 'var-prod-2', price: 3800 },
                { id: 'var-prod-3', price: 1800 },
                { id: 'var-prod-6', price: 2200 },
                { id: 'var-prod-7', price: 2500 },
                { id: 'var-prod-10', price: 2500 },
                { id: 'var-prod-13', price: 3500 },
                { id: 'var-prod-1-semillas', price: 6500 }
            ];

            for (let i = 1; i <= orderCount; i++) {
                const orderId = `order-uuid-${i.toString().padStart(4, '0')}`;
                const userIndex = (i % users.length);
                const userId = users[userIndex][0];
                const daysAgo = Math.floor((i / orderCount) * 30);
                
                const status = i === 1 ? 'Nuevo' : i === 2 ? 'Preparando' : i === 3 ? 'Listo' : statuses[i % statuses.length];
                const method = methods[i % methods.length];
                const paymentMethod = paymentMethods[i % paymentMethods.length];
                
                const itemQuantity = 1 + (i % 3);
                let orderSubtotal = 0;
                const itemsToInsert = [];
                
                for (let j = 0; j < itemQuantity; j++) {
                    const variant = variantsPool[(i + j) % variantsPool.length];
                    const qty = 1 + (j % 2);
                    const sub = variant.price * qty;
                    orderSubtotal += sub;
                    itemsToInsert.push({
                        id: crypto.randomUUID(),
                        variantId: variant.id,
                        quantity: qty,
                        price: variant.price,
                        subtotal: sub
                    });
                }
                
                const shippingCost = method === 'Delivery' ? 3500 : 0;
                const totalAmount = orderSubtotal + shippingCost;
                
                await connection.query(
                    `INSERT INTO Orders (Id, UserId, TotalAmount, Status, ShippingMethod, ShippingCost, CreatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
                    [orderId, userId, totalAmount, status, method, shippingCost, daysAgo]
                );

                for (const item of itemsToInsert) {
                    await connection.query(
                        `INSERT INTO OrderItems (Id, OrderId, VariantId, Quantity, UnitPrice, Subtotal) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [item.id, orderId, item.variantId, item.quantity, item.price, item.subtotal]
                    );
                }

                const payStatus = status === 'Cancelado' ? 'Rechazado' : 'Aprobado';
                await connection.query(
                    `INSERT INTO Payments (Id, OrderId, Amount, PaymentMethod, Status, CreatedAt) 
                     VALUES (UUID(), ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
                    [orderId, totalAmount, paymentMethod, payStatus, daysAgo]
                );
            }
            
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            await connection.commit();
            res.json({ status: 'success', message: `Database successfully seeded with ${users.length} users, ${products.length} products, and ${orderCount} backdated orders.` });
        } catch (err: any) {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Database seeding failed', details: err.message });
    }
});

export default router;
