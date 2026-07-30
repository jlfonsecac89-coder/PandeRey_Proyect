'use server';

import { getSupabaseAdmin } from '@/shared/utils/supabase';
import { getDbPool } from '@/shared/utils/db';

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
  const pool = getDbPool();
  // Use direct DB pool to avoid case-sensitivity and RLS issues with Supabase SDK
  const [rows]: any = await pool.query(`
    SELECT Id as id, OrderNumber as order_number, Status as status, CustomerName as customer_name, CustomerPhone as customer_phone, DeliveryAddress as delivery_address, TotalAmount as total_amount
    FROM public.Orders
    WHERE Status IN ('Preparación', 'En Camino')
    ORDER BY CreatedAt DESC
  `);

  return (rows || []).map((order: any) => ({
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
