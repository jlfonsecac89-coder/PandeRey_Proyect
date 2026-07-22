-- =========================================================================
-- MIGRACIÓN DE TAXONOMÍA DE CATÁLOGO PEDIDOSYA (PAN DE REY)
-- =========================================================================



-- 1. INSERTAR CATEGORÍAS RAÍZ (NIVEL 1)
-- Panadería (id=1) y Pastelería (id=2) ya existen en la base de datos
INSERT INTO public.categories (id, parent_id, name, slug, is_active) VALUES
(6, NULL, 'Desayuno', 'breakfast', 1),
(7, NULL, 'Hojaldrados', 'puff-pastry', 1)
ON CONFLICT (id) DO NOTHING;

-- 2. INSERTAR SUBCATEGORÍAS (NIVEL 2)
INSERT INTO public.categories (id, parent_id, name, slug, is_active) VALUES
-- Subcategorías de Pastelería (parent_id = 2)
(8, 2, 'Bocaditos', 'bocaditos', 1),
(9, 2, 'Queques', 'queques', 1),
(10, 2, 'Tortas', 'tortas', 1),
(11, 2, 'Pies', 'pies', 1),
(12, 2, 'Alfajores', 'alfajores', 1),
(13, 2, 'Cheesecakes', 'cheesecakes', 1),
(14, 2, 'Pastas Secas', 'pastas-secas', 1),

-- Subcategorías de Desayuno (parent_id = 6)
(15, 6, 'Cachitos', 'cachitos', 1),
(16, 6, 'Croissants', 'croissants', 1),
(17, 6, 'Bocaditos Salados', 'bocaditos-salados', 1),
(18, 6, 'Bollería Dulce', 'bolleria-dulce', 1),

-- Subcategorías de Panadería (parent_id = 1)
(19, 1, 'Pan Dulce', 'pan-dulce', 1),
(20, 1, 'Pan Especial', 'pan-especial', 1),

-- Subcategorías de Hojaldrados (parent_id = 7)
(21, 7, 'Enrollados', 'enrollados', 1),
(22, 7, 'Hojaldres Dulces', 'hojaldres-dulces', 1)
ON CONFLICT (id) DO NOTHING;

-- 3. INSERTAR TIPOS / NODOS HOJA (NIVEL 3)
INSERT INTO public.categories (id, parent_id, name, slug, is_active) VALUES
-- Tipos de Bocaditos (parent_id = 8)
(23, 8, 'Cocadas', 'cocadas', 1),
(24, 8, 'Trufas', 'trufas', 1),
(25, 8, 'Profiteroles', 'profiteroles', 1),

-- Tipos de Queques (parent_id = 9)
(26, 9, 'Queque', 'queque', 1),

-- Tipos de Tortas (parent_id = 10)
(27, 10, 'Tres Leches', 'tres-leches', 1),
(28, 10, 'Torta Matilda', 'torta-matilda', 1),
(29, 10, 'Carrot Cake', 'carrot-cake', 1),
(30, 10, 'Torta Choco Manjar', 'torta-choco-manjar', 1),

-- Tipos de Pies (parent_id = 11)
(31, 11, 'Pie de Limón', 'pie-de-limon', 1),

-- Tipos de Alfajores (parent_id = 12)
(32, 12, 'Alfajor Tradicional', 'alfajor-tradicional', 1),
(33, 12, 'Alfajor de Chocolate', 'alfajor-de-chocolate', 1),

-- Tipos de Cheesecakes (parent_id = 13)
(34, 13, 'Cheesecake', 'cheesecake', 1),

-- Tipos de Pastas Secas (parent_id = 14)
(35, 14, 'Surtido', 'surtido-pastas-secas', 1),

-- Tipos de Cachitos (parent_id = 15)
(36, 15, 'Cachito', 'cachito', 1),

-- Tipos de Croissants (parent_id = 16)
(37, 16, 'Croissant', 'croissant', 1),

-- Tipos de Bocaditos Salados (parent_id = 17)
(38, 17, 'Lunch', 'lunch', 1),

-- Tipos de Bollería Dulce (parent_id = 18)
(39, 18, 'Medialuna', 'medialuna', 1),

-- Tipos de Pan Dulce (parent_id = 19)
(40, 19, 'Pan Piñita', 'pan-pinita', 1),

-- Tipos de Pan Especial (parent_id = 20)
(41, 20, 'Pan de Queso', 'pan-de-queso', 1),

-- Tipos de Enrollados (parent_id = 21)
(42, 21, 'Enrollado', 'enrollado', 1),

-- Tipos de Hojaldres Dulces (parent_id = 22)
(43, 22, 'Danessa', 'danessa', 1),
(44, 22, 'Palmerita', 'palmerita', 1)
ON CONFLICT (id) DO NOTHING;

-- Ajustar la secuencia del SERIAL de Categories
SELECT setval('public.categories_id_seq', COALESCE((SELECT MAX(id) FROM public.categories), 1));

-- 4. INSERTAR GRUPOS DE ATRIBUTOS
INSERT INTO public.attribute_groups (id, name) VALUES
(1, 'Relleno'),
(2, 'Cobertura')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.attribute_groups_id_seq', COALESCE((SELECT MAX(id) FROM public.attribute_groups), 1));

-- 5. INSERTAR VALORES DE ATRIBUTOS (DULCES Y SALADOS UNIFICADOS)
INSERT INTO public.attribute_values (id, group_id, value) VALUES
-- Relleno (group_id = 1)
(1, 1, 'Crema Pastelera'),
(2, 1, 'Ganache de Chocolate'),
(3, 1, 'Frosting de Queso Crema'),
(4, 1, 'Manjar'),
(5, 1, 'Crema de Limón'),
(6, 1, 'Jamón de Pierna y Tocino'),
(7, 1, 'Jamón y Queso Crema'),
(8, 1, 'Jamón y Queso Gouda'),
(9, 1, 'Jamón y Queso Mozzarella'),
(10, 1, 'Queso Palmita'),

-- Cobertura (group_id = 2)
(11, 2, 'Chocolate'),
(12, 2, 'Azúcar Flor'),
(13, 2, 'Merengue Italiano'),
(14, 2, 'Coco Rallado'),
(15, 2, 'Crema de Maracuyá'),
(16, 2, 'Mermelada de Frambuesa'),
(17, 2, 'Azúcar'),
(18, 2, 'Frutas Frescas')
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.attribute_values_id_seq', COALESCE((SELECT MAX(id) FROM public.attribute_values), 1));

-- 6. ASOCIAR GRUPOS DE ATRIBUTOS A LOS TIPOS CORRESPONDIENTES (NODO HOJA)
INSERT INTO public.category_attribute_groups (category_id, attribute_group_id) VALUES
-- Profiteroles (id=25) -> Relleno (1) y Cobertura (2)
(25, 1),
(25, 2),

-- Tres Leches (id=27) -> Cobertura (2) (Y opcionalmente Cobertura + Relleno según la definición)
(27, 2),

-- Torta Matilda (id=28) -> Relleno (1) y Cobertura (2)
(28, 1),
(28, 2),

-- Carrot Cake (id=29) -> Relleno (1) y Cobertura (2)
(29, 1),
(29, 2),

-- Torta Choco Manjar (id=30) -> Relleno (1) y Cobertura (2)
(30, 1),
(30, 2),

-- Pie de Limón (id=31) -> Relleno (1) y Cobertura (2)
(31, 1),
(31, 2),

-- Alfajor Tradicional (id=32) -> Relleno (1)
(32, 1),

-- Alfajor de Chocolate (id=33) -> Relleno (1) y Cobertura (2)
(33, 1),
(33, 2),

-- Cheesecake (id=34) -> Cobertura (2)
(34, 2),

-- Cachito (id=36) -> Relleno (1)
(36, 1),

-- Croissant (id=37) -> Relleno (1)
(37, 1),

-- Lunch (id=38) -> Relleno (1)
(38, 1),

-- Pan Piñita (id=40) -> Cobertura (2)
(40, 2),

-- Pan de Queso (id=41) -> Relleno (1)
(41, 1),

-- Enrollado (id=42) -> Relleno (1)
(42, 1),

-- Danessa (id=43) -> Relleno (1) y Cobertura (2)
(43, 1),
(43, 2)
ON CONFLICT (category_id, attribute_group_id) DO NOTHING;


