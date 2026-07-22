import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDbPool } from '@/utils/db';
import { syncStockWithDefontana, pushSalesOrderToDefontana } from '@/services/defontana';
import { printFiscalTicket } from '@/services/fiscalPrinter';
import { sendStatusEmail, sendStatusWhatsApp } from '@/services/notifications';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { getSupabaseAdmin } from '@/utils/supabase';

// Simulate WMS Order SLA timing & lifecycle transitions
const simulateOrderLifeCycle = async (orderId: string, shippingMethod: string, email: string, phone: string, total: number) => {
    setTimeout(async () => {
        try {
            const pool = getDbPool();
            await pool.query("UPDATE orders SET status = 'Preparando' WHERE id = ?", [orderId]);
            await sendStatusEmail(email, orderId, 'Preparando', total);
            console.log(`[Order Lifecycle Sim] Order ${orderId.substring(0,8)} transitioned to: Preparando`);
            
            setTimeout(async () => {
                try {
                    const nextStatus = shippingMethod === 'Delivery' ? 'En Ruta' : 'Listo para Retiro';
                    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [nextStatus, orderId]);
                    await sendStatusEmail(email, orderId, nextStatus, total);
                    console.log(`[Order Lifecycle Sim] Order ${orderId.substring(0,8)} transitioned to: ${nextStatus}`);
                    
                    if (shippingMethod === 'Delivery') {
                        setTimeout(async () => {
                            try {
                                await pool.query("UPDATE orders SET status = 'Entregado' WHERE id = ?", [orderId]);
                                await sendStatusEmail(email, orderId, 'Entregado', total);
                                console.log(`[Order Lifecycle Sim] Order ${orderId.substring(0,8)} transitioned to: Entregado`);
                            } catch (e) {
                                console.error('Sim error step 3:', e);
                            }
                        }, 60000);
                    }
                } catch (e) {
                    console.error('Sim error step 2:', e);
                }
            }, 60000);
        } catch (e) {
            console.error('Sim error step 1:', e);
        }
    }, 30000);
};

// Confirm order and trigger integrations
async function confirmOrderAndTriggerIntegrations(orderId: string): Promise<{ success: boolean; boletaNumber?: string | null; boletaUrl?: string | null }> {
    const pool = getDbPool();
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    let order;
    let assignedOrderNumber = null;

    try {
        const [orderRows]: any = await connection.query(
            'SELECT order_number, status, total_amount, user_id, shipping_method FROM public.orders WHERE id = ? FOR UPDATE',
            [orderId]
        );

        if (orderRows.length === 0) {
            await connection.rollback();
            connection.release();
            throw new Error(`Order ${orderId} not found`);
        }

        order = orderRows[0];
        assignedOrderNumber = order.order_number;

        if (order.status !== 'Pendiente') {
            console.log(`[Order Confirmation] Order ${orderId} is already in status ${order.status}. Skipping.`);
            await connection.commit();
            connection.release();
            
            const [existingRows]: any = await pool.query('SELECT boleta_number, boleta_url FROM public.orders WHERE id = ?', [orderId]);
            return { 
                success: true, 
                boletaNumber: existingRows.length > 0 ? existingRows[0].boleta_number : null,
                boletaUrl: existingRows.length > 0 ? existingRows[0].boleta_url : null
            };
        }

        // Generate a new sequence number if order_number is not assigned yet
        if (!assignedOrderNumber) {
            const [seqRows]: any = await connection.query("SELECT nextval('public.order_number_seq') as seq");
            const seqVal = seqRows[0]?.seq || 1000;
            assignedOrderNumber = `PDR-${String(seqVal).padStart(6, '0')}`;
        }

        await connection.query(
            "UPDATE public.orders SET status = 'Nuevo', order_number = ? WHERE id = ?",
            [assignedOrderNumber, orderId]
        );
        await connection.query(
            "UPDATE public.payments SET status = 'Aprobado' WHERE order_id = ?",
            [orderId]
        );

        await connection.commit();
        connection.release();
    } catch (txErr) {
        await connection.rollback();
        connection.release();
        throw txErr;
    }

    const [itemRows]: any = await pool.query(
        'SELECT variant_id, quantity, unit_price, subtotal FROM public.order_items WHERE order_id = ?',
        [orderId]
    );
    const items = itemRows.map((item: any) => ({
        variantId: item.variant_id,
        quantity: item.quantity,
        price: item.unit_price
    }));
    
    let boletaNumber: string | null = null;
    let boletaUrl: string | null = null;
    try {
        const defontanaRes = await pushSalesOrderToDefontana(orderId, { totalAmount: order.total_amount }, items);
        if (defontanaRes.success) {
            boletaNumber = defontanaRes.folio ? String(defontanaRes.folio) : null;
            boletaUrl = defontanaRes.url || null;
            await pool.query('UPDATE orders SET boleta_number = ?, boleta_url = ? WHERE id = ?', [boletaNumber, boletaUrl, orderId]);
            await printFiscalTicket(orderId);
        }
    } catch (integrationErr) {
        console.error('[Confirmation Integrations Error] Defontana/Printer failed:', integrationErr);
    }
    
    let customerEmail = 'panderey.cl@gmail.com';
    let customerPhone = '+56912345678';
    if (order.user_id) {
        const [userRows]: any = await pool.query('SELECT email, phone FROM profiles WHERE id = ?', [order.user_id]);
        if (userRows.length > 0) {
            customerEmail = userRows[0].email;
            customerPhone = userRows[0].phone || customerPhone;
        }
    }
    
    try {
        await sendStatusEmail(customerEmail, orderId, 'Confirmado (En Preparación)', order.total_amount);
        await sendStatusWhatsApp(customerPhone, orderId, 'Confirmado');
    } catch (notifErr) {
        console.error('[Confirmation Notifications Error] Email/WhatsApp failed:', notifErr);
    }
    
    simulateOrderLifeCycle(orderId, order.shipping_method, customerEmail, customerPhone, order.total_amount);
    return { success: true, boletaNumber, boletaUrl };
}

async function ensureDbSeeded(pool: any) {
    try {
        const [countRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM public.products');
        const count = parseInt(countRows[0]?.cnt || countRows[0]?.CNT || 0);
        if (count > 0) return;

        console.log('[Auto-Seeding]: public.products table is empty. Seeding catalog products...');
        
        // Seed Categories
        const categories = [
            { id: 1, name: 'Panadería', slug: 'bakery' },
            { id: 2, name: 'Pastelería', slug: 'pastry' },
            { id: 3, name: 'Sin Gluten', slug: 'gluten-free' },
            { id: 4, name: 'Bebestibles', slug: 'drinks' },
            { id: 5, name: 'Ofertas', slug: 'offers' }
        ];
        for (const cat of categories) {
            await pool.query('INSERT INTO public.categories (id, name, slug, is_active) VALUES (?, ?, ?, 1) ON CONFLICT (id) DO NOTHING', [cat.id, cat.name, cat.slug]);
        }

        // Seed Products
        const seededProducts = [
            { id: 'd1c93f01-ea94-4003-ac94-070212ac9401', categoryId: 1, name: 'Pan de Masa Madre Clásico', slug: 'pan-de-masa-madre-clasico', price: 4500, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80', description: 'Nuestro pan insignia. Elaborado con una masa madre de 5 años de antigüedad, harinas orgánicas y una fermentación lenta de 48 horas.' },
            { id: 'd1c93f02-ea94-4003-ac94-070212ac9402', categoryId: 1, name: 'Focaccia al Romero', slug: 'focaccia-al-romero', price: 3800, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', description: 'Deliciosa focaccia artesanal aromatizada con romero fresco y sal marina.' },
            { id: 'd1c93f03-ea94-4003-ac94-070212ac9403', categoryId: 1, name: 'Baguette Tradicional', slug: 'baguette-tradicional', price: 1800, image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80', description: 'Baguette al estilo francés con corteza crujiente y miga aireada.' },
            { id: 'd1c93f04-ea94-4003-ac94-070212ac9404', categoryId: 1, name: 'Pan de Centeno Alemán', slug: 'pan-de-centeno-aleman', price: 4200, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&crop=edges', description: 'Pan denso de centeno, ideal para sándwiches.' },
            { id: 'd1c93f05-ea94-4003-ac94-070212ac9405', categoryId: 1, name: 'Ciabatta Rústica', slug: 'ciabatta-rustica', price: 2200, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&crop=faces', description: 'Pan ciabatta rústico, perfecto para bruschetta.' },
            
            { id: 'd1c93f06-ea94-4003-ac94-070212ac9406', categoryId: 2, name: 'Croissant de Mantequilla', slug: 'croissant-de-mantequilla', price: 2200, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80', description: 'Clásico croissant hojaldrado con 100% mantequilla.' },
            { id: 'd1c93f07-ea94-4003-ac94-070212ac9407', categoryId: 2, name: 'Pain au Chocolat', slug: 'pain-au-chocolat', price: 2500, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&sat=1', description: 'Hojaldre relleno de chocolate semi-amargo.' },
            { id: 'd1c93f08-ea94-4003-ac94-070212ac9408', categoryId: 2, name: 'Tarta de Limón y Merengue', slug: 'tarta-de-limon-y-merengue', price: 3800, image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80', description: 'Tarta de limón con merengue italiano tostado.' },
            { id: 'd1c93f09-ea94-4003-ac94-070212ac9409', categoryId: 2, name: 'Roll de Canela Glaseado', slug: 'roll-de-canela-glaseado', price: 2800, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80&sat=2', description: 'Roll de canela húmedo con glaseado de queso crema.' },

            { id: 'd1c93f10-ea94-4003-ac94-070212ac9410', categoryId: 3, name: 'Brownie Sin Gluten', slug: 'brownie-sin-gluten', price: 2500, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', description: 'Brownie de chocolate intenso apto para celíacos.' },
            { id: 'd1c93f11-ea94-4003-ac94-070212ac9411', categoryId: 3, name: 'Pan de Molde Keto', slug: 'pan-de-molde-keto', price: 5500, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&bri=1', description: 'Pan de molde bajo en carbohidratos.' },
            { id: 'd1c93f12-ea94-4003-ac94-070212ac9412', categoryId: 3, name: 'Galletas de Almendra', slug: 'galletas-de-almendra', price: 1800, image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=1', description: 'Galletas crujientes de harina de almendras.' },

            { id: 'd1c93f13-ea94-4003-ac94-070212ac9413', categoryId: 4, name: 'Café Latte XL', slug: 'cafe-latte-xl', price: 3500, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80', description: 'Café espresso con leche vaporizada.' },
            { id: 'd1c93f14-ea94-4003-ac94-070212ac9414', categoryId: 4, name: 'Espresso Doble', slug: 'espresso-doble', price: 2200, image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80', description: 'Dos cargas de café espresso puro.' },
            { id: 'd1c93f15-ea94-4003-ac94-070212ac9415', categoryId: 4, name: 'Cappuccino Italiano', slug: 'cappuccino-italiano', price: 3200, image: 'https://images.unsplash.com/photo-1495474472207-464a8d960c8b?w=800&q=80', description: 'Espresso, leche vaporizada y abundante espuma.' },
            { id: 'd1c93f16-ea94-4003-ac94-070212ac9416', categoryId: 4, name: 'Té Matcha Orgánico', slug: 'te-matcha-organico', price: 3800, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80&hue=1', description: 'Té matcha japonés de grado ceremonial.' },

            { id: 'd1c93f17-ea94-4003-ac94-070212ac9417', categoryId: 5, name: 'Combo 2x1 Baguette', slug: 'combo-2x1-baguette', price: 3200, image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80&bri=-1', description: 'Lleva dos baguettes por el precio de una.' },
            { id: 'd1c93f18-ea94-4003-ac94-070212ac9418', categoryId: 5, name: 'Desayuno Promocional', slug: 'desayuno-promocional', price: 5500, image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80', description: 'Café mediano más croissant de mantequilla.' }
        ];

        for (const prod of seededProducts) {
            await pool.query(
                'INSERT INTO public.products (id, category_id, name, slug, base_price, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT (id) DO NOTHING',
                [prod.id, prod.categoryId, prod.name, prod.slug, prod.price, prod.image, prod.description]
            );

            const variantId = prod.id.replace(/94(\d\d)$/, '84$1');
            const sku = `SKU-${prod.slug.toUpperCase()}`;
            await pool.query(
                'INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) VALUES (?, ?, ?, 0.00, ?, 1) ON CONFLICT (id) DO NOTHING',
                [variantId, prod.id, 'Clásico', sku]
            );

            await pool.query(
                'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, 100, 2) ON CONFLICT (variant_id) DO NOTHING',
                [variantId]
            );
        }
    } catch (err) {
        console.error('[ensureDbSeeded Error]:', err);
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const { path } = await params;
    const url = new URL(request.url);
    const pool = getDbPool();
    await ensureDbSeeded(pool);

    if (!path || path.length === 0) {
        return NextResponse.json({ message: 'Pan de Rey API v1' });
    }

    const routeStr = path.join('/');

    try {
        // 0. GET /api/test-db
        if (routeStr === 'test-db') {
            const dbEnvKeys = Object.keys(process.env).filter(k => 
                k.startsWith('DB_') || k.startsWith('POSTGRES_') || k.startsWith('DATABASE_')
            );
            try {
                const [rows]: any = await pool.query('SELECT 1 + 1 as val');
                return NextResponse.json({ 
                    status: 'success', 
                    message: 'Database connected successfully', 
                    val: rows[0]?.val || rows[0]?.Val,
                    detectedEnvVars: dbEnvKeys
                });
            } catch (err: any) {
                return NextResponse.json({ 
                    status: 'error', 
                    message: 'Database connection failed', 
                    error: err.message,
                    code: err.code,
                    detectedEnvVars: dbEnvKeys
                }, { status: 500 });
            }
        }

        // 0.2. GET /api/test-e2e
        if (routeStr === 'test-e2e') {
            const results: string[] = [];
            const log = (msg: string) => {
                results.push(msg);
                console.log(msg);
            };

            // Security: block in production, require secret token
            const isProd = process.env.VERCEL_ENV === 'production';
            const secretParam = url.searchParams.get('secret');
            const expectedSecret = process.env.E2E_SECRET;

            if (isProd) {
                return NextResponse.json({ error: 'Not Found' }, { status: 404 });
            }
            if (!expectedSecret || secretParam !== expectedSecret) {
                return NextResponse.json({ error: 'Unauthorized: Invalid or missing secret token configuration' }, { status: 401 });
            }

            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                log("🔌 Conectando a la base de datos (Transacción Iniciada)...");
                
                log("\n=======================================================");
                log("🕵️ PRUEBA 1: Crear Producto con Atributo en Catálogo");
                log("=======================================================");
                
                const productId = 'f0000000-0000-0000-0000-000000000001';
                await conn.query("DELETE FROM public.products WHERE id = ?", [productId]);
                
                let catId;
                const [catRes]: any = await conn.query("SELECT id FROM public.categories LIMIT 1");
                if (catRes.length === 0) {
                    const tempCatId = 999;
                    await conn.query("INSERT INTO public.categories (id, name, slug, is_active) VALUES (?, 'Temp E2E', 'temp-e2e', 1) ON CONFLICT DO NOTHING", [tempCatId]);
                    catId = tempCatId;
                } else {
                    catId = catRes[0].id;
                }
                
                await conn.query(
                    `INSERT INTO public.products (id, category_id, name, slug, base_price, description, is_active) 
                     VALUES (?, ?, 'Pan de Prueba E2E', 'pan-de-prueba-e2e', 4990, 'Pan crujiente de prueba', 1)`,
                    [productId, catId]
                );
                log(`✅ Producto de prueba creado con ID: ${productId}`);

                const variantId = 'f0000000-0000-0000-0000-000000000002';
                await conn.query("DELETE FROM public.product_variants WHERE id = ?", [variantId]);
                await conn.query(
                    `INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) 
                     VALUES (?, ?, 'Clásico', 0.00, 'SKU-PRUEBA-E2E', 1)`,
                    [variantId, productId]
                );
                log("✅ Variante 'Clásico' creada con SKU: SKU-PRUEBA-E2E");

                const [attrValRes]: any = await conn.query("SELECT id FROM public.attribute_values LIMIT 1");
                if (attrValRes.length > 0) {
                    const valId = attrValRes[0].Id || attrValRes[0].id;
                    await conn.query(
                        "INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                        [variantId, valId]
                    );
                    log(`✅ Variante vinculada con atributo ID: ${valId}`);
                }

                log("\n=======================================================");
                log("🕵️ PRUEBA 2: Ajuste de Stock con Auditoría Separada");
                log("=======================================================");
                
                await conn.query(
                    `INSERT INTO public.inventory (variant_id, quantity, safety_buffer) 
                     VALUES (?, 10, 2) 
                     ON CONFLICT (variant_id) DO UPDATE SET quantity = 10`,
                    [variantId]
                );

                const change = 5;
                const responsible = 'Runner E2E';
                const reason = 'Verificación automatizada de Fase 2.5';
                
                await conn.query(
                    "UPDATE public.inventory SET quantity = quantity + ? WHERE variant_id = ?",
                    [change, variantId]
                );
                
                const movId = 'f0000000-0000-0000-0000-000000000003';
                await conn.query("DELETE FROM public.inventory_movements WHERE id = ?", [movId]);
                await conn.query(
                    `INSERT INTO public.inventory_movements (id, variant_id, quantity_change, movement_type, reference_id, performed_by, reason) 
                     VALUES (?, ?, ?, 'Ajuste Test', 'Firmado por Script', ?, ?)`,
                    [movId, variantId, change, responsible, reason]
                );
                
                const [movVerify]: any = await conn.query("SELECT * FROM public.inventory_movements WHERE id = ?", [movId]);
                const perfBy = movVerify[0].PerformedBy || movVerify[0].performed_by;
                const reas = movVerify[0].Reason || movVerify[0].reason;
                log(`✅ Movimiento guardado: Responsable: ${perfBy} | Motivo: ${reas}`);

                log("\n=======================================================");
                log("🕵️ PRUEBA 3: Creación y Aplicación de Cupones");
                log("=======================================================");
                
                const couponCode = 'TEST_E2E_99';
                await conn.query("DELETE FROM public.coupons WHERE code = ?", [couponCode]);
                await conn.query(
                    `INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, max_uses, is_active) 
                     VALUES (?, 'percentage', 20, 2000, 100, 1)`,
                    [couponCode]
                );
                
                const [couponVerify]: any = await conn.query("SELECT * FROM public.coupons WHERE code = ?", [couponCode]);
                const cp = couponVerify[0];
                const originalTotal = 10000;
                const cpType = cp.Discount_type || cp.DiscountType || cp.discount_type;
                const cpVal = Number(cp.Discount_value || cp.DiscountValue || cp.discount_value);
                const discount = cpType === 'percentage' ? (originalTotal * cpVal) / 100 : cpVal;
                const finalTotal = originalTotal - discount;
                log(`✅ Cupón '${couponCode}' de tipo '${cpType}' creado.`);
                log(`✅ Cálculo de descuento: $${originalTotal} - $${discount} = $${finalTotal} (OK)`);

                log("\n=======================================================");
                log("🕵️ PRUEBA 4: Generación de Correlativo Atómico e Idempotente");
                log("=======================================================");
                
                const orderId = 'f0000000-0000-0000-0000-000000000004';
                await conn.query("DELETE FROM public.orders WHERE id = ?", [orderId]);
                await conn.query(
                    `INSERT INTO public.orders (id, total_amount, status, shipping_method, order_number) 
                     VALUES (?, 15000, 'Pendiente', 'Pickup', NULL)`,
                    [orderId]
                );
                
                const assignTrackingNumberInTrans = async (connObj: any, oId: string) => {
                    const [selectRes]: any = await connObj.query("SELECT order_number FROM public.orders WHERE id = ? FOR UPDATE", [oId]);
                    let tracking = selectRes[0].OrderNumber || selectRes[0].order_number;
                    if (!tracking) {
                        const [seqRes]: any = await connObj.query("SELECT nextval('public.order_number_seq') as seq");
                        const nextVal = seqRes[0].Seq || seqRes[0].seq || seqRes[0].nextval;
                        tracking = `PDR-${String(nextVal).padStart(6, '0')}`;
                        await connObj.query("UPDATE public.orders SET order_number = ? WHERE id = ?", [tracking, oId]);
                    }
                    return tracking;
                };

                const num1 = await assignTrackingNumberInTrans(conn, orderId);
                log(`➡️ Intento 1: Correlativo asignado: ${num1}`);
                const num2 = await assignTrackingNumberInTrans(conn, orderId);
                log(`➡️ Intento 2 (Verificación de idempotencia): Correlativo: ${num2}`);
                
                if (num1 === num2) {
                    log(`✅ Idempotencia CONFIRMADA: Ambos intentos devolvieron el mismo correlativo.`);
                } else {
                    throw new Error("Falla de idempotencia");
                }

                log("\n=======================================================");
                log("🕵️ PRUEBA 5: Fusión de Cuentas de Invitados en Registro");
                log("=======================================================");
                
                const guestEmail = 'guest_fusion_test@example.com';
                const guestId = 'f0000000-0000-0000-0000-000000000005';
                const authUserId = 'f0000000-0000-0000-0000-000000000006';
                
                await conn.query("DELETE FROM public.user_roles WHERE user_id IN (?, ?)", [guestId, authUserId]);
                await conn.query("DELETE FROM public.profiles WHERE id IN (?, ?)", [guestId, authUserId]);
                
                await conn.query(
                    `INSERT INTO public.profiles (id, email, first_name, last_name, phone, is_guest) 
                     VALUES (?, ?, 'Juan', 'Invitado', '+56911223344', true)`,
                    [guestId, guestEmail]
                );
                
                const guestOrderId = 'f0000000-0000-0000-0000-000000000007';
                await conn.query("DELETE FROM public.orders WHERE id = ?", [guestOrderId]);
                await conn.query(
                    `INSERT INTO public.orders (id, user_id, total_amount, status, shipping_method) 
                     VALUES (?, ?, 5000, 'Pendiente', 'Pickup')`,
                    [guestOrderId, guestId]
                );
                
                const guestAddrId = 'f0000000-0000-0000-0000-000000000008';
                await conn.query("DELETE FROM public.addresses WHERE id = ?", [guestAddrId]);
                await conn.query(
                    `INSERT INTO public.addresses (id, user_id, street, number, commune, is_default) 
                     VALUES (?, ?, 'Avenida Siempreviva', '742', 'Santiago', 1)`,
                    [guestAddrId, guestId]
                );
                
                log("➡️ Simulando registro y fusión...");
                
                const [guestRes]: any = await conn.query("SELECT id FROM public.profiles WHERE email = ? AND is_guest = true LIMIT 1", [guestEmail]);
                const oldGuestId = guestRes.length > 0 ? (guestRes[0].Id || guestRes[0].id) : null;
                
                if (oldGuestId) {
                    // Renombrar temporalmente el email del invitado para liberar la clave única
                    await conn.query("UPDATE public.profiles SET email = email || '.fused-' || ? WHERE id = ?", [oldGuestId, oldGuestId]);
                }

                // Insertar el nuevo perfil de usuario registrado
                await conn.query(
                    `INSERT INTO public.profiles (id, email, first_name, last_name, phone, is_guest) 
                     VALUES (?, ?, 'Juan', 'Registrado', '+56911223344', false)`,
                    [authUserId, guestEmail]
                );

                if (oldGuestId) {
                    // Mudar registros
                    await conn.query("UPDATE public.addresses SET user_id = ? WHERE user_id = ?", [authUserId, oldGuestId]);
                    await conn.query("UPDATE public.orders SET user_id = ? WHERE user_id = ?", [authUserId, oldGuestId]);
                    await conn.query("DELETE FROM public.user_roles WHERE user_id = ?", [oldGuestId]);
                    // Ahora sí podemos borrar de forma segura el perfil temporal de invitado
                    await conn.query("DELETE FROM public.profiles WHERE id = ?", [oldGuestId]);
                }
                
                const [orderCheck]: any = await conn.query("SELECT user_id FROM public.orders WHERE id = ?", [guestOrderId]);
                const [addrCheck]: any = await conn.query("SELECT user_id FROM public.addresses WHERE id = ?", [guestAddrId]);
                const [oldProfileCheck]: any = await conn.query("SELECT id FROM public.profiles WHERE id = ?", [guestId]);
                
                const orderCheckUserId = orderCheck[0]?.UserId || orderCheck[0]?.user_id;
                const addrCheckUserId = addrCheck[0]?.UserId || addrCheck[0]?.user_id;

                if (orderCheckUserId === authUserId && addrCheckUserId === authUserId && oldProfileCheck.length === 0) {
                    log("✅ Fusión de cuentas EXITOSA");
                } else {
                    throw new Error("Falla en la verificación de fusión");
                }

                log("\n=======================================================");
                log("🎉 ¡TODAS LAS PRUEBAS DE E2E PASARON CON ÉXITO! 🎉");
                log("=======================================================");

                // ROLLBACK para dejar la DB 100% limpia sin residuos
                await conn.rollback();
                log("🔄 Transacción revertida con éxito (ROLLBACK) - La base de datos queda limpia.");

                return NextResponse.json({ status: 'success', logs: results });
            } catch (err: any) {
                await conn.rollback();
                log(`❌ ERROR DURANTE LAS PRUEBAS (Transacción Revertida): ${err.message}`);
                return NextResponse.json({ status: 'error', logs: results, error: err.message }, { status: 500 });
            } finally {
                conn.release();
            }
        }

        // 0.1. GET /api/orders/seed
        if (routeStr === 'orders/seed') {
            try {
                // Truncate tables using CASCADE to respect foreign key constraints in Postgres
                await pool.query('TRUNCATE TABLE public.payments CASCADE');
                await pool.query('TRUNCATE TABLE public.order_items CASCADE');
                await pool.query('TRUNCATE TABLE public.orders CASCADE');
                await pool.query('TRUNCATE TABLE public.inventory_movements CASCADE');
                await pool.query('TRUNCATE TABLE public.inventory CASCADE');
                await pool.query('TRUNCATE TABLE public.product_variants CASCADE');
                await pool.query('TRUNCATE TABLE public.products CASCADE');
                await pool.query('TRUNCATE TABLE public.categories CASCADE');

                // Seed Categories
                const categories = [
                    { id: 1, name: 'Panadería', slug: 'bakery' },
                    { id: 2, name: 'Pastelería', slug: 'pastry' },
                    { id: 3, name: 'Sin Gluten', slug: 'gluten-free' },
                    { id: 4, name: 'Bebestibles', slug: 'drinks' },
                    { id: 5, name: 'Ofertas', slug: 'offers' }
                ];
                for (const cat of categories) {
                    await pool.query('INSERT INTO public.categories (id, name, slug, is_active) VALUES (?, ?, ?, 1)', [cat.id, cat.name, cat.slug]);
                }

                // Seed Products
                const seededProducts = [
                    { id: 'd1c93f01-ea94-4003-ac94-070212ac9401', categoryId: 1, name: 'Pan de Masa Madre Clásico', slug: 'pan-de-masa-madre-clasico', price: 4500, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80', description: 'Nuestro pan insignia. Elaborado con una masa madre de 5 años de antigüedad, harinas orgánicas y una fermentación lenta de 48 horas.' },
                    { id: 'd1c93f02-ea94-4003-ac94-070212ac9402', categoryId: 1, name: 'Focaccia al Romero', slug: 'focaccia-al-romero', price: 3800, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', description: 'Deliciosa focaccia artesanal aromatizada con romero fresco y sal marina.' },
                    { id: 'd1c93f03-ea94-4003-ac94-070212ac9403', categoryId: 1, name: 'Baguette Tradicional', slug: 'baguette-tradicional', price: 1800, image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80', description: 'Baguette al estilo francés con corteza crujiente y miga aireada.' },
                    { id: 'd1c93f04-ea94-4003-ac94-070212ac9404', categoryId: 1, name: 'Pan de Centeno Alemán', slug: 'pan-de-centeno-aleman', price: 4200, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&crop=edges', description: 'Pan denso de centeno, ideal para sándwiches.' },
                    { id: 'd1c93f05-ea94-4003-ac94-070212ac9405', categoryId: 1, name: 'Ciabatta Rústica', slug: 'ciabatta-rustica', price: 2200, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&crop=faces', description: 'Pan ciabatta rústico, perfecto para bruschetta.' },
                    
                    { id: 'd1c93f06-ea94-4003-ac94-070212ac9406', categoryId: 2, name: 'Croissant de Mantequilla', slug: 'croissant-de-mantequilla', price: 2200, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80', description: 'Clásico croissant hojaldrado con 100% mantequilla.' },
                    { id: 'd1c93f07-ea94-4003-ac94-070212ac9407', categoryId: 2, name: 'Pain au Chocolat', slug: 'pain-au-chocolat', price: 2500, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&sat=1', description: 'Hojaldre relleno de chocolate semi-amargo.' },
                    { id: 'd1c93f08-ea94-4003-ac94-070212ac9408', categoryId: 2, name: 'Tarta de Limón y Merengue', slug: 'tarta-de-limon-y-merengue', price: 3800, image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80', description: 'Tarta de limón con merengue italiano tostado.' },
                    { id: 'd1c93f09-ea94-4003-ac94-070212ac9409', categoryId: 2, name: 'Roll de Canela Glaseado', slug: 'roll-de-canela-glaseado', price: 2800, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80&sat=2', description: 'Roll de canela húmedo con glaseado de queso crema.' },

                    { id: 'd1c93f10-ea94-4003-ac94-070212ac9410', categoryId: 3, name: 'Brownie Sin Gluten', slug: 'brownie-sin-gluten', price: 2500, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80', description: 'Brownie de chocolate intenso apto para celíacos.' },
                    { id: 'd1c93f11-ea94-4003-ac94-070212ac9411', categoryId: 3, name: 'Pan de Molde Keto', slug: 'pan-de-molde-keto', price: 5500, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&bri=1', description: 'Pan de molde bajo en carbohidratos.' },
                    { id: 'd1c93f12-ea94-4003-ac94-070212ac9412', categoryId: 3, name: 'Galletas de Almendra', slug: 'galletas-de-almendra', price: 1800, image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=1', description: 'Galletas crujientes de harina de almendras.' },

                    { id: 'd1c93f13-ea94-4003-ac94-070212ac9413', categoryId: 4, name: 'Café Latte XL', slug: 'cafe-latte-xl', price: 3500, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80', description: 'Café espresso con leche vaporizada.' },
                    { id: 'd1c93f14-ea94-4003-ac94-070212ac9414', categoryId: 4, name: 'Espresso Doble', slug: 'espresso-doble', price: 2200, image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80', description: 'Dos cargas de café espresso puro.' },
                    { id: 'd1c93f15-ea94-4003-ac94-070212ac9415', categoryId: 4, name: 'Cappuccino Italiano', slug: 'cappuccino-italiano', price: 3200, image: 'https://images.unsplash.com/photo-1495474472207-464a8d960c8b?w=800&q=80', description: 'Espresso, leche vaporizada y abundante espuma.' },
                    { id: 'd1c93f16-ea94-4003-ac94-070212ac9416', categoryId: 4, name: 'Té Matcha Orgánico', slug: 'te-matcha-organico', price: 3800, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80&hue=1', description: 'Té matcha japonés de grado ceremonial.' },

                    { id: 'd1c93f17-ea94-4003-ac94-070212ac9417', categoryId: 5, name: 'Combo 2x1 Baguette', slug: 'combo-2x1-baguette', price: 3200, image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80&bri=-1', description: 'Lleva dos baguettes por el precio de una.' },
                    { id: 'd1c93f18-ea94-4003-ac94-070212ac9418', categoryId: 5, name: 'Desayuno Promocional', slug: 'desayuno-promocional', price: 5500, image: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=800&q=80', description: 'Café mediano más croissant de mantequilla.' }
                ];

                for (const prod of seededProducts) {
                    await pool.query(
                        'INSERT INTO public.products (id, category_id, name, slug, base_price, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
                        [prod.id, prod.categoryId, prod.name, prod.slug, prod.price, prod.image, prod.description]
                    );

                    // Predefined Variant UUID mapped from Product UUID
                    const variantId = prod.id.replace(/94(\d\d)$/, '84$1');
                    const sku = `SKU-${prod.slug.toUpperCase()}`;
                    await pool.query(
                        'INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) VALUES (?, ?, ?, 0.00, ?, 1)',
                        [variantId, prod.id, 'Clásico', sku]
                    );

                    // Seed Inventory
                    await pool.query(
                        'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, 100, 2)',
                        [variantId]
                    );
                }

                return NextResponse.json({ status: 'success', message: 'Database successfully seeded with categories, products, and default variants.' });
            } catch (err: any) {
                console.error('[API Seeding Error]:', err);
                return NextResponse.json({ error: err.message || 'Seeding failed' }, { status: 500 });
            }
        }

        // 1. GET /api/catalog/categories
        if (routeStr === 'catalog/categories') {
            const includeInactive = url.searchParams.get('all') === 'true';
            const query = includeInactive 
                ? 'SELECT * FROM Categories ORDER BY name ASC'
                : 'SELECT * FROM Categories WHERE IsActive = 1 ORDER BY name ASC';
            const [rows] = await pool.query(query);
            return NextResponse.json(rows);
        }

        // 1.1 GET /api/catalog/attributes/groups
        if (routeStr === 'catalog/attributes/groups') {
            const [rows] = await pool.query('SELECT * FROM public.attribute_groups ORDER BY name ASC');
            return NextResponse.json(rows);
        }

        // 1.2 GET /api/catalog/attributes/values
        if (routeStr === 'catalog/attributes/values') {
            const groupId = url.searchParams.get('groupId');
            let query = 'SELECT * FROM public.attribute_values';
            const params = [];
            if (groupId) {
                query += ' WHERE group_id = ?';
                params.push(parseInt(groupId));
            }
            query += ' ORDER BY value ASC';
            const [rows] = await pool.query(query, params);
            return NextResponse.json(rows);
        }

        // 1.3 GET /api/catalog/categories/attributes
        if (routeStr === 'catalog/categories/attributes') {
            const categoryId = url.searchParams.get('categoryId');
            if (!categoryId) {
                return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
            }
            const [rows] = await pool.query(`
                SELECT ag.* 
                FROM public.attribute_groups ag
                JOIN public.category_attribute_groups cag ON ag.id = cag.attribute_group_id
                WHERE cag.category_id = ?
            `, [parseInt(categoryId)]);
            return NextResponse.json(rows);
        }

        // 2. GET /api/catalog/products
        if (routeStr === 'catalog/products') {
            const categoryId = url.searchParams.get('categoryId');
            const showAll = url.searchParams.get('all') === 'true';
            
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
            
            if (!showAll) {
                query += ' AND p.is_active = 1';
            }
            if (categoryId) {
                query += ' AND p.category_id = ?';
                queryParams.push(parseInt(categoryId));
            }
            query += ' ORDER BY p.name ASC';
            
            const [rows] = await pool.query(query, queryParams);
            return NextResponse.json(rows);
        }

        // 3. GET /api/catalog/products/:id
        if (path[0] === 'catalog' && path[1] === 'products' && path[2]) {
            const productId = path[2];
            const [productRows]: any = await pool.query('SELECT * FROM Products WHERE Id = ?', [productId]);
            if (productRows.length === 0) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }
            const product = productRows[0];
            const [variantsRows]: any = await pool.query(`
                SELECT v.*, i.Quantity, i.SafetyBuffer 
                FROM ProductVariants v
                LEFT JOIN Inventory i ON v.Id = i.VariantId
                WHERE v.ProductId = ? AND v.IsActive = 1
            `, [productId]);
            product.variants = variantsRows.map((v: any) => ({
                ...v,
                isAvailable: v.Quantity > v.SafetyBuffer,
                stockStatus: v.Quantity > v.SafetyBuffer ? 'Disponible' : 'Agotado'
            }));
            return NextResponse.json(product);
        }

        // 4. GET /api/stock
        if (routeStr === 'stock') {
            const [rows] = await pool.query(`
                SELECT v.Id, v.VariantName, p.Name as ProductName, v.SKU, i.Quantity, i.SafetyBuffer 
                FROM ProductVariants v 
                JOIN Products p ON v.ProductId = p.Id 
                LEFT JOIN Inventory i ON v.Id = i.VariantId
            `);
            return NextResponse.json(rows);
        }

        // 5. GET /api/settings
        if (routeStr === 'settings') {
            const [rows]: any = await pool.query('SELECT SettingKey, SettingValue FROM SystemSettings');
            const config: Record<string, string> = {};
            rows.forEach((r: any) => {
                config[r.SettingKey] = r.SettingValue;
            });
            config['mercadoPagoPublicKey'] = process.env.MERCADOPAGO_PUBLIC_KEY || 'APP_USR-6f4ded52-e3d9-4e3e-ac07-8bd4655a9df9';
            config['mercadoPagoAccessToken'] = 'APP_USR-46172256••••••••••••••••••••••••••••';
            return NextResponse.json(config);
        }

        // 6. GET /api/crm/clients
        if (routeStr === 'crm/clients') {
            const [rows]: any = await pool.query(`
                SELECT u.Id, u.Email, u.FirstName, u.LastName, u.Phone, u.CreatedAt, 
                COUNT(o.Id) as OrdersCount, COALESCE(SUM(o.TotalAmount), 0) as TotalSpent 
                FROM Users u 
                LEFT JOIN Orders o ON u.Id = o.UserId 
                GROUP BY u.Id, u.Email, u.FirstName, u.LastName, u.Phone, u.CreatedAt 
                ORDER BY u.CreatedAt DESC
            `);
            return NextResponse.json(rows);
        }

        // 7. GET /api/crm/addresses/:userId
        if (path[0] === 'crm' && path[1] === 'addresses' && path[2]) {
            const userId = path[2];
            const [rows] = await pool.query('SELECT * FROM Addresses WHERE UserId = ?', [userId]);
            return NextResponse.json(rows);
        }

        // 7.1 GET /api/inventory
        if (routeStr === 'inventory') {
            const [rows] = await pool.query(`
                SELECT 
                    pv.id as "variantId", 
                    pv.variant_name as "variantName", 
                    p.name as "productName", 
                    p.image_url as "imageUrl",
                    COALESCE(i.quantity, 0) as quantity, 
                    COALESCE(i.safety_buffer, 2) as "safetyBuffer",
                    i.last_updated as "lastUpdated"
                FROM public.product_variants pv
                JOIN public.products p ON pv.product_id = p.id
                LEFT JOIN public.inventory i ON pv.id = i.variant_id
                WHERE p.is_active = 1
                ORDER BY p.name ASC
            `);
            return NextResponse.json(rows);
        }

        // 7.2 GET /api/inventory/movements
        if (routeStr === 'inventory/movements') {
            const variantId = url.searchParams.get('variantId');
            let query = `
                SELECT 
                    im.*, 
                    pv.variant_name as "variantName", 
                    p.name as "productName"
                FROM public.inventory_movements im
                JOIN public.product_variants pv ON im.variant_id = pv.id
                JOIN public.products p ON pv.product_id = p.id
            `;
            const params = [];
            if (variantId) {
                query += ' WHERE im.variant_id = ?';
                params.push(variantId);
            }
            query += ' ORDER BY im.created_at DESC LIMIT 100';
            const [rows] = await pool.query(query, params);
            return NextResponse.json(rows);
        }

        // 7.3 GET /api/coupons
        if (routeStr === 'coupons') {
            const [rows] = await pool.query('SELECT * FROM public.coupons ORDER BY code ASC');
            return NextResponse.json(rows);
        }

        // 8. GET /api/orders
        if (routeStr === 'orders') {
            const [orderRows]: any = await pool.query(`
                SELECT o.*, u.FirstName, u.LastName, u.Email 
                FROM Orders o 
                LEFT JOIN Users u ON o.UserId = u.Id 
                ORDER BY o.CreatedAt DESC
            `);
            
            const orders = [];
            for (const order of orderRows) {
                const [itemRows]: any = await pool.query(`
                    SELECT oi.*, pv.VariantName, p.Name as ProductName, p.ImageUrl 
                    FROM OrderItems oi 
                    JOIN ProductVariants pv ON oi.VariantId = pv.Id 
                    JOIN Products p ON pv.ProductId = p.Id 
                    WHERE oi.OrderId = ?
                `, [order.Id]);
                
                order.items = itemRows;
                orders.push(order);
            }
            return NextResponse.json(orders);
        }

        // 9. GET /api/orders/verify-payment
        if (routeStr === 'orders/verify-payment') {
            const paymentId = url.searchParams.get('payment_id');
            if (!paymentId) {
                return NextResponse.json({ error: 'payment_id is required' }, { status: 400 });
            }
            const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-4617225674364003-070212-ac94008f892a332dcbb5cd08dfe9a938-3512158955';
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${mpAccessToken}` }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch payment details: ${response.statusText}`);
            }
            const paymentInfo: any = await response.json();
            const status = paymentInfo.status;
            const orderId = paymentInfo.external_reference;
            
            if (status === 'approved' && orderId) {
                const [orderRows]: any = await pool.query('SELECT TotalAmount FROM Orders WHERE Id = ?', [orderId]);
                if (orderRows.length > 0) {
                    const dbTotal = parseFloat(orderRows[0].TotalAmount);
                    const mpTotal = parseFloat(paymentInfo.transaction_amount);
                    if (Math.abs(dbTotal - mpTotal) > 0.01) {
                        console.error(`[SECURITY ALERT] Payment verification amount mismatch for Order ${orderId}. DB: ${dbTotal}, MP: ${mpTotal}`);
                        return NextResponse.json({ error: 'Security Exception: Payment amount mismatch' }, { status: 400 });
                    }
                    const confirmation = await confirmOrderAndTriggerIntegrations(orderId);
                    const [updatedOrderRows]: any = await pool.query('SELECT order_number FROM Orders WHERE Id = ?', [orderId]);
                    const orderNumber = updatedOrderRows.length > 0 ? updatedOrderRows[0].OrderNumber : null;
                    return NextResponse.json({
                        status: 'success',
                        message: 'Payment verified and order confirmed successfully',
                        orderId,
                        orderNumber,
                        paymentStatus: status,
                        boletaNumber: confirmation.boletaNumber,
                        boletaUrl: confirmation.boletaUrl
                    });
                } else {
                    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
                }
            }
            return NextResponse.json({
                status: 'pending',
                message: `Payment status is ${status}`,
                orderId,
                paymentStatus: status
            });
        }

        // 10. GET /api/orders/analytics
        if (routeStr === 'orders/analytics') {
            const [kpiRows]: any = await pool.query(`
                SELECT 
                    COALESCE(SUM(TotalAmount), 0) as TotalRevenue,
                    COUNT(Id) as TotalOrders,
                    COALESCE(AVG(TotalAmount), 0) as AverageOrderValue,
                    COUNT(DISTINCT UserId) as UniqueCustomers
                FROM Orders WHERE Status != 'Cancelado'
            `);
            
            const [inventoryAlerts]: any = await pool.query(`
                SELECT p.Name, v.VariantName, i.Quantity, i.SafetyBuffer 
                FROM Inventory i
                JOIN ProductVariants v ON i.VariantId = v.Id
                JOIN Products p ON v.ProductId = p.Id
                WHERE i.Quantity <= i.SafetyBuffer
            `);
            
            const [pendingOrders]: any = await pool.query(`
                SELECT COUNT(Id) as PendingCount FROM Orders WHERE Status IN ('Nuevo', 'Preparando', 'Listo')
            `);
            
            const [categoryDistribution]: any = await pool.query(`
                SELECT c.Name as CategoryName, COUNT(oi.Id) as ItemCount
                FROM OrderItems oi
                JOIN ProductVariants pv ON oi.VariantId = pv.Id
                JOIN Products p ON pv.ProductId = p.Id
                JOIN Categories c ON p.CategoryId = c.Id
                GROUP BY c.Name
            `);
            
            const [productSales]: any = await pool.query(`
                SELECT p.Name as ProductName, SUM(oi.Quantity) as TotalUnits, SUM(oi.Subtotal) as TotalRevenue
                FROM OrderItems oi
                JOIN ProductVariants pv ON oi.VariantId = pv.Id
                JOIN Products p ON pv.ProductId = p.Id
                GROUP BY p.Name
                ORDER BY TotalUnits DESC
                LIMIT 5
            `);
            
            const [recentSignups]: any = await pool.query(`
                SELECT FirstName, LastName, Email, CreatedAt FROM Users ORDER BY CreatedAt DESC LIMIT 5
            `);
            
            return NextResponse.json({
                kpis: kpiRows[0],
                inventoryAlerts,
                pendingCount: pendingOrders[0]?.PendingCount || 0,
                categoryDistribution,
                productSales,
                recentSignups
            });
        }

        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    } catch (err: any) {
        console.error(`[API GET ${routeStr} Error]`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const { path } = await params;
    const url = new URL(request.url);
    const pool = getDbPool();
    await ensureDbSeeded(pool);

    if (!path || path.length === 0) {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const routeStr = path.join('/');
    
    try {
        const body = await request.json().catch(() => ({}));

        // 1. POST /api/settings/update
        if (routeStr === 'settings/update') {
            const { key, value } = body;
            if (!key) {
                return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
            }
            const blockedKeys = ['mercadopagoaccesstoken', 'mercadopagopublickey'];
            if (blockedKeys.includes(key.toLowerCase())) {
                return NextResponse.json({ 
                    error: 'Restricción de Seguridad: Esta clave se configura de forma segura en las variables de entorno de Vercel y no puede ser modificada desde el panel.' 
                }, { status: 403 });
            }
            await pool.query(
                'INSERT INTO SystemSettings (SettingKey, SettingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE SettingValue = ?',
                [key, value, value]
            );
            return NextResponse.json({ status: 'success', message: `Setting '${key}' updated successfully` });
        }

        // 1.1 POST /api/catalog/categories
        if (routeStr === 'catalog/categories') {
            const { name, slug, parentId, isActive } = body;
            if (!name || !slug) {
                return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
            }
            const [result]: any = await pool.query(
                'INSERT INTO Categories (Name, Slug, ParentId, IsActive) VALUES (?, ?, ?, ?) RETURNING id',
                [name, slug, parentId || null, isActive !== undefined ? (isActive ? 1 : 0) : 1]
            );
            const newId = result[0]?.id || result[0]?.Id || null;
            return NextResponse.json({ status: 'success', id: newId });
        }

        // 1.2 POST /api/catalog/categories/update
        if (routeStr === 'catalog/categories/update') {
            const { id, name, slug, parentId, isActive } = body;
            if (!id || !name || !slug) {
                return NextResponse.json({ error: 'ID, name and slug are required' }, { status: 400 });
            }
            await pool.query(
                'UPDATE Categories SET Name = ?, Slug = ?, ParentId = ?, IsActive = ? WHERE Id = ?',
                [name, slug, parentId || null, isActive !== undefined ? (isActive ? 1 : 0) : 1, id]
            );
            return NextResponse.json({ status: 'success' });
        }

        // 1.3 POST /api/catalog/attributes/groups
        if (routeStr === 'catalog/attributes/groups') {
            const { name } = body;
            if (!name) {
                return NextResponse.json({ error: 'Name is required' }, { status: 400 });
            }
            const [result]: any = await pool.query(
                'INSERT INTO public.attribute_groups (name) VALUES (?) ON CONFLICT (name) DO NOTHING RETURNING id',
                [name]
            );
            const newId = result[0]?.id || null;
            return NextResponse.json({ status: 'success', id: newId });
        }

        // 1.4 POST /api/catalog/attributes/values
        if (routeStr === 'catalog/attributes/values') {
            const { groupId, value } = body;
            if (!groupId || !value) {
                return NextResponse.json({ error: 'groupId and value are required' }, { status: 400 });
            }
            const [result]: any = await pool.query(
                'INSERT INTO public.attribute_values (group_id, value) VALUES (?, ?) ON CONFLICT (group_id, value) DO NOTHING RETURNING id',
                [parseInt(groupId), value]
            );
            const newId = result[0]?.id || null;
            return NextResponse.json({ status: 'success', id: newId });
        }

        // 1.5 POST /api/catalog/categories/attributes
        if (routeStr === 'catalog/categories/attributes') {
            const { categoryId, attributeGroupId } = body;
            if (!categoryId || !attributeGroupId) {
                return NextResponse.json({ error: 'categoryId and attributeGroupId are required' }, { status: 400 });
            }

            // Enforce that the category is a "Tipo" (has a parent)
            const [catRows]: any = await pool.query('SELECT parent_id FROM Categories WHERE Id = ?', [parseInt(categoryId)]);
            if (catRows.length === 0) {
                return NextResponse.json({ error: 'Category not found' }, { status: 404 });
            }
            if (catRows[0].ParentId === null || catRows[0].parent_id === null) {
                return NextResponse.json({ error: 'Restricción de Negocio: Solo se pueden asociar atributos a subcategorías del nivel "Tipo"' }, { status: 400 });
            }

            await pool.query(
                'INSERT INTO public.category_attribute_groups (category_id, attribute_group_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
                [parseInt(categoryId), parseInt(attributeGroupId)]
            );
            return NextResponse.json({ status: 'success' });
        }

        // 1.6 POST /api/catalog/products
        if (routeStr === 'catalog/products') {
            const { name, slug, price, categoryId, stock, image, description, attributes } = body;
            if (!name || !slug || !price || !categoryId) {
                return NextResponse.json({ error: 'Name, slug, price, and categoryId are required' }, { status: 400 });
            }

            const productId = crypto.randomUUID();
            await pool.query(
                'INSERT INTO public.products (id, category_id, name, slug, base_price, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
                [productId, parseInt(categoryId), name, slug, parseFloat(price), image || null, description || null]
            );

            // Create default variant
            const variantId = crypto.randomUUID();
            const sku = `SKU-${slug.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
            await pool.query(
                'INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) VALUES (?, ?, ?, 0.00, ?, 1)',
                [variantId, productId, 'Clásico', sku]
            );

            // Insert inventory
            await pool.query(
                'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2)',
                [variantId, parseInt(stock) || 0]
            );

            // Save variant attribute values if provided
            if (attributes && Array.isArray(attributes)) {
                for (const valId of attributes) {
                    await pool.query(
                        'INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?)',
                        [variantId, parseInt(valId)]
                    );
                }
            }

            return NextResponse.json({ status: 'success', id: productId });
        }

        // 1.7 POST /api/catalog/products/update
        if (routeStr === 'catalog/products/update') {
            const { id, name, slug, price, categoryId, stock, image, description, attributes } = body;
            if (!id || !name || !slug || !price || !categoryId) {
                return NextResponse.json({ error: 'ID, name, slug, price, and categoryId are required' }, { status: 400 });
            }

            await pool.query(
                'UPDATE public.products SET category_id = ?, name = ?, slug = ?, base_price = ?, image_url = ?, description = ? WHERE id = ?',
                [parseInt(categoryId), name, slug, parseFloat(price), image || null, description || null, id]
            );

            // Update main variant price or stock
            const [variants]: any = await pool.query('SELECT id FROM public.product_variants WHERE product_id = ? AND variant_name = ?', [id, 'Clásico']);
            if (variants.length > 0) {
                const variantId = variants[0].id;
                
                // Update stock
                await pool.query(
                    'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2) ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity',
                    [variantId, parseInt(stock) || 0]
                );

                // Update attributes (delete old ones and insert new ones)
                await pool.query('DELETE FROM public.variant_attribute_values WHERE variant_id = ?', [variantId]);
                if (attributes && Array.isArray(attributes)) {
                    for (const valId of attributes) {
                        await pool.query(
                            'INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?)',
                            [variantId, parseInt(valId)]
                        );
                    }
                }
            }

            return NextResponse.json({ status: 'success' });
        }

        // 1.8 POST /api/catalog/products/delete
        if (routeStr === 'catalog/products/delete') {
            const { id } = body;
            if (!id) {
                return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
            }
            await pool.query('UPDATE public.products SET is_active = 0 WHERE id = ?', [id]);
            return NextResponse.json({ status: 'success' });
        }

        // 1.9 POST /api/catalog/products/bulk
        if (routeStr === 'catalog/products/bulk') {
            const { products } = body;
            if (!products || !Array.isArray(products)) {
                return NextResponse.json({ error: 'Products array is required' }, { status: 400 });
            }

            for (const prod of products) {
                const { name, price, stock, categoryId, description, image, attributes } = prod;
                if (!name || price === undefined || !categoryId) continue;

                // Check if product with same name exists
                const [existingProd]: any = await pool.query('SELECT id FROM public.products WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);

                if (existingProd.length > 0) {
                    const productId = existingProd[0].id;
                    // Update existing product
                    await pool.query(
                        'UPDATE public.products SET base_price = ?, category_id = ?, description = ?, image_url = COALESCE(?, image_url) WHERE id = ?',
                        [parseFloat(price), parseInt(categoryId), description || null, image || null, productId]
                    );

                    // Find variant ID
                    const [existingVar]: any = await pool.query('SELECT id FROM public.product_variants WHERE product_id = ? LIMIT 1', [productId]);
                    if (existingVar.length > 0) {
                        const variantId = existingVar[0].id;
                        // Update inventory
                        await pool.query(
                            'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2) ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity',
                            [variantId, parseInt(stock) || 0]
                        );
                    }
                } else {
                    // Insert new product
                    const productId = crypto.randomUUID();
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    
                    await pool.query(
                        'INSERT INTO public.products (id, category_id, name, slug, base_price, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
                        [productId, parseInt(categoryId), name, slug, parseFloat(price), image || null, description || null]
                    );

                    const variantId = crypto.randomUUID();
                    const sku = `SKU-${slug.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
                    await pool.query(
                        'INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) VALUES (?, ?, ?, 0.00, ?, 1)',
                        [variantId, productId, 'Clásico', sku]
                    );

                    await pool.query(
                        'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2)',
                        [variantId, parseInt(stock) || 0]
                    );

                    if (attributes && Array.isArray(attributes)) {
                        for (const valId of attributes) {
                            await pool.query(
                                'INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?)',
                                [variantId, parseInt(valId)]
                            );
                        }
                    }
                }
            }

            return NextResponse.json({ status: 'success' });
        }

        // 1.9.1 POST /api/inventory/adjust
        if (routeStr === 'inventory/adjust') {
            const { variantId, quantityChange, movementType, referenceId, performedBy, reason } = body;
            if (!variantId || quantityChange === undefined || !movementType) {
                return NextResponse.json({ error: 'variantId, quantityChange, and movementType are required' }, { status: 400 });
            }

            // Read current stock
            const [rows]: any = await pool.query('SELECT quantity FROM public.inventory WHERE variant_id = ?', [variantId]);
            let currentQuantity = 0;
            if (rows.length > 0) {
                currentQuantity = rows[0].quantity;
            }

            const newQuantity = currentQuantity + parseInt(quantityChange);
            if (newQuantity < 0) {
                return NextResponse.json({ error: 'El stock resultante no puede ser menor a cero' }, { status: 400 });
            }

            // Update inventory
            await pool.query(
                'INSERT INTO public.inventory (variant_id, quantity, safety_buffer) VALUES (?, ?, 2) ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity',
                [variantId, newQuantity]
            );

            // Record movement
            await pool.query(
                'INSERT INTO public.inventory_movements (id, variant_id, quantity_change, movement_type, reference_id, performed_by, reason) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?)',
                [variantId, parseInt(quantityChange), movementType, referenceId || null, performedBy || null, reason || null]
            );

            return NextResponse.json({ status: 'success', newQuantity });
        }

        // 1.9.2 POST /api/coupons
        if (routeStr === 'coupons') {
            const { code, discountType, discountValue, minOrderValue, maxUses, categoryId, productId, validFrom, validTo } = body;
            if (!code || !discountType || discountValue === undefined) {
                return NextResponse.json({ error: 'code, discountType, and discountValue are required' }, { status: 400 });
            }

            const [result]: any = await pool.query(
                `INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, max_uses, category_id, product_id, valid_from, valid_to, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING id`,
                [code.toUpperCase(), discountType, parseFloat(discountValue), parseFloat(minOrderValue || 0), maxUses ? parseInt(maxUses) : null, categoryId ? parseInt(categoryId) : null, productId || null, validFrom || null, validTo || null]
            );
            const newId = result[0]?.id || null;
            return NextResponse.json({ status: 'success', id: newId });
        }

        // 1.9.3 POST /api/coupons/update
        if (routeStr === 'coupons/update') {
            const { id, code, discountType, discountValue, minOrderValue, maxUses, categoryId, productId, validFrom, validTo, isActive } = body;
            if (!id || !code || !discountType || discountValue === undefined) {
                return NextResponse.json({ error: 'id, code, discountType, and discountValue are required' }, { status: 400 });
            }

            await pool.query(
                `UPDATE public.coupons 
                 SET code = ?, discount_type = ?, discount_value = ?, min_order_value = ?, max_uses = ?, category_id = ?, product_id = ?, valid_from = ?, valid_to = ?, is_active = ? 
                 WHERE id = ?`,
                [code.toUpperCase(), discountType, parseFloat(discountValue), parseFloat(minOrderValue || 0), maxUses ? parseInt(maxUses) : null, categoryId ? parseInt(categoryId) : null, productId || null, validFrom || null, validTo || null, isActive !== undefined ? (isActive ? 1 : 0) : 1, parseInt(id)]
            );
            return NextResponse.json({ status: 'success' });
        }

        // 1.9.4 POST /api/coupons/delete
        if (routeStr === 'coupons/delete') {
            const { id } = body;
            if (!id) {
                return NextResponse.json({ error: 'id is required' }, { status: 400 });
            }
            await pool.query('UPDATE public.coupons SET is_active = 0 WHERE id = ?', [parseInt(id)]);
            return NextResponse.json({ status: 'success' });
        }

        // 2. POST /api/crm/addresses
        if (routeStr === 'crm/addresses') {
            const { userId, commune, street, number, propertyType, floor, department } = body;
            if (!userId || !commune || !street || !number) {
                return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 });
            }
            await pool.query('UPDATE Addresses SET IsDefault = 0 WHERE UserId = ?', [userId]);
            const addressId = crypto.randomUUID();
            await pool.query(
                `INSERT INTO Addresses (Id, UserId, Commune, Street, Number, PropertyType, Floor, Department, IsDefault) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [addressId, userId, commune, street, number, propertyType || 'House', floor || null, department || null]
            );
            return NextResponse.json({ status: 'success', addressId });
        }

        // 3. POST /api/orders/checkout
        if (routeStr === 'orders/checkout') {
            try {
                const { userId, items, shippingMethod, paymentMethod, notes, email, firstName, lastName, phone, addressId, couponId, pickupTime } = body;
                if (!items || items.length === 0 || !shippingMethod) {
                    return NextResponse.json({ error: 'Missing checkout fields' }, { status: 400 });
                }

                const orderId = crypto.randomUUID();
                const paymentId = crypto.randomUUID();
                let subtotal = 0;
                const itemInserts: any[] = [];

                for (const item of items) {
                    let cleanId = item.variantId;
                    if (typeof cleanId === 'string') {
                        cleanId = cleanId.replace(/-+$/, '');
                    }

                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const isValidUuid = typeof cleanId === 'string' && uuidRegex.test(cleanId);

                    let variantRows: any[] = [];
                    if (isValidUuid) {
                        const [rows]: any = await pool.query(
                            `SELECT pv.id as "Id", pv.price_adjustment as "PriceAdjustment", p.base_price as "BasePrice" 
                             FROM public.product_variants pv 
                             JOIN public.products p ON pv.product_id = p.id 
                             WHERE pv.id = ? OR pv.product_id = ? 
                             LIMIT 1`,
                            [cleanId, cleanId]
                        );
                        variantRows = rows;
                    }

                    // Fallback to name search if not found or if the ID is a mock ID
                    if (variantRows.length === 0 && item.name) {
                        const [rows]: any = await pool.query(
                            `SELECT pv.id as "Id", pv.price_adjustment as "PriceAdjustment", p.base_price as "BasePrice" 
                             FROM public.product_variants pv 
                             JOIN public.products p ON pv.product_id = p.id 
                             WHERE LOWER(p.name) = LOWER(?) OR LOWER(pv.variant_name) = LOWER(?)
                             LIMIT 1`,
                            [item.name, item.name]
                        );
                        variantRows = rows;
                    }

                    if (variantRows.length === 0) {
                        return NextResponse.json({ error: `Variant/Product ${item.variantId} (${item.name}) not found` }, { status: 404 });
                    }

                    const realVariantId = variantRows[0].Id;
                    const price = parseFloat(variantRows[0].BasePrice) + parseFloat(variantRows[0].PriceAdjustment);
                    const qty = parseInt(item.quantity);
                    const itemSubtotal = price * qty;
                    subtotal += itemSubtotal;
                    itemInserts.push([
                        crypto.randomUUID(),
                        orderId,
                        realVariantId,
                        qty,
                        price,
                        itemSubtotal
                    ]);
                }

                const shippingCost = shippingMethod === 'Delivery' ? 3500 : 0;
                const totalAmount = subtotal + shippingCost;

                let finalUserId = userId;
                let customerEmail = email || 'panderey.cl@gmail.com';
                let customerPhone = phone || '+56912345678';
                let customerFirstName = firstName || 'Cliente';
                let customerLastName = lastName || 'Invitado';

                if (!finalUserId && email) {
                    const [userRows]: any = await pool.query('SELECT Id, Email, Phone, FirstName, LastName FROM Users WHERE Email = ?', [email]);
                    if (userRows.length > 0) {
                        finalUserId = userRows[0].Id;
                        customerPhone = userRows[0].Phone || customerPhone;
                        customerFirstName = userRows[0].FirstName;
                        customerLastName = userRows[0].LastName;
                    } else {
                        finalUserId = crypto.randomUUID();
                        const supabaseAdmin = getSupabaseAdmin();
                        const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
                            id: finalUserId,
                            email,
                            first_name: customerFirstName,
                            last_name: customerLastName,
                            phone: customerPhone,
                            is_guest: true
                        });
                        if (insertErr) {
                            console.error('[Supabase Guest Insertion Error]:', insertErr);
                            throw new Error(`Failed to create guest user profile: ${insertErr.message}`);
                        }
                        const [roleRows]: any = await pool.query("SELECT Id FROM Roles WHERE Name = 'Cliente'");
                        if (roleRows.length > 0) {
                            await pool.query('INSERT INTO UserRoles (UserId, RoleId) VALUES (?, ?)', [finalUserId, roleRows[0].Id]);
                        }
                    }
                } else if (finalUserId) {
                    const [userRows]: any = await pool.query('SELECT Email, Phone, FirstName, LastName FROM Users WHERE Id = ?', [finalUserId]);
                    if (userRows.length > 0) {
                        customerEmail = userRows[0].Email;
                        customerPhone = userRows[0].Phone || customerPhone;
                        customerFirstName = userRows[0].FirstName;
                        customerLastName = userRows[0].LastName;
                    }
                }

                const connection = await pool.getConnection();
                await connection.beginTransaction();

                try {
                    let initPoint = null;
                    let paymentStatus = 'Aprobado';
                    let gatewayToken = crypto.randomBytes(16).toString('hex');
                    let finalPaymentMethod = paymentMethod || 'Webpay';

                    if (finalPaymentMethod && finalPaymentMethod.toLowerCase() === 'mercadopago') {
                        try {
                            const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-4617225674364003-070212-ac94008f892a332dcbb5cd08dfe9a938-3512158955';
                            const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
                            const preference = new Preference(client);

                            const frontendUrl = process.env.FRONTEND_URL || `https://${request.headers.get('host')}` || 'http://localhost:3000';
                            
                            const mpItems = items.map((item: any) => {
                                const unitPrice = item.price || (totalAmount / items.length);
                                return {
                                    title: item.name || 'Producto Pan de Rey',
                                    quantity: parseInt(item.quantity) || 1,
                                    unit_price: Math.round(parseFloat(unitPrice)),
                                    currency_id: 'CLP'
                                };
                            });

                            if (shippingCost > 0) {
                                mpItems.push({
                                    title: 'Costo de Despacho',
                                    quantity: 1,
                                    unit_price: shippingCost,
                                    currency_id: 'CLP'
                                });
                            }

                            // Notification URL: Webhook address for Mercado Pago to POST notifications
                            const notificationUrl = `${frontendUrl}/api/orders/webhook`;

                            const response = await preference.create({
                                body: {
                                    items: mpItems,
                                    payer: {
                                        email: customerEmail,
                                        name: customerFirstName,
                                        surname: customerLastName
                                    },
                                    back_urls: {
                                        success: `${frontendUrl}/checkout/success`,
                                        failure: `${frontendUrl}/checkout/success?status=failure`,
                                        pending: `${frontendUrl}/checkout/success?status=pending`
                                    },
                                    auto_return: 'approved',
                                    external_reference: orderId,
                                    notification_url: notificationUrl
                                }
                            });

                            const isSandbox = process.env.MERCADOPAGO_SANDBOX !== 'false';
                            initPoint = isSandbox ? response.sandbox_init_point : response.init_point;
                            gatewayToken = response.id || '';
                            paymentStatus = 'Pendiente';
                        } catch (mpErr: any) {
                            console.error('Error generando preferencia de Mercado Pago:', mpErr);
                            if (mpErr.response) {
                                console.error('Mercado Pago API Response Error Status:', mpErr.response.status);
                                console.error('Mercado Pago API Response Error Body:', JSON.stringify(mpErr.response.body || mpErr.response.data || mpErr.response));
                            }

                            const isDev = process.env.NODE_ENV === 'development';
                            const allowSim = process.env.ENABLE_LOCAL_CHECKOUT_SIMULATION === 'true';

                            if (isDev && allowSim) {
                                paymentStatus = 'Aprobado';
                                finalPaymentMethod = 'Simulado Fallback';
                                console.log('[Checkout Fallback]: Falling back to Local Simulation because we are in development and simulation is enabled.');
                            } else {
                                throw new Error('No pudimos conectar con Mercado Pago, intenta de nuevo.');
                            }
                        }
                    }

                    await connection.query(
                        `INSERT INTO Orders (Id, UserId, AddressId, CouponId, TotalAmount, Status, ShippingMethod, PickupTime, ShippingCost, Notes) 
                         VALUES (?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?)`,
                        [orderId, finalUserId || null, addressId || null, couponId || null, totalAmount, shippingMethod, pickupTime || null, shippingCost, notes || null]
                    );

                    for (const row of itemInserts) {
                        await connection.query(
                            'INSERT INTO OrderItems (Id, OrderId, VariantId, Quantity, UnitPrice, Subtotal) VALUES (?, ?, ?, ?, ?, ?)',
                            row
                        );
                        await connection.query(
                            'UPDATE Inventory SET Quantity = Quantity - ? WHERE VariantId = ?',
                            [row[3], row[2]]
                        );
                        await connection.query(
                            'INSERT INTO InventoryMovements (Id, VariantId, QuantityChange, MovementType, ReferenceId) VALUES (gen_random_uuid(), ?, ?, \'Venta\', ?)',
                            [row[2], -row[3], orderId]
                        );
                    }

                    await connection.query(
                        `INSERT INTO Payments (Id, OrderId, Amount, PaymentMethod, Status, TransactionId) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [paymentId, orderId, totalAmount, finalPaymentMethod, paymentStatus, gatewayToken]
                    );

                    await connection.commit();
                    connection.release();

                    if (finalPaymentMethod.toLowerCase() === 'mercadopago') {
                        return NextResponse.json({ 
                            status: 'success', 
                            message: 'Order created, redirecting to payment gateway', 
                            orderId,
                            initPoint,
                            boletaNumber: null,
                            boletaUrl: null
                        });
                    } else {
                        const confirmation = await confirmOrderAndTriggerIntegrations(orderId);
                        return NextResponse.json({ 
                            status: 'success', 
                            message: 'Order checked out and settled successfully', 
                            orderId,
                            initPoint: null,
                            boletaNumber: confirmation.boletaNumber,
                            boletaUrl: confirmation.boletaUrl
                        });
                    }
                } catch (err: any) {
                    await connection.rollback();
                    connection.release();
                    return NextResponse.json({ error: err.message || 'Error al procesar el pedido en el servidor' }, { status: 500 });
                }
            } catch (outerErr: any) {
                console.error('[API POST orders/checkout Error]:', outerErr);
                return NextResponse.json({ error: outerErr.message || 'Error de conexión con la base de datos' }, { status: 500 });
            }
        }

        // 4. POST /api/orders/webhook
        if (routeStr === 'orders/webhook') {
            const { action, type, data } = body;
            if (type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
                const paymentId = data?.id || url.searchParams.get('id') || body.resource?.split('/').pop();
                if (paymentId) {
                    try {
                        const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-4617225674364003-070212-ac94008f892a332dcbb5cd08dfe9a938-3512158955';
                        const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
                        const payment = new Payment(client);

                        const paymentInfo = await payment.get({ id: paymentId.toString() });
                        const status = paymentInfo.status;
                        const orderId = paymentInfo.external_reference;

                        if (orderId) {
                            // Update Payment status in DB to match Mercado Pago status
                            let dbPaymentStatus = 'Pendiente';
                            if (status === 'approved') dbPaymentStatus = 'Aprobado';
                            else if (status === 'rejected') dbPaymentStatus = 'Rechazado';
                            else if (status === 'in_process') dbPaymentStatus = 'En Proceso';
                            else if (status === 'pending') dbPaymentStatus = 'Pendiente';

                            await pool.query(
                                'UPDATE Payments SET Status = ?, TransactionId = ? WHERE OrderId = ?',
                                [dbPaymentStatus, paymentId.toString(), orderId]
                            );

                            if (status === 'approved') {
                                const [orderRows]: any = await pool.query('SELECT TotalAmount FROM Orders WHERE Id = ?', [orderId]);
                                if (orderRows.length > 0) {
                                    const dbTotal = parseFloat(orderRows[0].TotalAmount);
                                    const mpTotal = parseFloat(paymentInfo.transaction_amount?.toString() || '0');
                                    if (Math.abs(dbTotal - mpTotal) > 0.01) {
                                        console.error(`[SECURITY ALERT] Payment amount mismatch for Order ${orderId}. DB: ${dbTotal}, MP: ${mpTotal}`);
                                        return new Response('Payment amount mismatch', { status: 400 });
                                    }
                                    await confirmOrderAndTriggerIntegrations(orderId);
                                }
                            }
                        }
                    } catch (webhookErr) {
                        console.error('Error processing Mercado Pago Webhook:', webhookErr);
                        return new Response('Webhook processing failed', { status: 500 });
                    }
                }
            }
            return new Response('OK', { status: 200 });
        }

        // 5. POST /api/orders/update-status
        if (routeStr === 'orders/update-status') {
            const { orderId, newStatus } = body;
            if (!orderId || !newStatus) {
                return NextResponse.json({ error: 'Order ID and New Status are required' }, { status: 400 });
            }
            await pool.query('UPDATE Orders SET Status = ? WHERE Id = ?', [newStatus, orderId]);
            const [orderRows]: any = await pool.query(
                'SELECT o.TotalAmount, u.Email, u.Phone FROM Orders o LEFT JOIN Users u ON o.UserId = u.Id WHERE o.Id = ?',
                [orderId]
            );
            if (orderRows.length > 0) {
                const o = orderRows[0];
                await sendStatusEmail(o.Email || 'panderey.cl@gmail.com', orderId, newStatus, o.TotalAmount);
                await sendStatusWhatsApp(o.Phone || '+56912345678', orderId, newStatus);
            }
            return NextResponse.json({ status: 'success', message: `Order status updated to '${newStatus}'` });
        }

        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    } catch (err: any) {
        console.error(`[API POST ${routeStr} Error]`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
