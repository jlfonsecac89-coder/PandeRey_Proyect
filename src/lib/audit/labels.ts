// Etiquetas en español para las acciones que logAction() ya viene
// registrando en audit_log — un solo lugar para no repetir el mapeo cada
// vez que se agrega una página que las muestra.
export const ACTION_LABELS: Record<string, string> = {
  account_anonymized: "Cuenta anonimizada",
  staff_account_created: "Cuenta de staff creada",
  product_price_changed: "Precio de producto modificado",
  promotion_created: "Promoción creada",
  promotion_updated: "Promoción editada",
  delivery_message_sent: "Mensaje enviado a repartidor",
  module_toggled: "Módulo activado/desactivado",
  pickup_confirmed: "Retiro confirmado",
  order_cancelled: "Pedido cancelado",
  collection_activated: "Colección activada",
  collection_deactivated: "Colección desactivada",
  collection_dates_changed: "Vigencia de colección modificada",
  collection_products_changed: "Productos de colección modificados",
  order_refund_requested: "Reembolso solicitado",
  order_refund_marked_manual: "Reembolso registrado manualmente",
  campaign_pickup_marked: "Retiro de campaña marcado",
  campaign_pickup_undone: "Retiro de campaña deshecho",
  campaign_created: "Campaña creada",
  campaign_activated: "Campaña activada",
  campaign_deactivated: "Campaña desactivada",
  campaign_window_changed: "Ventana de campaña modificada",
  campaign_dates_added: "Fechas de campaña agregadas",
  campaign_capacity_changed: "Cupo diario de campaña modificado",
  campaign_date_opened: "Fecha de campaña abierta",
  campaign_date_closed: "Fecha de campaña cerrada",
  campaign_date_removed: "Fecha de campaña eliminada",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export const ENTITY_LABELS: Record<string, string> = {
  profile: "Perfil",
  product: "Producto",
  promotion: "Promoción",
  order: "Pedido",
  system_setting: "Ajuste del sistema",
  campaign: "Campaña",
  collection: "Colección",
  campaign_pickup_date: "Fecha de retiro de campaña",
};

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}
