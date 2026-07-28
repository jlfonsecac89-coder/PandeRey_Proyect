import { getDbPool } from '@/utils/db';
import { generateSlug } from '@/lib/normalize';
import { Category, CategoryDTO } from '@/types/Category';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export class CategoryService {
    
    static async getAllCategories(includeInactive: boolean = false): Promise<Category[]> {
        const pool = getDbPool();
        const query = includeInactive 
            ? 'SELECT * FROM public.categories ORDER BY name ASC'
            : 'SELECT * FROM public.categories WHERE is_active = 1 OR is_active = true ORDER BY name ASC';
        
        const [rows]: any = await pool.query(query);
        return rows.map((r: any) => ({
            id: r.id || r.Id,
            name: r.name || r.Name,
            slug: r.slug || r.Slug,
            parentId: r.parent_id !== undefined ? r.parent_id : r.ParentId,
            isActive: r.is_active || r.IsActive
        }));
    }

    static async createCategory(dto: CategoryDTO): Promise<number> {
        const pool = getDbPool();
        if (!dto.name) throw new ValidationError('Name is required');
        
        const slug = dto.slug || generateSlug(dto.name);
        
        const [res]: any = await pool.query(
            'INSERT INTO public.categories (name, slug, parent_id, is_active) VALUES (?, ?, ?, true) RETURNING id',
            [dto.name, slug, dto.parentId || null]
        );
        
        logger.info(`Categoría creada: ${dto.name}`);
        return res[0].id || res[0].Id;
    }
}
