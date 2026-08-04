-- Requeridas por el modelo de datos (BLUEPRINT.md sección 05/13):
-- unaccent: deduplicación de nombres (departments/categories/collections/products.name_normalized)
create extension if not exists unaccent;
create extension if not exists pgcrypto;
