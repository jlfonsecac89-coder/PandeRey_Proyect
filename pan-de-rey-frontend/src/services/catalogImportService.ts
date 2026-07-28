import { getDbPool } from '@/utils/db';

export interface BulkImportProduct {
    name: string;
    price: number;
    stock: number;
    categoryId?: number;
    rawCategory?: string;
    rawSubCategory?: string;
    rawType?: string;
    description?: string;
    image?: string;
    sku?: string;
    attributes?: number[];
    rawFillings?: string[];
    rawToppings?: string[];
}

export interface ImportReport {
    totalRows: number;
    successCount: number;
    failCount: number;
    errors: string[];
    generatedCategories: string[];
    generatedAttributes: string[];
}

// Normalization function: lowercase, trim, remove diacritics
function normalizeString(str: string): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function generateSlug(str: string): string {
    return normalizeString(str).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export class CatalogImportService {
    private pool: any;

    constructor() {
        this.pool = getDbPool();
    }

    public async processImport(products: BulkImportProduct[]): Promise<ImportReport> {
        const report: ImportReport = {
            totalRows: products.length,
            successCount: 0,
            failCount: 0,
            errors: [],
            generatedCategories: [],
            generatedAttributes: []
        };

        if (products.length === 0) return report;

        const connection = await this.pool.getConnection();
        
        try {
            // Load full cache to avoid N+1 queries
            const [categoriesRaw]: any = await connection.query('SELECT id, name, parent_id FROM public.categories');
            const [attributesRaw]: any = await connection.query('SELECT id, group_id, value FROM public.attribute_values');
            
            // Map cache for fast lookup by normalized name
            const categoryCache = new Map<string, number>();
            categoriesRaw.forEach((c: any) => {
                categoryCache.set(c.id.toString(), c.id);
            });

            // Re-build taxonomy map helper
            const getCategoryId = (name: string, parentId?: number) => {
                const normalized = normalizeString(name);
                const found = categoriesRaw.find((c: any) => 
                    normalizeString(c.name) === normalized && 
                    (parentId === undefined || c.parent_id == parentId) // abstract equality for null/undefined
                );
                return found ? found.id : null;
            };

            const attrCache = new Map<string, number>(); // format: "groupId|normalizedValue" -> id
            attributesRaw.forEach((a: any) => {
                attrCache.set(`${a.group_id}|${normalizeString(a.value)}`, a.id);
            });

            await connection.beginTransaction();

            for (let i = 0; i < products.length; i++) {
                const prod = products[i];
                try {
                    if (!prod.name || prod.price === undefined) {
                        throw new Error(`Faltan datos obligatorios (Nombre o Precio)`);
                    }

                    // 1. Resolve or Generate Taxonomy (Categories)
                    let finalCategoryId = prod.categoryId;

                    if (!finalCategoryId && prod.rawCategory) {
                        let parentId = null;
                        
                        // Root Category
                        let rootId = getCategoryId(prod.rawCategory);
                        if (!rootId) {
                            const [res]: any = await connection.query(
                                'INSERT INTO public.categories (name, slug, parent_id, is_active) VALUES (?, ?, NULL, true) RETURNING id',
                                [prod.rawCategory.trim(), generateSlug(prod.rawCategory)]
                            );
                            rootId = res[0].id || res[0].Id;
                            categoriesRaw.push({ id: rootId, name: prod.rawCategory.trim(), parent_id: null });
                            report.generatedCategories.push(prod.rawCategory.trim());
                        }
                        parentId = rootId;
                        finalCategoryId = rootId;

                        // SubCategory
                        if (prod.rawSubCategory) {
                            let subId = getCategoryId(prod.rawSubCategory, parentId);
                            if (!subId) {
                                const [res]: any = await connection.query(
                                    'INSERT INTO public.categories (name, slug, parent_id, is_active) VALUES (?, ?, ?, true) RETURNING id',
                                    [prod.rawSubCategory.trim(), generateSlug(prod.rawSubCategory), parentId]
                                );
                                subId = res[0].id || res[0].Id;
                                categoriesRaw.push({ id: subId, name: prod.rawSubCategory.trim(), parent_id: parentId });
                                report.generatedCategories.push(prod.rawSubCategory.trim());
                            }
                            parentId = subId;
                            finalCategoryId = subId;
                        }

                        // Type
                        if (prod.rawType) {
                            let typeId = getCategoryId(prod.rawType, parentId);
                            if (!typeId) {
                                const [res]: any = await connection.query(
                                    'INSERT INTO public.categories (name, slug, parent_id, is_active) VALUES (?, ?, ?, true) RETURNING id',
                                    [prod.rawType.trim(), generateSlug(prod.rawType), parentId]
                                );
                                typeId = res[0].id || res[0].Id;
                                categoriesRaw.push({ id: typeId, name: prod.rawType.trim(), parent_id: parentId });
                                report.generatedCategories.push(prod.rawType.trim());
                            }
                            finalCategoryId = typeId;
                        }
                    }

                    if (!finalCategoryId) {
                        throw new Error(`No se pudo resolver o crear la categoría`);
                    }

                    // 2. Resolve or Generate Attributes
                    const finalAttributes = new Set<number>(prod.attributes || []);

                    const resolveAttr = async (rawValues: string[] | undefined, groupId: number) => {
                        if (!rawValues) return;
                        for (const rawVal of rawValues) {
                            const norm = normalizeString(rawVal);
                            const key = `${groupId}|${norm}`;
                            let attrId = attrCache.get(key);
                            
                            if (!attrId) {
                                const [res]: any = await connection.query(
                                    'INSERT INTO public.attribute_values (group_id, value) VALUES (?, ?) RETURNING id',
                                    [groupId, rawVal.trim()]
                                );
                                attrId = res[0].id || res[0].Id;
                                attrCache.set(key, attrId as number);
                                report.generatedAttributes.push(rawVal.trim());
                            }
                            finalAttributes.add(attrId as number);
                        }
                    };

                    await resolveAttr(prod.rawFillings, 1);
                    await resolveAttr(prod.rawToppings, 2);

                    // 3. UPSERT Product (Search by normalized name)
                    const [existingProd]: any = await connection.query(
                        'SELECT id FROM public.products WHERE LOWER(name) = LOWER(?) LIMIT 1', 
                        [prod.name.trim()]
                    );

                    let productId = '';
                    let variantId = '';

                    if (existingProd.length > 0) {
                        // UPDATE
                        productId = existingProd[0].id || existingProd[0].Id;
                        await connection.query(
                            'UPDATE public.products SET base_price = ?, category_id = ?, description = ?, image_url = COALESCE(?, image_url) WHERE id = ?',
                            [prod.price, finalCategoryId, prod.description || null, prod.image || null, productId]
                        );

                        const [existingVar]: any = await connection.query('SELECT id FROM public.product_variants WHERE product_id = ? LIMIT 1', [productId]);
                        if (existingVar.length > 0) {
                            variantId = existingVar[0].id || existingVar[0].Id;
                            await connection.query(
                                'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2) ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity',
                                [variantId, prod.stock || 0]
                            );
                        }
                    } else {
                        // INSERT
                        const [prodInsert]: any = await connection.query(
                            'INSERT INTO public.products (id, category_id, name, slug, base_price, image_url, description, is_active) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?, false) RETURNING id',
                            [finalCategoryId, prod.name.trim(), generateSlug(prod.name), prod.price, prod.image || null, prod.description || null]
                        );
                        productId = prodInsert[0].id || prodInsert[0].Id;

                        const skuToUse = prod.sku || `SKU-${generateSlug(prod.name).toUpperCase().substring(0, 8)}-${Math.floor(1000 + Math.random() * 9000)}`;
                        
                        const [varInsert]: any = await connection.query(
                            'INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) VALUES (gen_random_uuid(), ?, ?, 0.00, ?, false) RETURNING id',
                            [productId, 'Clásico', skuToUse]
                        );
                        variantId = varInsert[0].id || varInsert[0].Id;

                        await connection.query(
                            'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2)',
                            [variantId, prod.stock || 0]
                        );
                    }

                    // 4. Update Attributes Mapping (Clear and re-insert)
                    if (variantId) {
                        await connection.query('DELETE FROM public.variant_attribute_values WHERE variant_id = ?', [variantId]);
                        for (const valId of Array.from(finalAttributes)) {
                            await connection.query(
                                'INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?)',
                                [variantId, valId]
                            );
                        }
                    }

                    report.successCount++;
                } catch (rowErr: any) {
                    report.failCount++;
                    report.errors.push(`Fila ${i + 1} (${prod.name}): ${rowErr.message}`);
                }
            }

            // Commit transaction
            await connection.commit();
            
        } catch (err: any) {
            await connection.rollback();
            throw err;
        } finally {
            await connection.release();
        }

        return report;
    }
}
