import { getDbPool } from '@/shared/utils/db';
import { generateSlug } from '@/shared/utils/normalize';
import { Product, ProductDTO, ProductVariant } from '@/domains/catalog/types/Product';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { logger } from '@/shared/logger';

export class ProductService {
    
    static async getProductById(id: string): Promise<Product | null> {
        const pool = getDbPool();
        const [rows]: any = await pool.query('SELECT * FROM public.products WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        
        const r = rows[0];
        return {
            id: r.id || r.Id,
            categoryId: r.category_id || r.CategoryId,
            name: r.name || r.Name,
            slug: r.slug || r.Slug,
            basePrice: r.base_price || r.BasePrice,
            imageUrl: r.image_url || r.ImageUrl,
            description: r.description || r.Description,
            isActive: r.is_active || r.IsActive
        };
    }

    static async createProduct(dto: ProductDTO): Promise<string> {
        if (!dto.name) throw new ValidationError('Product name is required');
        const pool = getDbPool();
        const slug = dto.slug || generateSlug(dto.name);
        
        const [res]: any = await pool.query(
            'INSERT INTO public.products (name, slug, base_price, category_id, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?, true) RETURNING id',
            [dto.name, slug, dto.price || 0, dto.categoryId || null, dto.image || null, dto.description || null]
        );
        
        const productId = res[0].id || res[0].Id;
        logger.info(`Producto creado: ${dto.name} (${productId})`);
        return productId;
    }

    static async hardDeleteProduct(id: string): Promise<void> {
        if (!id) throw new ValidationError('Product ID is required');
        const pool = getDbPool();
        
        const [variants]: any = await pool.query('SELECT id FROM public.product_variants WHERE product_id = ?', [id]);
        for (const v of variants) {
            const vid = v.id || v.Id;
            await pool.query('DELETE FROM public.inventory WHERE variant_id = ?', [vid]);
            await pool.query('DELETE FROM public.variant_attribute_values WHERE variant_id = ?', [vid]);
            await pool.query('DELETE FROM public.product_variants WHERE id = ?', [vid]);
        }
        await pool.query('DELETE FROM public.products WHERE id = ?', [id]);
        logger.info(`Producto eliminado físicamente: ${id}`);
    }
}
