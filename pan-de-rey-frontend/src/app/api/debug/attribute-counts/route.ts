import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/shared/utils/db';

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const expectedSecret = process.env.E2E_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getDbPool();
    
    try {
        const query = `
          SELECT 'attribute_groups (vieja)' as tabla, COUNT(*) as count FROM public.attribute_groups
          UNION ALL SELECT 'attributes (nueva)', COUNT(*) FROM public.attributes
          UNION ALL SELECT 'attribute_values', COUNT(*) FROM public.attribute_values
          UNION ALL SELECT 'variant_attribute_values (vieja)', COUNT(*) FROM public.variant_attribute_values
          UNION ALL SELECT 'variant_attribute_mappings (nueva)', COUNT(*) FROM public.variant_attribute_mappings;
        `;
        const [rows] = await pool.query(query);
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
