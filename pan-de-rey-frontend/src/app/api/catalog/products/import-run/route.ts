import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/shared/utils/db';
import { getSupabaseAdmin } from '@/shared/utils/supabase';

// Helper to parse CSV row handling quotes and commas
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

export async function GET(request: NextRequest) {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const report = {
        totalRows: 0,
        successCount: 0,
        failCount: 0,
        errors: [] as string[],
        products: [] as any[]
    };

    const pool = getDbPool();
    const supabaseAdmin = getSupabaseAdmin();

    try {
        // 1. Fetch Categories and Attributes from Database
        const [categories]: any = await pool.query('SELECT id, name FROM public.categories');
        const [attributeValues]: any = await pool.query(`
            SELECT v.id, g.id as group_id, v.value 
            FROM public.attribute_values v
            JOIN public.attribute_groups g ON v.group_id = g.id
        `);

        // 2. Fetch the CSV from the public assets directory
        const csvUrl = `${baseUrl}/import/catalog_pedidosya_import.csv`;
        console.log(`[Import] Fetching CSV from: ${csvUrl}`);
        const csvRes = await fetch(csvUrl);
        if (!csvRes.ok) {
            throw new Error(`Failed to fetch CSV: ${csvRes.statusText}`);
        }
        const csvText = await csvRes.text();
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length <= 1) {
            throw new Error('CSV is empty or missing headers');
        }

        // Parse headers
        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
        const idxSku = headers.indexOf('sku');
        const idxName = headers.indexOf('nombre');
        const idxDesc = headers.indexOf('descripcion');
        const idxPrice = headers.indexOf('price');
        const idxStock = headers.indexOf('stock');
        const idxCat = headers.indexOf('categoria');
        const idxSubcat = headers.indexOf('subcategoria');
        const idxTipo = headers.indexOf('tipo');
        const idxRelleno = headers.indexOf('relleno');
        const idxCobertura = headers.indexOf('cobertura');

        // Loop rows (skipping header)
        for (let i = 1; i < lines.length; i++) {
            const rowVals = parseCsvLine(lines[i]);
            if (rowVals.length < 4) continue;

            report.totalRows++;
            const sku = rowVals[idxSku];
            const name = rowVals[idxName];
            const description = idxDesc !== -1 ? rowVals[idxDesc] : '';
            const price = parseFloat(rowVals[idxPrice]);
            const stock = parseInt(rowVals[idxStock], 10) || 0;

            if (!sku || !name || isNaN(price)) {
                report.failCount++;
                report.errors.push(`Row ${i}: Missing SKU, Name, or Price`);
                continue;
            }

            // Resolve category
            const catVal = idxCat !== -1 ? rowVals[idxCat] : '';
            const subcatVal = idxSubcat !== -1 ? rowVals[idxSubcat] : '';
            const tipoVal = idxTipo !== -1 ? rowVals[idxTipo] : '';

            const matchedCat = categories.find((c: any) => {
                const nameLower = c.name.toLowerCase().trim();
                if (tipoVal && nameLower === tipoVal.toLowerCase().trim()) return true;
                if (!tipoVal && subcatVal && nameLower === subcatVal.toLowerCase().trim()) return true;
                if (!tipoVal && !subcatVal && catVal && nameLower === catVal.toLowerCase().trim()) return true;
                return false;
            });

            if (!matchedCat) {
                report.failCount++;
                report.errors.push(`Row ${i} (${sku}): Could not resolve category (Cat: ${catVal}, Subcat: ${subcatVal}, Tipo: ${tipoVal})`);
                continue;
            }

            const categoryId = matchedCat.id;

            // Resolve attributes
            const attributes: number[] = [];
            if (idxRelleno !== -1 && rowVals[idxRelleno]) {
                const rellenoVal = rowVals[idxRelleno].toLowerCase().trim();
                const matchedAttr = attributeValues.find((v: any) => v.group_id === 1 && v.value.toLowerCase().trim() === rellenoVal);
                if (matchedAttr) attributes.push(matchedAttr.id);
            }

            if (idxCobertura !== -1 && rowVals[idxCobertura]) {
                const cobVal = rowVals[idxCobertura];
                const parts = cobVal.split('|').map(p => p.toLowerCase().trim());
                for (const part of parts) {
                    const matchedAttr = attributeValues.find((v: any) => v.group_id === 2 && v.value.toLowerCase().trim() === part);
                    if (matchedAttr) attributes.push(matchedAttr.id);
                }
            }

            // Database insertion (as INACTIVE)
            try {
                // Check if product exists
                const [existingProd]: any = await pool.query('SELECT id FROM public.products WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);
                let productId = '';

                if (existingProd.length > 0) {
                    productId = existingProd[0].id;
                    // Update existing
                    await pool.query(
                        'UPDATE public.products SET base_price = ?, category_id = ?, description = ? WHERE id = ?',
                        [price, categoryId, description || null, productId]
                    );

                    // Update inventory
                    const [existingVar]: any = await pool.query('SELECT id FROM public.product_variants WHERE product_id = ? LIMIT 1', [productId]);
                    if (existingVar.length > 0) {
                        const variantId = existingVar[0].id;
                        await pool.query(
                            'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2) ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity',
                            [variantId, stock]
                        );
                    }
                } else {
                    productId = crypto.randomUUID();
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    
                    // Insert product as INACTIVE (is_active = false)
                    await pool.query(
                        'INSERT INTO public.products (id, category_id, name, slug, base_price, description, is_active) VALUES (?, ?, ?, ?, ?, ?, false)',
                        [productId, categoryId, name, slug, price, description || null]
                    );

                    const variantId = crypto.randomUUID();
                    // Insert variant as INACTIVE
                    await pool.query(
                        'INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) VALUES (?, ?, ?, 0.00, ?, false)',
                        [variantId, productId, 'Clásico', sku]
                    );

                    await pool.query(
                        'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2)',
                        [variantId, stock]
                    );

                    for (const valId of attributes) {
                        await pool.query(
                            'INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?)',
                            [variantId, valId]
                        );
                    }
                }

                // 5. Image Upload Process (Bypassing RLS with Admin SDK client)
                const imageFilename = `${sku}-1.jpg`;
                const imageUrl = `${baseUrl}/import/${imageFilename}`;
                console.log(`[Import] Uploading image for SKU ${sku}: ${imageUrl}`);

                const imageRes = await fetch(imageUrl);
                if (imageRes.ok) {
                    const imageBlob = await imageRes.blob();
                    const arrayBuffer = await imageBlob.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const storagePath = `${productId}/1.jpg`;
                    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                        .from('products')
                        .upload(storagePath, buffer, {
                            upsert: true,
                            contentType: 'image/jpeg'
                        });

                    if (uploadError) {
                        console.error(`[Import] Image upload error for SKU ${sku}:`, uploadError.message);
                        report.errors.push(`Row ${i} (${sku}): Image upload failed - ${uploadError.message}`);
                    } else {
                        const publicUrl = supabaseAdmin.storage.from('products').getPublicUrl(storagePath).data.publicUrl;
                        await pool.query('UPDATE public.products SET image_url = ? WHERE id = ?', [publicUrl, productId]);
                        console.log(`[Import] Image set to: ${publicUrl}`);
                    }
                } else {
                    console.warn(`[Import] Image not found for SKU ${sku} at: ${imageUrl}`);
                    report.errors.push(`Row ${i} (${sku}): Image file not found at public path`);
                }

                report.successCount++;
                report.products.push({ sku, name, categoryId, price, stock });

            } catch (err: any) {
                report.failCount++;
                report.errors.push(`Row ${i} (${sku}): Database error - ${err.message}`);
            }
        }

    } catch (err: any) {
        return NextResponse.json({ error: err.message, report }, { status: 500 });
    }

    return NextResponse.json({ status: 'completed', report });
}
