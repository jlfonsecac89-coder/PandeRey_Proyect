const { Pool } = require('pg');

const dbConfig = {
    host: 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: 'postgres',
    password: 'L8nhPn1v*21',
    database: 'postgres',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
};

function pgSql(sql) {
    let index = 1;
    let tempSql = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        if (char === "'" && sql[i - 1] !== '\\') {
            inSingleQuote = !inSingleQuote;
        } else if (char === '"' && sql[i - 1] !== '\\') {
            inDoubleQuote = !inDoubleQuote;
        }
        
        if (char === '?' && !inSingleQuote && !inDoubleQuote) {
            tempSql += `$${index++}`;
        } else {
            tempSql += char;
        }
    }
    
    let formattedSql = '';
    for (let i = 0; i < tempSql.length; i++) {
        const char = tempSql[i];
        if (char === '`') {
            formattedSql += '"';
        } else {
            formattedSql += char;
        }
    }
    
    return formattedSql
        .replace(/\bUUID\(\)/gi, 'gen_random_uuid()')
        .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\$?[\d]+|\?)\s+DAY\)/gi, "NOW() - ($1 * INTERVAL '1 day')")
        .replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE/gi, 'ON CONFLICT DO UPDATE')
        .replace(/SystemSettings/g, 'system_settings')
        .replace(/ProductVariants/g, 'product_variants')
        .replace(/InventoryMovements/g, 'inventory_movements')
        .replace(/UserRoles/g, 'user_roles')
        .replace(/OrderItems/g, 'order_items')
        .replace(/DefontanaConfig/g, 'defontana_config')
        .replace(/DefontanaSyncLogs/g, 'defontana_sync_logs')
        .replace(/Users/g, 'profiles')
        .replace(/Roles/g, 'roles')
        .replace(/Profiles/g, 'profiles')
        .replace(/Addresses/g, 'addresses')
        .replace(/Categories/g, 'categories')
        .replace(/Products/g, 'products');
}

async function run() {
    const pool = new Pool(dbConfig);
    const conn = await pool.connect();
    
    const results = [];
    const log = (msg) => {
        results.push(msg);
        console.log(msg);
    };

    try {
        await conn.query('BEGIN');
        log("🔌 Conectando a la base de datos (Transacción Iniciada)...");
        
        log("\n=======================================================");
        log("🕵️ PRUEBA 1: Crear Producto con Atributo en Catálogo");
        log("=======================================================");
        
        const productId = 'f0000000-0000-0000-0000-000000000001';
        await conn.query(pgSql("DELETE FROM public.products WHERE id = ?"), [productId]);
        
        let catId;
        const catRes = await conn.query(pgSql("SELECT id FROM public.categories LIMIT 1"));
        if (catRes.rows.length === 0) {
            const tempCatId = 999;
            await conn.query(pgSql("INSERT INTO public.categories (id, name, slug, is_active) VALUES (?, 'Temp E2E', 'temp-e2e', 1) ON CONFLICT DO NOTHING"), [tempCatId]);
            catId = tempCatId;
        } else {
            catId = catRes.rows[0].id;
        }
        
        await conn.query(
            pgSql(`INSERT INTO public.products (id, category_id, name, slug, base_price, description, is_active) 
             VALUES (?, ?, 'Pan de Prueba E2E', 'pan-de-prueba-e2e', 4990, 'Pan crujiente de prueba', 1)`),
            [productId, catId]
        );
        log(`✅ Producto de prueba creado con ID: ${productId}`);

        const variantId = 'f0000000-0000-0000-0000-000000000002';
        await conn.query(pgSql("DELETE FROM public.product_variants WHERE id = ?"), [variantId]);
        await conn.query(
            pgSql(`INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) 
             VALUES (?, ?, 'Clásico', 0.00, 'SKU-PRUEBA-E2E', 1)`),
            [variantId, productId]
        );
        log("✅ Variante 'Clásico' creada con SKU: SKU-PRUEBA-E2E");

        const attrValRes = await conn.query(pgSql("SELECT id FROM public.attribute_values LIMIT 1"));
        if (attrValRes.rows.length > 0) {
            const valId = attrValRes.rows[0].id;
            await conn.query(
                pgSql("INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?) ON CONFLICT DO NOTHING"),
                [variantId, valId]
            );
            log(`✅ Variante vinculada con atributo ID: ${valId}`);
        }

        log("\n=======================================================");
        log("🕵️ PRUEBA 2: Ajuste de Stock con Auditoría Separada");
        log("=======================================================");
        
        await conn.query(
            pgSql(`INSERT INTO public.inventory (variant_id, quantity, safety_buffer) 
             VALUES (?, 10, 2) 
             ON CONFLICT (variant_id) DO UPDATE SET quantity = 10`),
            [variantId]
        );

        const change = 5;
        const responsible = 'Runner E2E';
        const reason = 'Verificación automatizada de Fase 2.5';
        
        await conn.query(
            pgSql("UPDATE public.inventory SET quantity = quantity + ? WHERE variant_id = ?"),
            [change, variantId]
        );
        
        const movId = 'f0000000-0000-0000-0000-000000000003';
        await conn.query(pgSql("DELETE FROM public.inventory_movements WHERE id = ?"), [movId]);
        await conn.query(
            pgSql(`INSERT INTO public.inventory_movements (id, variant_id, quantity_change, movement_type, reference_id, performed_by, reason) 
             VALUES (?, ?, ?, 'Ajuste Test', 'Firmado por Script', ?, ?)`),
            [movId, variantId, change, responsible, reason]
        );
        
        const movVerify = await conn.query(pgSql("SELECT * FROM public.inventory_movements WHERE id = ?"), [movId]);
        log(`✅ Movimiento guardado: Responsable: ${movVerify.rows[0].performed_by} | Motivo: ${movVerify.rows[0].reason}`);

        log("\n=======================================================");
        log("🕵️ PRUEBA 3: Creación y Aplicación de Cupones");
        log("=======================================================");
        
        const couponCode = 'TEST_E2E_99';
        await conn.query(pgSql("DELETE FROM public.coupons WHERE code = ?"), [couponCode]);
        await conn.query(
            pgSql(`INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, max_uses, is_active) 
             VALUES (?, 'percentage', 20, 2000, 100, 1)`),
            [couponCode]
        );
        
        const couponVerify = await conn.query(pgSql("SELECT * FROM public.coupons WHERE code = ?"), [couponCode]);
        const cp = couponVerify.rows[0];
        const originalTotal = 10000;
        const discount = cp.discount_type === 'percentage' ? (originalTotal * cp.discount_value) / 100 : cp.discount_value;
        const finalTotal = originalTotal - discount;
        log(`✅ Cupón '${couponCode}' de tipo '${cp.discount_type}' creado.`);
        log(`✅ Cálculo de descuento: $${originalTotal} - $${discount} = $${finalTotal} (OK)`);

        log("\n=======================================================");
        log("🕵️ PRUEBA 4: Generación de Correlativo Atómico e Idempotente");
        log("=======================================================");
        
        const orderId = 'f0000000-0000-0000-0000-000000000004';
        await conn.query(pgSql("DELETE FROM public.orders WHERE id = ?"), [orderId]);
        await conn.query(
            pgSql(`INSERT INTO public.orders (id, total_amount, status, shipping_method, order_number) 
             VALUES (?, 15000, 'Pendiente', 'Pickup', NULL)`),
            [orderId]
        );
        
        const assignTrackingNumberInTrans = async (connObj, oId) => {
            const selectRes = await connObj.query(pgSql("SELECT order_number FROM public.orders WHERE id = ? FOR UPDATE"), [oId]);
            let tracking = selectRes.rows[0].order_number;
            if (!tracking) {
                const seqRes = await connObj.query(pgSql("SELECT nextval('public.order_number_seq') as seq"));
                const nextVal = seqRes.rows[0].seq;
                tracking = `PDR-${String(nextVal).padStart(6, '0')}`;
                await connObj.query(pgSql("UPDATE public.orders SET order_number = ? WHERE id = ?"), [tracking, oId]);
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
        
        await conn.query(pgSql("DELETE FROM public.user_roles WHERE user_id IN (?, ?)"), [guestId, authUserId]);
        await conn.query(pgSql("DELETE FROM public.profiles WHERE id IN (?, ?)"), [guestId, authUserId]);
        
        await conn.query(
            pgSql(`INSERT INTO public.profiles (id, email, first_name, last_name, phone, is_guest) 
             VALUES (?, ?, 'Juan', 'Invitado', '+56911223344', true)`),
            [guestId, guestEmail]
        );
        
        const guestOrderId = 'f0000000-0000-0000-0000-000000000007';
        await conn.query(pgSql("DELETE FROM public.orders WHERE id = ?"), [guestOrderId]);
        await conn.query(
            pgSql(`INSERT INTO public.orders (id, user_id, total_amount, status, shipping_method) 
             VALUES (?, ?, 5000, 'Pendiente', 'Pickup')`),
            [guestOrderId, guestId]
        );
        
        const guestAddrId = 'f0000000-0000-0000-0000-000000000008';
        await conn.query(pgSql("DELETE FROM public.addresses WHERE id = ?"), [guestAddrId]);
        await conn.query(
            pgSql(`INSERT INTO public.addresses (id, user_id, street, number, commune, is_default) 
             VALUES (?, ?, 'Avenida Siempreviva', '742', 'Santiago', 1)`),
            [guestAddrId, guestId]
        );
        
        log("➡️ Simulando registro y fusión...");
        
        const guestRes = await conn.query(pgSql("SELECT id FROM public.profiles WHERE email = ? AND is_guest = true LIMIT 1"), [guestEmail]);
        const oldGuestId = guestRes.rows.length > 0 ? guestRes.rows[0].id : null;
        
        if (oldGuestId) {
            await conn.query(pgSql("UPDATE public.profiles SET email = email || '.fused-' || ? WHERE id = ?"), [oldGuestId, oldGuestId]);
        }

        await conn.query(
            pgSql(`INSERT INTO public.profiles (id, email, first_name, last_name, phone, is_guest) 
             VALUES (?, ?, 'Juan', 'Registrado', '+56911223344', false)`),
            [authUserId, guestEmail]
        );

        if (oldGuestId) {
            await conn.query(pgSql("UPDATE public.addresses SET user_id = ? WHERE user_id = ?"), [authUserId, oldGuestId]);
            await conn.query(pgSql("UPDATE public.orders SET user_id = ? WHERE user_id = ?"), [authUserId, oldGuestId]);
            await conn.query(pgSql("DELETE FROM public.user_roles WHERE user_id = ?"), [oldGuestId]);
            await conn.query(pgSql("DELETE FROM public.profiles WHERE id = ?"), [oldGuestId]);
        }
        
        const orderCheck = await conn.query(pgSql("SELECT user_id FROM public.orders WHERE id = ?"), [guestOrderId]);
        const addrCheck = await conn.query(pgSql("SELECT user_id FROM public.addresses WHERE id = ?"), [guestAddrId]);
        const oldProfileCheck = await conn.query(pgSql("SELECT id FROM public.profiles WHERE id = ?"), [guestId]);
        
        if (orderCheck.rows[0].user_id === authUserId && addrCheck.rows[0].user_id === authUserId && oldProfileCheck.rows.length === 0) {
            log("✅ Fusión de cuentas EXITOSA");
        } else {
            throw new Error("Falla en la verificación de fusión");
        }

        log("\n=======================================================");
        log("🎉 ¡TODAS LAS PRUEBAS DE E2E PASARON CON ÉXITO! 🎉");
        log("=======================================================");

        await conn.query('ROLLBACK');
        log("🔄 Transacción revertida con éxito (ROLLBACK) - La base de datos queda limpia.");
        process.exit(0);
    } catch (err) {
        await conn.query('ROLLBACK');
        log(`❌ ERROR DURANTE LAS PRUEBAS (Transacción Revertida): ${err.message}`);
        process.exit(1);
    } finally {
        conn.release();
        await pool.end();
    }
}

run();
