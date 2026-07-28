import { getDbPool } from '@/shared/utils/db';
import { AttributeGroup, AttributeValue } from '@/domains/catalog/types/Category';
import { ValidationError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { normalizeString } from '@/shared/utils/normalize';

export class AttributeService {
    
    static async createGroup(name: string): Promise<number> {
        if (!name) throw new ValidationError('Name is required');
        const pool = getDbPool();
        const [res]: any = await pool.query(
            'INSERT INTO public.attribute_groups (name, is_active) VALUES (?, true) RETURNING id',
            [name]
        );
        logger.info(`Attribute group created: ${name}`);
        return res[0].id || res[0].Id;
    }

    static async createValue(groupId: number, value: string): Promise<number> {
        if (!groupId || !value) throw new ValidationError('Group ID and Value are required');
        const pool = getDbPool();
        const [res]: any = await pool.query(
            'INSERT INTO public.attribute_values (group_id, value) VALUES (?, ?) RETURNING id',
            [groupId, value]
        );
        logger.info(`Attribute value created: ${value} (Group: ${groupId})`);
        return res[0].id || res[0].Id;
    }

    static async findOrCreateGroup(name: string): Promise<number> {
        const pool = getDbPool();
        const normalizedName = normalizeString(name);
        const [existing]: any = await pool.query('SELECT id FROM public.attribute_groups WHERE LOWER(name) = ?', [normalizedName]);
        
        if (existing.length > 0) {
            return existing[0].id || existing[0].Id;
        }
        
        return await this.createGroup(name);
    }
}
