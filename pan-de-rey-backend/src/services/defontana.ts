import { getDbPool } from '../db';

export const syncStockWithDefontana = async (sku: string, currentQuantity: number) => {
    try {
        console.log(`[Defontana ERP Mock] Stock sync request received for SKU ${sku}: ${currentQuantity} units.`);
        return true;
    } catch (err: any) {
        console.error('[Defontana ERP Mock] Stock sync failed:', err);
        return false;
    }
};

export const pushSalesOrderToDefontana = async (orderId: string, orderDetails: any, items: any[]) => {
    try {
        const pool = getDbPool();
        
        console.log('[Defontana ERP Mock] Authenticating client using ClientSecret credentials...');
        console.log('[Defontana ERP Mock] Token OAuth2 obtenido exitosamente.');
        console.log(`[Defontana ERP Mock] Enviando orden de venta #${orderId.substring(0, 8)} con ${items.length} artículos...`);
        
        const randomFolio = Math.floor(100000 + Math.random() * 900000);
        const boletaUrl = `https://pruebapdrey.001webhospedaje.com/boletas/folio-${randomFolio}.pdf`;
        
        await pool.query(
            'UPDATE Orders SET BoletaNumber = ?, BoletaUrl = ? WHERE Id = ?',
            [randomFolio.toString(), boletaUrl, orderId]
        );

        console.log(`[Defontana ERP Mock] Boleta generada en Defontana: Folio ${randomFolio}`);
        return { success: true, folio: randomFolio, url: boletaUrl };
    } catch (err: any) {
        console.error('[Defontana ERP Mock] Sales order push failed:', err);
        return { success: false, error: err.message };
    }
};
