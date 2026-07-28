import { getDbPool } from '@/utils/db';
import { Product } from '@/types/Product';

export class CatalogService {
    
    static async getAllProducts(includeInactive: boolean = false, categoryId?: string): Promise<any[]> {
        const pool = getDbPool();
        
        let query = `
            SELECT 
                p.id, 
                p.category_id as "categoryId",
                c.name as "categoryName",
                c.slug as category, 
                p.name, 
                p.slug, 
                p.base_price as price, 
                p.image_url as image, 
                p.description,
                p.is_active as "isActive",
                pv.id as "variantId",
                pv.sku as sku,
                COALESCE(i.quantity, 0) as stock,
                (
                    SELECT json_agg(vav.attribute_value_id)
                    FROM public.variant_attribute_values vav
                    WHERE vav.variant_id = pv.id
                ) as attributes
            FROM public.products p
            LEFT JOIN public.categories c ON p.category_id = c.id
            LEFT JOIN public.product_variants pv ON p.id = pv.product_id AND pv.variant_name = 'Clásico'
            LEFT JOIN public.inventory i ON pv.id = i.variant_id
            WHERE 1=1
        `;
        const queryParams: any[] = [];
        
        if (!includeInactive) {
            query += ' AND p.is_active = 1';
        }
        if (categoryId) {
            query += ' AND p.category_id = ?';
            queryParams.push(parseInt(categoryId));
        }
        query += ' ORDER BY p.name ASC';
        
        const [rows] = await pool.query(query, queryParams);
        return rows;
    }
}

