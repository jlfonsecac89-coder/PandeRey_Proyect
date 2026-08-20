export type DeliveryMessage = {
  id: string;
  order_id: string;
  sender_role: "repartidor" | "tienda";
  sender_id: string;
  message: string;
  created_at: string;
};

export type SendMessageState = { error?: string; success?: string; message?: DeliveryMessage } | null;
