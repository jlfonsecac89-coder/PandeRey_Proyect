export interface Category {
    id: number;
    name: string;
    slug: string;
    parentId?: number | null;
    isActive: boolean;
}

export interface AttributeGroup {
    id: number;
    name: string;
    isActive: boolean;
}

export interface AttributeValue {
    id: number;
    groupId: number;
    value: string;
}

export interface CategoryDTO {
    name: string;
    slug: string;
    parentId?: number | null;
}
