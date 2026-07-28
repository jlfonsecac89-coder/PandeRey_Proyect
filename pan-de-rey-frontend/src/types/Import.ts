export interface BulkImportProduct {
    name: string;
    price: number;
    stock: number;
    categoryId?: number;
    rawCategory?: string;
    rawSubCategory?: string;
    rawType?: string;
    description?: string;
    image?: string;
    sku?: string;
    attributes?: number[];
    rawFillings?: string[];
    rawToppings?: string[];
}

export interface ImportReport {
    totalRows: number;
    successCount: number;
    failCount: number;
    errors: string[];
    generatedCategories: string[];
    generatedAttributes: string[];
}
