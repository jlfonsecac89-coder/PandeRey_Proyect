// Etiquetas en español para las acciones que logAction() ya viene
// registrando en audit_log — un solo lugar para no repetir el mapeo cada
// vez que se agrega una página que las muestra.
export const ACTION_LABELS: Record<string, string> = {
  account_anonymized: "Cuenta anonimizada",
  staff_account_created: "Cuenta de staff creada",
  product_price_changed: "Precio de producto modificado",
  promotion_created: "Promoción creada",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export const ENTITY_LABELS: Record<string, string> = {
  profile: "Perfil",
  product: "Producto",
  promotion: "Promoción",
};

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}
