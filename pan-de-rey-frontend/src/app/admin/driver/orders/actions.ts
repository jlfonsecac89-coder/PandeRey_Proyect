'use server';

import { getSupabaseAdmin } from '@/shared/utils/supabase';

export type DriverOrder = {
  id: string;
  orderNumber: string;
  status: 'Preparación' | 'En Camino';
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
};

export type PinVerificationResult = {
  success: boolean;
  message: string;
};

export async function getDriverOrders(driverId: string): Promise<DriverOrder[]> {
  const supabase = getSupabaseAdmin();
  
  // Note: driver_id checking might fail if driverId is not a valid UUID in DB, but we pass it anyway.
  // In our DB, Orders table has `shipping_method` which could be 'Delivery' or 'Retiro'.
  // We'll query orders that are in 'Preparación' or 'En Camino'
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, customer_name, customer_phone, delivery_address, total_amount')
    // Temporarily commenting out driver_id filter so any pending delivery shows up for testing
    // .eq('driver_id', driverId) 
    .in('status', ['Preparación', 'En Camino'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching driver orders:', error);
    return [];
  }

  return (data || []).map(order => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status as 'Preparación' | 'En Camino',
    customerName: order.customer_name || 'Sin nombre',
    customerPhone: order.customer_phone || '',
    deliveryAddress: order.delivery_address || 'Dirección no especificada',
    totalAmount: Number(order.total_amount)
  }));
}

export async function submitDeliveryPin(
  orderId: string, 
  inputPin: string, 
  driverId: string
): Promise<PinVerificationResult> {
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.rpc('verify_and_complete_delivery', {
      p_order_id: orderId,
      p_input_pin: inputPin,
      p_driver_id: driverId
    });

    if (error) {
      console.error('RPC Error:', error);
      return { success: false, message: 'Error de servidor: ' + error.message };
    }

    return data as PinVerificationResult;
  } catch (err: any) {
    console.error('Action Error:', err);
    return { success: false, message: 'Fallo al procesar el PIN.' };
  }
}
