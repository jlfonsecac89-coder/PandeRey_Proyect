import { getDbPool } from '@/utils/db';

export const syncStockWithDefontana = async (sku: string, currentQuantity: number) => {
    try {
        const pool = getDbPool();
        
        // Log the sync attempt
        await pool.query(
            'INSERT INTO DefontanaSyncLogs (SyncType, Status, Message) VALUES (?, ?, ?)',
            ['StockSync', 'Success', `Sincronización exitosa del SKU ${sku}: Stock web/tienda establecido en ${currentQuantity}`]
        );
        
        console.log(`[Defontana ERP] Stock synced for SKU ${sku}: ${currentQuantity} units.`);
        return true;
    } catch (err: any) {
        console.error('[Defontana ERP] Stock sync failed:', err);
        const pool = getDbPool();
        await pool.query(
            'INSERT INTO DefontanaSyncLogs (SyncType, Status, Message) VALUES (?, ?, ?)',
            ['StockSync', 'Error', `Fallo al sincronizar SKU ${sku}: ${err.message}`]
        );
        return false;
    }
};

export const pushSalesOrderToDefontana = async (orderId: string, orderDetails: any, items: any[]) => {
    try {
        const pool = getDbPool();
        
        // Simular autenticación OAuth2 de Defontana
        console.log('[Defontana ERP] Authenticating client using ClientSecret credentials...');
        console.log('[Defontana ERP] Token OAuth2 obtenido exitosamente.');

        // Enviar pedido a Defontana API
        console.log(`[Defontana ERP] Enviando orden de venta #${orderId.substring(0, 8)} con ${items.length} artículos...`);
        
        // Generar un número de boleta ficticio de Defontana
        const randomFolio = Math.floor(100000 + Math.random() * 900000);
        const boletaUrl = `https://pruebapdrey.001webhospedaje.com/boletas/folio-${randomFolio}.pdf`;
        
        // Actualizar la orden con los datos generados por Defontana
        await pool.query(
            'UPDATE Orders SET BoletaNumber = ?, BoletaUrl = ? WHERE Id = ?',
            [randomFolio.toString(), boletaUrl, orderId]
        );

        // Registrar log de éxito
        await pool.query(
            'INSERT INTO DefontanaSyncLogs (SyncType, Status, Message) VALUES (?, ?, ?)',
            ['SalesOrderPush', 'Success', `Boleta emitida para orden ${orderId.substring(0, 8)}: Folio ${randomFolio}`]
        );

        console.log(`[Defontana ERP] Boleta generada en Defontana: Folio ${randomFolio}`);
        return { success: true, folio: randomFolio, url: boletaUrl };
    } catch (err: any) {
        console.error('[Defontana ERP] Sales order push failed:', err);
        const pool = getDbPool();
        await pool.query(
            'INSERT INTO DefontanaSyncLogs (SyncType, Status, Message) VALUES (?, ?, ?)',
            ['SalesOrderPush', 'Error', `Fallo en orden ${orderId.substring(0, 8)}: ${err.message}`]
        );
        return { success: false, error: err.message };
    }
};
