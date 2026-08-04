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
};

export function cartItemUnitPrice(item: Pick<CartItem, "unitBasePrice" | "options">): number {
  return item.unitBasePrice + item.options.reduce((sum, o) => sum + o.priceDelta, 0);
}

export function buildCartItemKey(productId: string, options: CartOptionSelection[]): string {
  const optionIds = options
    .map((o) => o.optionValueId)
    .sort()
    .join(",");
  return `${productId}::${optionIds}`;
}
