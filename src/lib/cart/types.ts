export type CartOptionSelection = {
  optionGroupId: string;
  optionGroupName: string;
  optionValueId: string;
  optionValueName: string;
  priceDelta: number;
};

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  slug: string;
  unitBasePrice: number;
  imagePath: string | null;
  quantity: number;
  options: CartOptionSelection[];
  // Texto libre del cliente para un grupo de opciones donde eligió "Otro"
  // (ej. "Relleno: sin azúcar") — nunca se valida contra product_option_values
  // porque no es una opción real del catálogo, es un pedido puntual para
  // este ítem. Va a order_items.customization_note, no a order_item_options.
  customizationNote?: string | null;
};

export function cartItemUnitPrice(item: Pick<CartItem, "unitBasePrice" | "options">): number {
  return item.unitBasePrice + item.options.reduce((sum, o) => sum + o.priceDelta, 0);
}

export function buildCartItemKey(
  productId: string,
  options: CartOptionSelection[],
  customizationNote?: string | null,
): string {
  const optionIds = options
    .map((o) => o.optionValueId)
    .sort()
    .join(",");
  return `${productId}::${optionIds}::${customizationNote ?? ""}`;
}
