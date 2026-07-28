import { getDbPool } from '@/shared/utils/db';
import { Inventory, InventoryAdjustDTO } from '@/domains/inventory/types/Inventory';
import { ValidationError } from '@/shared/errors';
import { logger } from '@/shared/logger';

export class InventoryService {
    
    static async getInventory(variantId: string): Promise<any | null> {
        const pool = getDbPool();
        const [rows]: any = await pool.query(`
            SELECT 
                i.*, 
                p.created_at as product_created_at
            FROM public.inventory i
            JOIN public.product_variants pv ON i.variant_id = pv.id
            JOIN public.products p ON pv.product_id = p.id
            WHERE i.variant_id = ?
        `, [variantId]);
        if (rows.length === 0) return null;
        
        return {
            variantId: rows[0].variant_id || rows[0].VariantId,
            quantity: rows[0].quantity || rows[0].Quantity,
            safetyBuffer: rows[0].safety_buffer || rows[0].SafetyBuffer,
            lastStockDate: rows[0].updated_at || rows[0].UpdatedAt || rows[0].product_created_at,
            productCreatedAt: rows[0].product_created_at || rows[0].ProductCreatedAt
        };
    }

    static async updateInventory(variantId: string, quantity: number): Promise<void> {
        if (!variantId) throw new ValidationError('Variant ID is required');
        const pool = getDbPool();
        
        await pool.query(
            `INSERT INTO public.inventory (variant_id, quantity, updated_at) 
             VALUES (?, ?, NOW()) 
             ON CONFLICT (variant_id) 
             DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
            [variantId, quantity]
        );
        logger.info(`Inventario actualizado para ${variantId}: ${quantity}`);
    }
}
