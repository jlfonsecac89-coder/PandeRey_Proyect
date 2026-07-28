export interface Product {
    id: string;
    categoryId: number;
    name: string;
    slug: string;
    basePrice: number;
    imageUrl?: string;
    description?: string;
    isActive: boolean;
    variants?: ProductVariant[];
}

export interface ProductVariant {
    id: string;
    productId: string;
    variantName: string;
    priceAdjustment: number;
    sku: string;
    isActive: boolean;
}

export interface ProductDTO {
    name: string;
    slug: string;
    price: number;
    categoryId: number;
    stock: number;
    image?: string;
    description?: string;
    attributes?: number[];
}
