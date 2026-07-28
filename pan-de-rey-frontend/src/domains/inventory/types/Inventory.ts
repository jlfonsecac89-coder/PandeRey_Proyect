export interface Inventory {
    variantId: string;
    quantity: number;
    safetyBuffer: number;
    lastStockDate?: string;
    productCreatedAt?: string;
}

export interface InventoryAdjustDTO {
    variantId: string;
    adjustment: number;
    reason: string;
}
