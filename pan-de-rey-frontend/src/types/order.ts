export type OrderType = 'DELIVERY' | 'PICKUP';
export type SLAStatus = 'EN_TIEMPO' | 'POR_VENCER' | 'ATRASADO';

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTimeSlot: string; // "10:00 - 12:00"
  status: 'Pendiente' | 'Preparación' | 'En Camino' | 'Listo' | 'Entregado';
  slaStatus: SLAStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string; // Requerido solo si orderType === 'DELIVERY'
  deliveryPin?: string | null;
  deliveredAt?: string | null;
}
