import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDbPool } from '@/utils/db';
import { syncStockWithDefontana, pushSalesOrderToDefontana } from '@/services/defontana';
import { printFiscalTicket } from '@/services/fiscalPrinter';
import { sendStatusEmail, sendStatusWhatsApp } from '@/services/notifications';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

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
    const [orderRows]: any = await pool.query('SELECT status, total_amount, user_id, shipping_method FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
        throw new Error(`Order ${orderId} not found`);
    }
    const order = orderRows[0];
    if (order.status !== 'Pendiente') {
        console.log(`[Order Confirmation] Order ${orderId} is already in status ${order.status}. Skipping.`);
        const [existingRows]: any = await pool.query('SELECT boleta_number, boleta_url FROM orders WHERE id = ?', [orderId]);
        return { 
            success: true, 
            boletaNumber: existingRows.length > 0 ? existingRows[0].boleta_number : null,
            boletaUrl: existingRows.length > 0 ? existingRows[0].boleta_url : null
        };
    }
    
    await pool.query("UPDATE orders SET status = 'Nuevo' WHERE id = ?", [orderId]);
    await pool.query("UPDATE payments SET status = 'Aprobado' WHERE order_id = ?", [orderId]);
    
    const [itemRows]: any = await pool.query(
        'SELECT variant_id, quantity, unit_price, subtotal FROM order_items WHERE order_id = ?',
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
                    await pool.query('INSERT INTO public.categories (id, name, slug, is_active) VALUES (?, ?, ?, true)', [cat.id, cat.name, cat.slug]);
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
                        'INSERT INTO public.products (id, category_id, name, slug, base_price, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
                        [prod.id, prod.categoryId, prod.name, prod.slug, prod.price, prod.image, prod.description]
                    );

                    // Predefined Variant UUID mapped from Product UUID
                    const variantId = prod.id.replace(/94(\d\d)$/, '84$1');
                    const sku = `SKU-${prod.slug.toUpperCase()}`;
                    await pool.query(
                        'INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) VALUES (?, ?, ?, 0.00, ?, true)',
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
            const [rows] = await pool.query('SELECT * FROM Categories WHERE IsActive = 1');
            return NextResponse.json(rows);
        }

        // 2. GET /api/catalog/products
        if (routeStr === 'catalog/products') {
            const categoryId = url.searchParams.get('categoryId');
            let query = `
                SELECT 
                    p.id, 
                    c.slug as category, 
                    p.name, 
                    p.slug, 
                    p.base_price as price, 
                    p.image_url as image, 
                    p.description,
                    pv.id as "variantId"
                FROM public.products p
                LEFT JOIN public.categories c ON p.category_id = c.id
                LEFT JOIN public.product_variants pv ON p.id = pv.product_id AND pv.variant_name = 'Clásico'
                WHERE p.is_active = true
            `;
            const queryParams: any[] = [];
            if (categoryId) {
                query += ' AND p.category_id = ?';
                queryParams.push(parseInt(categoryId));
            }
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
                    return NextResponse.json({
                        status: 'success',
                        message: 'Payment verified and order confirmed successfully',
                        orderId,
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
                        await pool.query(
                            'INSERT INTO Users (Id, Email, FirstName, LastName, Phone) VALUES (?, ?, ?, ?, ?)',
                            [finalUserId, email, customerFirstName, customerLastName, customerPhone]
                        );
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
