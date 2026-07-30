import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditOrder(orderIdentifier) {
    console.log(`\n=== 🔎 INICIANDO AUDITORÍA E2E PARA PEDIDO: ${orderIdentifier} ===\n`);
    const report = {
        order: false,
        orderItems: false,
        payment: false,
        webhook: false,
        inventory: false,
        inventoryMovement: false,
        cart: 'N/A (Frontend state)'
    };

    // 1. Find Order
    let query = supabase.from('Orders').select('*');
    if (orderIdentifier.startsWith('PDR-')) {
        query = query.eq('OrderNumber', orderIdentifier);
    } else {
        query = query.eq('Id', orderIdentifier);
    }
    
    const { data: orderData, error: orderError } = await query.single();
    
    if (orderError || !orderData) {
        console.error(`❌ No se encontró la orden ${orderIdentifier}.`);
        console.error(orderError);
        return;
    }
    
    report.order = true;
    const orderId = orderData.Id;
    console.log(`✅ ORDER ENCONTRADA:`);
    console.log(`   - ID: ${orderData.Id}`);
    console.log(`   - PDR: ${orderData.OrderNumber}`);
    console.log(`   - Total: $${orderData.TotalAmount}`);
    console.log(`   - Status: ${orderData.Status}`);
    
    // 2. Find OrderItems
    const { data: itemsData, error: itemsError } = await supabase.from('OrderItems').select('*').eq('OrderId', orderId);
    if (itemsError || !itemsData || itemsData.length === 0) {
        console.error(`❌ No se encontraron OrderItems para la orden ${orderId}`);
    } else {
        report.orderItems = true;
        console.log(`\n✅ ORDER ITEMS (${itemsData.length}):`);
        itemsData.forEach(item => {
            console.log(`   - Item ID: ${item.Id}`);
            console.log(`   - Variant ID: ${item.VariantId}`);
            console.log(`   - Qty: ${item.Quantity} | Unit Price: $${item.UnitPrice} | Subtotal: $${item.Subtotal}`);
        });
    }

    // 3. Find Payment
    const { data: paymentData, error: paymentError } = await supabase.from('Payments').select('*').eq('OrderId', orderId);
    if (paymentError || !paymentData || paymentData.length === 0) {
        console.error(`❌ No se encontró Payment para la orden ${orderId}`);
    } else {
        report.payment = true;
        const payment = paymentData[0];
        console.log(`\n✅ PAYMENT ENCONTRADO:`);
        console.log(`   - Payment ID (Local): ${payment.Id}`);
        console.log(`   - MP Transaction ID (Webhook): ${payment.TransactionId}`);
        console.log(`   - Status: ${payment.Status}`);
        console.log(`   - Amount: $${payment.Amount}`);
        
        if (payment.TransactionId && payment.Status === 'Aprobado') {
            report.webhook = true;
        }
    }

    // 4. Find Inventory Movements
    // We need to look up movements for the variants in this order, with this OrderId as reference.
    const { data: movsData, error: movsError } = await supabase.from('inventory_movements').select('*').eq('reference_id', orderId);
    if (movsError || !movsData || movsData.length === 0) {
        console.error(`❌ No se encontraron Inventory Movements para la orden ${orderId}`);
    } else {
        report.inventoryMovement = true;
        console.log(`\n✅ INVENTORY MOVEMENTS (${movsData.length}):`);
        movsData.forEach(mov => {
            console.log(`   - Mov ID: ${mov.id}`);
            console.log(`   - Variant ID: ${mov.variant_id}`);
            console.log(`   - Qty Change: ${mov.quantity_change}`);
            console.log(`   - Type: ${mov.movement_type}`);
        });
        report.inventory = true; // If we have movements, inventory was updated
    }

    console.log('\n=== RESUMEN DE TRAZABILIDAD ===');
    console.table(report);
    
    if (Object.values(report).every(v => v === true || v === 'N/A (Frontend state)')) {
        console.log('\n🟢 E2E AUDIT: PASS');
    } else {
        console.log('\n🔴 E2E AUDIT: FAIL (Faltan eslabones en la cadena)');
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Uso: node audit_order.mjs <OrderId o PDR-XXXXXX>');
    process.exit(1);
}

auditOrder(args[0]);
