'use server';

import { getSupabaseAdmin } from '@/shared/utils/supabase';
import { getDbPool } from '@/shared/utils/db';

export type DriverOrder = {
  id: string;
  orderNumber: string;
  status: 'Preparación' | 'En Camino' | 'En Ruta';
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
    SELECT 
      o.Id as id, 
      o.OrderNumber as order_number, 
      o.Status as status, 
      u.FirstName || ' ' || u.LastName as customer_name, 
      u.Phone as customer_phone, 
      a.Street as delivery_address, 
      o.TotalAmount as total_amount
    FROM public.Orders o
    LEFT JOIN public.Users u ON o.UserId = u.Id
    LEFT JOIN public.Addresses a ON o.AddressId = a.Id
    WHERE o.Status IN ('Preparación', 'En Camino', 'En Ruta')
    ORDER BY o.CreatedAt DESC
  `);

  return (rows || []).map((order: any) => ({
    id: order.Id || order.id,
    orderNumber: order.OrderNumber || order.order_number,
    status: (order.Status || order.status) as 'Preparación' | 'En Camino' | 'En Ruta',
    customerName: order.CustomerName || order.customer_name || 'Sin nombre',
    customerPhone: order.CustomerPhone || order.customer_phone || '',
    deliveryAddress: order.DeliveryAddress || order.delivery_address || 'Dirección no especificada',
    totalAmount: Number(order.TotalAmount || order.total_amount || 0)
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
