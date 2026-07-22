-- 1. Agregar parent_id a la tabla categories para habilitar el árbol jerárquico recursivo
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. Crear tabla de Grupos de Atributos (ej: Relleno, Cobertura, Tipo de Leche)
CREATE TABLE IF NOT EXISTS public.attribute_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear tabla de Valores de Atributos (ej: Fresa, Chocolate, Almendra)
CREATE TABLE IF NOT EXISTS public.attribute_values (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES public.attribute_groups(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    CONSTRAINT unique_group_value UNIQUE (group_id, value)
);

-- 4. Tabla Puente de Asociación: Categoría/Tipo <-> Grupo de Atributos (Filtro por Tipo de Producto)
CREATE TABLE IF NOT EXISTS public.category_attribute_groups (
    category_id INT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    attribute_group_id INT NOT NULL REFERENCES public.attribute_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, attribute_group_id)
);

-- 5. Tabla Puente de Variantes de Productos <-> Valores de Atributos (Asociación concreta)
CREATE TABLE IF NOT EXISTS public.variant_attribute_values (
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    attribute_value_id INT NOT NULL REFERENCES public.attribute_values(id) ON DELETE RESTRICT,
    PRIMARY KEY (variant_id, attribute_value_id)
);
