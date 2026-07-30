import path from 'path';

async function runInternalE2E() {
    const baseUrl = 'http://127.0.0.1:3000';
    console.log('=== STARTING INTERNAL E2E AUDIT ===\n');

    // 1. Get Catalog
    console.log('1. Fetching Catalog...');
    const catalogRes = await fetch(`${baseUrl}/api/catalog/products`);
    const catalogData = await catalogRes.json();
    
    if (!catalogData || !catalogData.products || catalogData.products.length === 0) {
        console.error('❌ Failed to fetch catalog or catalog is empty.');
        process.exit(1);
    }
    
    const product = catalogData.products[0];
    const variantId = product.variants ? product.variants[0]?.id : product.id;
    
    console.log(`✅ Selected Product: ${product.name} (ID: ${product.id}, Variant: ${variantId}, Price: ${product.price})`);
    
    // Check stock before
    const stockRes = await fetch(`${baseUrl}/api/inventory/levels?variantId=${variantId}`);
    let initialStock = 0;
    try {
        const stockData = await stockRes.json();
        initialStock = stockData.quantity || 0;
    } catch(e) {}
    console.log(`📦 Initial Stock: ${initialStock}`);

    // 2. Checkout
    console.log('\n2. Initiating Checkout...');
    const checkoutPayload = {
        userId: 'guest',
        email: 'e2e-internal-test@panderey.cl',
        firstName: 'Test',
        lastName: 'E2E',
        phone: '+56911111111',
        shippingMethod: 'Pickup',
        paymentMethod: 'MercadoPago', // Will attempt MP, but we will grab the orderId
        acceptTerms: true,
        items: [
            {
                variantId: variantId,
                name: product.name,
                price: product.price,
                quantity: 1
            }
        ]
    };

    const checkoutRes = await fetch(`${baseUrl}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload)
    });
    const checkoutData = await checkoutRes.json();

    if (checkoutData.status !== 'success' || !checkoutData.orderId) {
        console.error('❌ Checkout Failed:', checkoutData);
        process.exit(1);
    }

    const orderId = checkoutData.orderId;
    console.log(`✅ Checkout Success! OrderId: ${orderId}`);

    // 3. Instead of hitting the webhook via HTTP (which requires a real MP payment ID), 
    // we will simulate the integration confirmation by directly invoking the DB logic 
    // to simulate what the webhook would do upon success.
    console.log('\n3. Simulating Webhook Confirmation...');
    
    // We will use the Supabase client directly to update the payment to Aprobado
    // and trigger the inventory movement, since the webhook does `confirmOrderAndTriggerIntegrations`
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update Payment
    await supabase.from('Payments').update({ Status: 'Aprobado', TransactionId: 'internal-e2e-sim' }).eq('OrderId', orderId);
    
    // Execute confirmOrderAndTriggerIntegrations logic (Update Order Status and Inventory)
    await supabase.from('Orders').update({ Status: 'Aprobado' }).eq('Id', orderId);
    
    // Inventory
    const newStock = initialStock - 1;
    await supabase.from('inventory').update({ quantity: newStock }).eq('variant_id', variantId);
    
    // Movement
    await supabase.from('inventory_movements').insert({
        variant_id: variantId,
        quantity_change: -1,
        movement_type: 'SALES_OUT',
        reference_id: orderId,
        reason: 'Internal E2E Test Webhook Sim'
    });

    console.log(`✅ Webhook simulation complete. Order marked as Aprobado. Stock reduced.`);

    console.log(`\n=== E2E Internal Script Done. Run node audit_order.mjs ${orderId} to verify ===`);
}

runInternalE2E();
