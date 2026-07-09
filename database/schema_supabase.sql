-- =========================================================================
-- MVP Pan de Rey - Arquitectura de Base de Datos (PostgreSQL / Supabase)
-- =========================================================================

-- Desactivar triggers temporalmente para migración limpia
SET session_replication_role = 'replica';

-- 1. CONFIGURACIÓN DEL SISTEMA & APARIENCIA (CMS)
CREATE TABLE IF NOT EXISTS public.system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserción de configuraciones iniciales
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('hero_type', 'fixed', 'Tipo de visualización del Banner Principal (fixed, slider)'),
('hero_image_url', '/storefront.jpg', 'URL de la imagen del banner principal'),
('hero_title', 'El Arte de la Fermentación Lenta', 'Título principal del Banner'),
('hero_subtitle', 'Panes de masa madre orgánica y pastelería fina horneados diariamente.', 'Subtítulo o descripción del banner'),
('social_instagram', 'https://instagram.com/panderey.cl', 'Enlace de la cuenta de Instagram'),
('social_facebook', 'https://facebook.com/panderey.cl', 'Enlace de la cuenta de Facebook'),
('social_whatsapp', 'https://wa.me/56912345678', 'Enlace directo de chat de WhatsApp'),
('social_email', 'panderey.cl@gmail.com', 'Correo oficial de contacto y notificaciones'),
('about_us_history', 'Pan de Rey nació de la pasión por el pan tradicional. Nos dedicamos a revivir las técnicas ancestrales de horneado.', 'Historia de la panadería'),
('about_us_mision', 'Elaborar pan artesanal de la más alta calidad usando masa madre natural e ingredientes orgánicos.', 'Misión corporativa'),
('about_us_vision', 'Ser la panadería de autor referente en Chile por su calidad, sustentabilidad y sabor.', 'Visión corporativa')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. ROLES, PROFILES Y SEGURIDAD
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
);

INSERT INTO public.roles (name, description) VALUES
('Admin', 'Administrador con acceso completo'),
('Cliente', 'Usuario comprador')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    commune VARCHAR(100) NOT NULL,
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20) NOT NULL,
    property_type VARCHAR(20) DEFAULT 'House',
    floor VARCHAR(10) NULL,
    department VARCHAR(20) NULL,
    country VARCHAR(100) DEFAULT 'Chile',
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    is_default SMALLINT DEFAULT 0
);

-- 3. CATÁLOGO DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    parent_id INT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    image_url VARCHAR(255) NULL,
    is_active SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255) NULL,
    defontana_product_code VARCHAR(100) UNIQUE NULL,
    is_active SMALLINT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    sku VARCHAR(100) UNIQUE NOT NULL,
    is_active SMALLINT DEFAULT 1
);

-- 4. STOCK E INVENTARIO
CREATE TABLE IF NOT EXISTS public.inventory (
    variant_id UUID PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    safety_buffer INT NOT NULL DEFAULT 2,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity_change INT NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CUPONES DE DESCUENTO
CREATE TABLE IF NOT EXISTS public.coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(10,2) DEFAULT 0.00,
    max_uses INT NULL,
    uses_count INT DEFAULT 0,
    category_id INT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    product_id UUID NULL REFERENCES public.products(id) ON DELETE SET NULL,
    valid_from TIMESTAMP WITH TIME ZONE NULL,
    valid_to TIMESTAMP WITH TIME ZONE NULL,
    is_active SMALLINT DEFAULT 1
);

-- 6. VENTAS, PAGOS Y LOGÍSTICA
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    coupon_id INT NULL REFERENCES public.coupons(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    shipping_method VARCHAR(50) NOT NULL,
    pickup_time VARCHAR(100) NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT NULL,
    boleta_number VARCHAR(100) NULL,
    boleta_url VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    transaction_id VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. INTEGRACIONES ERP DEFONTANA
CREATE TABLE IF NOT EXISTS public.defontana_config (
    id SERIAL PRIMARY KEY,
    client_secret VARCHAR(255) NOT NULL,
    access_token VARCHAR(2048) NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NULL,
    is_active SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.defontana_sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Restaurar triggers
SET session_replication_role = 'origin';

-- =========================================================================
-- FUNCIONES Y TRIGGERS AUTOMÁTICOS (Supabase Auth Integration)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id INT;
BEGIN
    -- Insertar en profiles
    INSERT INTO public.profiles (id, email, first_name, last_name, phone)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', 'Cliente'),
        COALESCE(new.raw_user_meta_data->>'last_name', 'Invitado'),
        new.phone
    );

    -- Obtener ID del rol Cliente
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'Cliente' LIMIT 1;

    -- Asignar rol de Cliente
    IF default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (new.id, default_role_id);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador después de crear un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- CONFIGURACIÓN DE BUCKETS EN SUPABASE STORAGE
-- =========================================================================

-- Registrar buckets si no existen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
('public-assets', 'public-assets', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
('products', 'products', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
('invoices', 'invoices', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- POLÍTICAS DE ACCESO SEGURO (Row Level Security - RLS)
-- =========================================================================

-- Activar RLS en tablas críticas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para verificar si el usuario es Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para Profiles
CREATE POLICY "Permitir lectura de perfiles propios o administradores"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Permitir actualización a perfiles propios"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para Direcciones
CREATE POLICY "Direcciones visibles por dueños o administradores"
    ON public.addresses FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Inserción de direcciones a dueños"
    ON public.addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Actualización de direcciones a dueños"
    ON public.addresses FOR UPDATE
    USING (auth.uid() = user_id);

-- Políticas para Pedidos (Orders)
CREATE POLICY "Pedidos visibles por dueños o administradores"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Permitir inserción de pedidos a autenticados e invitados"
    ON public.orders FOR INSERT
    WITH CHECK (true); -- Permitir inserción durante checkout (con userId nulo para leads)

CREATE POLICY "Modificación de pedidos a administradores"
    ON public.orders FOR UPDATE
    USING (public.is_admin());

-- Políticas para Pagos (Payments)
CREATE POLICY "Pagos visibles por dueños o administradores"
    ON public.payments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin())
    ));

CREATE POLICY "Permitir inserción de pagos"
    ON public.payments FOR INSERT
    WITH CHECK (true);
