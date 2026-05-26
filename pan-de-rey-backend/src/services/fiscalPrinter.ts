import { getDbPool } from '../db';

export const printFiscalTicket = async (orderId: string) => {
    try {
        const pool = getDbPool();
        
        // Fetch order details
        const [orderRows]: any = await pool.query(
            'SELECT o.*, u.FirstName, u.LastName FROM Orders o LEFT JOIN Users u ON o.UserId = u.Id WHERE o.Id = ?',
            [orderId]
        );
        
        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }
        
        const order = orderRows[0];
        
        const [itemRows]: any = await pool.query(
            'SELECT oi.*, pv.VariantName, p.Name FROM OrderItems oi JOIN ProductVariants pv ON oi.VariantId = pv.Id JOIN Products p ON pv.ProductId = p.Id WHERE oi.OrderId = ?',
            [orderId]
        );

        // Generar comandos ESC/POS para la impresora fiscal térmica
        let ticketCmd = '';
        ticketCmd += '\x1B\x40'; // Initialize printer
        ticketCmd += '\x1B\x61\x01'; // Center alignment
        ticketCmd += 'PAN DE REY\n';
        ticketCmd += 'Artesanal & Premium\n';
        ticketCmd += '--------------------------------\n';
        ticketCmd += `BOLETA ELECTRONICA: ${order.BoletaNumber || 'MOCK-12345'}\n`;
        ticketCmd += `Fecha: ${new Date(order.CreatedAt).toLocaleString()}\n`;
        ticketCmd += `Pedido: #${order.Id.substring(0, 8)}\n`;
        ticketCmd += `Cliente: ${order.FirstName || 'Invitado'} ${order.LastName || ''}\n`;
        ticketCmd += '--------------------------------\n';
        ticketCmd += '\x1B\x61\x00'; // Left alignment
        
        itemRows.forEach((item: any) => {
            const name = `${item.Name} (${item.VariantName})`;
            const priceQty = `${item.Quantity} x $${item.UnitPrice.toLocaleString()}`;
            const subtotal = `$${item.Subtotal.toLocaleString()}`;
            ticketCmd += `${name.substring(0, 32)}\n`;
            ticketCmd += `  ${priceQty.padEnd(20)} ${subtotal.padStart(10)}\n`;
        });
        
        ticketCmd += '--------------------------------\n';
        ticketCmd += '\x1B\x61\x02'; // Right alignment
        ticketCmd += `Subtotal: $${(order.TotalAmount - (order.ShippingCost || 0)).toLocaleString()}\n`;
        if (order.ShippingCost > 0) {
            ticketCmd += `Despacho: $${order.ShippingCost.toLocaleString()}\n`;
        }
        ticketCmd += `TOTAL COMPRA: $${order.TotalAmount.toLocaleString()}\n`;
        ticketCmd += '--------------------------------\n';
        ticketCmd += '\x1B\x61\x01'; // Center
        ticketCmd += '¡Gracias por su preferencia!\n\n\n\n';
        ticketCmd += '\x1D\x56\x01'; // Cut paper

        // En producción se conectaría al puerto local COM/USB/IP de la impresora fiscal
        // a través de un daemon de impresión local o puerto serial web
        console.log(`[Fiscal Printer ESC/POS Commands Generated for Order ${order.Id.substring(0, 8)}]:`);
        console.log(ticketCmd);

        // Update print status
        await pool.query(
            'UPDATE Orders SET FiscalPrinterStatus = ? WHERE Id = ?',
            ['Impreso', orderId]
        );

        return { success: true, commands: ticketCmd };
    } catch (err: any) {
        console.error('Fiscal printing failed:', err);
        const pool = getDbPool();
        await pool.query(
            'UPDATE Orders SET FiscalPrinterStatus = ? WHERE Id = ?',
            ['Error', orderId]
        );
        return { success: false, error: err.message };
    }
};
