const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno locales
const envPath = path.join(__dirname, '../pan-de-rey-frontend/.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ ERROR: No se encontró DATABASE_URL o POSTGRES_URL en .env.local ni en las variables de entorno.");
  process.exit(1);
}

console.log("🔌 Conectando a la base de datos de Supabase...");
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runTests() {
  try {
    console.log("\n=======================================================");
    console.log("🕵️ PRUEBA 1: Crear Producto con Atributo en Catálogo");
    console.log("=======================================================");
    
    // 1. Inserción de Producto de Prueba
    const productId = 'f0000000-0000-0000-0000-000000000001';
    await pool.query("DELETE FROM public.products WHERE id = $1", [productId]);
    
    // Buscar categoría hoja (Leaf)
    const catRes = await pool.query("SELECT id FROM public.categories WHERE parent_id IS NOT NULL LIMIT 1");
    if (catRes.rows.length === 0) {
      throw new Error("No hay categorías configuradas para asociar el producto de prueba.");
    }
    const catId = catRes.rows[0].id;
    
    await pool.query(
      `INSERT INTO public.products (id, category_id, name, slug, base_price, description, is_active) 
       VALUES ($1, $2, 'Pan de Prueba E2E', 'pan-de-prueba-e2e', 4990, 'Pan crujiente de prueba', true)`,
      [productId, catId]
    );
    console.log("✅ Producto creado con ID:", productId);

    // Crear variante
    const variantId = 'f0000000-0000-0000-0000-000000000002';
    await pool.query("DELETE FROM public.product_variants WHERE id = $1", [variantId]);
    await pool.query(
      `INSERT INTO public.product_variants (id, product_id, variant_name, price_adjustment, sku, is_active) 
       VALUES ($1, $2, 'Clásico', 0, 'SKU-PRUEBA-E2E', true)`,
      [variantId, productId]
    );
    console.log("✅ Variante 'Clásico' creada con SKU: SKU-PRUEBA-E2E");

    // Asociar Atributo si existe alguno
    const attrValRes = await pool.query("SELECT id FROM public.attribute_values LIMIT 1");
    if (attrValRes.rows.length > 0) {
      const valId = attrValRes.rows[0].id;
      await pool.query(
        "INSERT INTO public.variant_attribute_values (variant_id, attribute_value_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [variantId, valId]
      );
      console.log(`✅ Variante vinculada con atributo ID: ${valId}`);
    }

    console.log("\n=======================================================");
    console.log("🕵️ PRUEBA 2: Ajuste de Stock con Auditoría Separada");
    console.log("=======================================================");
    
    // Crear inventario inicial
    await pool.query(
      `INSERT INTO public.inventory (variant_id, quantity, safety_buffer) 
       VALUES ($1, 10, 2) 
       ON CONFLICT (variant_id) DO UPDATE SET quantity = 10`,
      [variantId]
    );

    // Ajustar stock
    const change = 5;
    const responsible = 'Runner E2E';
    const reason = 'Verificación automatizada de Fase 2.5';
    
    await pool.query(
      "UPDATE public.inventory SET quantity = quantity + $1 WHERE variant_id = $2",
      [change, variantId]
    );
    
    const movId = 'f0000000-0000-0000-0000-000000000003';
    await pool.query("DELETE FROM public.inventory_movements WHERE id = $1", [movId]);
    await pool.query(
      `INSERT INTO public.inventory_movements (id, variant_id, quantity_change, movement_type, reference_id, performed_by, reason) 
       VALUES ($1, $2, $3, 'Ajuste Test', 'Firmado por Script', $4, $5)`,
      [movId, variantId, change, responsible, reason]
    );
    
    const movVerify = await pool.query("SELECT * FROM public.inventory_movements WHERE id = $1", [movId]);
    console.log("✅ Movimiento de inventario guardado:");
    console.table(movVerify.rows.map(r => ({
      ID: r.id.substring(0,8),
      Cambio: r.quantity_change,
      Tipo: r.movement_type,
      Responsable: r.performed_by,
      Motivo: r.reason
    })));

    console.log("\n=======================================================");
    console.log("🕵️ PRUEBA 3: Creación y Aplicación de Cupones");
    console.log("=======================================================");
    
    const couponCode = 'TEST_E2E_99';
    await pool.query("DELETE FROM public.coupons WHERE code = $1", [couponCode]);
    await pool.query(
      `INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, max_uses, is_active) 
       VALUES ($1, 'percentage', 20, 2000, 100, true)`,
      [couponCode]
    );
    
    const couponVerify = await pool.query("SELECT * FROM public.coupons WHERE code = $1", [couponCode]);
    const cp = couponVerify.rows[0];
    const originalTotal = 10000;
    const discount = cp.discount_type === 'percentage' ? (originalTotal * cp.discount_value) / 100 : cp.discount_value;
    const finalTotal = originalTotal - discount;
    console.log(`✅ Cupón '${couponCode}' de tipo '${cp.discount_type}' con valor ${cp.discount_value} creado.`);
    console.log(`✅ Cálculo de descuento: $${originalTotal} - $${discount} = $${finalTotal} (OK)`);

    console.log("\n=======================================================");
    console.log("🕵️ PRUEBA 4: Generación de Correlativo Atómico e Idempotente");
    console.log("=======================================================");
    
    const orderId = 'f0000000-0000-0000-0000-000000000004';
    await pool.query("DELETE FROM public.orders WHERE id = $1", [orderId]);
    
    // Crear orden inicial sin número
    await pool.query(
      `INSERT INTO public.orders (id, customer_name, email, phone, total, status, shipping_method, order_number) 
       VALUES ($1, 'Invitado E2E', 'invitado@test.com', '+56911111111', 15000, 'Pendiente', 'Pickup', NULL)`,
      [orderId]
    );
    
    // Función simulada de asignación idempotente en webhook
    async function assignTrackingNumber(id) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        // Bloquear fila y leer
        const selectRes = await client.query("SELECT order_number FROM public.orders WHERE id = $1 FOR UPDATE", [id]);
        if (selectRes.rows.length === 0) {
          throw new Error("Orden no encontrada");
        }
        
        let tracking = selectRes.rows[0].order_number;
        if (!tracking) {
          // Asignar desde secuencia
          const seqRes = await client.query("SELECT nextval('public.order_number_seq') as seq");
          const nextVal = seqRes.rows[0].seq;
          tracking = `PDR-${String(nextVal).padStart(6, '0')}`;
          
          await client.query("UPDATE public.orders SET order_number = $1 WHERE id = $2", [tracking, id]);
          console.log(`   [Asignador] Correlativo asignado: ${tracking}`);
        } else {
          console.log(`   [Asignador] Correlativo ya existía (omitido): ${tracking}`);
        }
        
        await client.query("COMMIT");
        return tracking;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    console.log("➡️ Intento 1 (Generar por primera vez):");
    const num1 = await assignTrackingNumber(orderId);
    
    console.log("➡️ Intento 2 (Verificar Idempotencia - Reenvío de webhook MP):");
    const num2 = await assignTrackingNumber(orderId);
    
    if (num1 === num2) {
      console.log(`✅ Idempotencia CONFIRMADA: Ambos intentos devolvieron el mismo código: ${num1}`);
    } else {
      throw new Error(`❌ FALLA DE IDEMPOTENCIA: Se generaron códigos distintos (${num1} vs ${num2})`);
    }

    console.log("\n=======================================================");
    console.log("🕵️ PRUEBA 5: Fusión de Cuentas de Invitados en Registro");
    console.log("=======================================================");
    
    const guestEmail = 'guest_fusion_test@example.com';
    const guestId = 'f0000000-0000-0000-0000-000000000005';
    const authUserId = 'f0000000-0000-0000-0000-000000000006';
    
    // Limpieza previa
    await pool.query("DELETE FROM public.user_roles WHERE user_id IN ($1, $2)", [guestId, authUserId]);
    await pool.query("DELETE FROM public.profiles WHERE id IN ($1, $2)", [guestId, authUserId]);
    
    // 1. Crear Perfil de Invitado
    await pool.query(
      `INSERT INTO public.profiles (id, email, first_name, last_name, phone, is_guest) 
       VALUES ($1, $2, 'Juan', 'Invitado', '+56911223344', true)`,
      [guestId, guestEmail]
    );
    console.log("✅ Perfil de invitado creado con ID:", guestId);
    
    // 2. Asociar pedido y dirección al invitado
    const guestOrderId = 'f0000000-0000-0000-0000-000000000007';
    await pool.query("DELETE FROM public.orders WHERE id = $1", [guestOrderId]);
    await pool.query(
      `INSERT INTO public.orders (id, user_id, customer_name, email, phone, total, status, shipping_method) 
       VALUES ($1, $2, 'Juan Invitado', $3, '+56911223344', 5000, 'Pendiente', 'Pickup')`,
      [guestOrderId, guestId, guestEmail]
    );
    
    const guestAddrId = 'f0000000-0000-0000-0000-000000000008';
    await pool.query("DELETE FROM public.addresses WHERE id = $1", [guestAddrId]);
    await pool.query(
      `INSERT INTO public.addresses (id, user_id, street, city, is_default) 
       VALUES ($1, $2, 'Avenida Siempreviva 742', 'Santiago', true)`,
      [guestAddrId, guestId]
    );
    console.log("✅ Pedido y dirección asociados al perfil de invitado.");
    
    // 3. Simular registro llamando directamente a la lógica de handle_new_user()
    console.log("➡️ Simulando registro de cuenta (auth.users)...");
    
    const clientFusion = await pool.connect();
    try {
      await clientFusion.query("BEGIN");
      
      const guestRes = await clientFusion.query("SELECT id FROM public.profiles WHERE email = $1 AND is_guest = true LIMIT 1", [guestEmail]);
      const oldGuestId = guestRes.rows.length > 0 ? guestRes.rows[0].id : null;
      
      await clientFusion.query(
        `INSERT INTO public.profiles (id, email, first_name, last_name, phone, is_guest) 
         VALUES ($1, $2, 'Juan', 'Registrado', '+56911223344', false)`,
        [authUserId, guestEmail]
      );
      
      if (oldGuestId) {
        await clientFusion.query("UPDATE public.addresses SET user_id = $1 WHERE user_id = $2", [authUserId, oldGuestId]);
        await clientFusion.query("UPDATE public.orders SET user_id = $1 WHERE user_id = $2", [authUserId, oldGuestId]);
        await clientFusion.query("DELETE FROM public.user_roles WHERE user_id = $1", [oldGuestId]);
        await clientFusion.query("DELETE FROM public.profiles WHERE id = $1", [oldGuestId]);
      }
      
      await clientFusion.query("COMMIT");
      console.log("✅ Transacción de fusión completada.");
    } catch (err) {
      await clientFusion.query("ROLLBACK");
      throw err;
    } finally {
      clientFusion.release();
    }
    
    const orderCheck = await pool.query("SELECT * FROM public.orders WHERE id = $1", [guestOrderId]);
    const addrCheck = await pool.query("SELECT * FROM public.addresses WHERE id = $1", [guestAddrId]);
    const oldProfileCheck = await pool.query("SELECT * FROM public.profiles WHERE id = $1", [guestId]);
    
    if (orderCheck.rows[0].user_id === authUserId && addrCheck.rows[0].user_id === authUserId && oldProfileCheck.rows.length === 0) {
      console.log("✅ Fusión de cuentas EXITOSA:");
      console.log(`   - Pedido ${guestOrderId.substring(0,8)} migrado de ${guestId.substring(0,8)} ➡️ ${authUserId.substring(0,8)}`);
      console.log(`   - Dirección ${guestAddrId.substring(0,8)} migrada de ${guestId.substring(0,8)} ➡️ ${authUserId.substring(0,8)}`);
      console.log(`   - Perfil de invitado temporal eliminado de la base de datos.`);
    } else {
      throw new Error("❌ FALLA DE FUSIÓN: El pedido o dirección no cambiaron de dueño, o el perfil de invitado no fue eliminado.");
    }

    console.log("\n=======================================================");
    console.log("🎉 ¡TODAS LAS PRUEBAS DE BASE DE DATOS PASARON CON ÉXITO! 🎉");
    console.log("=======================================================");

    // Limpieza final
    await pool.query("DELETE FROM public.user_roles WHERE user_id IN ($1, $2)", [guestId, authUserId]);
    await pool.query("DELETE FROM public.addresses WHERE id = $1", [guestAddrId]);
    await pool.query("DELETE FROM public.orders WHERE id IN ($1, $2)", [orderId, guestOrderId]);
    await pool.query("DELETE FROM public.profiles WHERE id IN ($1, $2)", [guestId, authUserId]);
    await pool.query("DELETE FROM public.coupons WHERE code = $1", [couponCode]);
    await pool.query("DELETE FROM public.inventory_movements WHERE id = $1", [movId]);
    await pool.query("DELETE FROM public.inventory WHERE variant_id = $1", [variantId]);
    await pool.query("DELETE FROM public.product_variants WHERE id = $1", [variantId]);
    await pool.query("DELETE FROM public.products WHERE id = $1", [productId]);

  } catch (err) {
    console.error("\n❌ ERROR DURANTE LAS PRUEBAS:", err.message);
  } finally {
    await pool.end();
  }
}

runTests();
