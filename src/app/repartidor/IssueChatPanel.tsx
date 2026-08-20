import { DeliveryChatPanel } from "@/components/delivery-chat/DeliveryChatPanel";

// Punto de entrada específico del portal repartidor (nombre pedido por el
// blueprint, E06-T4) — delega en el componente compartido con el lado
// (repartidor) fijo, reutilizado también del lado tienda en OrderDetailModal.
export function IssueChatPanel({ orderId }: { orderId: string }) {
  return <DeliveryChatPanel orderId={orderId} viewerRole="repartidor" />;
}
