/* ========================================================= */
/* Pan de Rey - Arquitectura de Base de Datos (MySQL / MariaDB) */
/* ========================================================= */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* 1. CONFIGURACIÓN DEL SISTEMA & APARIENCIA (CMS / AJUSTES) */
CREATE TABLE IF NOT EXISTS SystemSettings (
    SettingKey VARCHAR(100) PRIMARY KEY,
    SettingValue TEXT NULL,
    Description VARCHAR(255) NULL,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/* Inserción de valores iniciales */
INSERT INTO SystemSettings (SettingKey, SettingValue, Description) VALUES
('hero_type', 'fixed', 'Tipo de visualización del Banner Principal (fixed, slider)'),
('hero_image_url', '/storefront.jpg', 'URL de la imagen del banner principal'),
('hero_title', 'El Arte de la Fermentación Lenta', 'Título principal del Banner'),
('hero_subtitle', 'Panes de masa madre orgánica y pastelería fina horneados diariamente.', 'Subtítulo o descripción del banner'),
('special_event_text', '¡Envío gratis por compras sobre $20.000 durante esta semana!', 'Texto flotante de eventos especiales'),
('social_instagram', 'https://instagram.com/panderey.cl', 'Enlace de la cuenta de Instagram'),
('social_facebook', 'https://facebook.com/panderey.cl', 'Enlace de la cuenta de Facebook'),
('social_whatsapp', 'https://wa.me/56912345678', 'Enlace directo de chat de WhatsApp'),
('social_email', 'panderey.cl@gmail.com', 'Correo oficial de contacto y notificaciones'),
('about_us_history', 'Pan de Rey nació de la pasión por el pan tradicional. Nos dedicamos a revivir las técnicas ancestrales de horneado.', 'Historia de la panadería'),
('about_us_mision', 'Elaborar pan artesanal de la más alta calidad usando masa madre natural e ingredientes orgánicos.', 'Misión corporativa'),
('about_us_vision', 'Ser la panadería de autor referente en Chile por su calidad, sustentabilidad y sabor.', 'Visión corporativa'),
('smtp_host', 'mail.pruebapdrey.001webhospedaje.com', 'Servidor de envío SMTP'),
('smtp_port', '587', 'Puerto de envío SMTP'),
('smtp_user', 'contacto@pruebapdrey.001webhospedaje.com', 'Usuario de correo de envío SMTP'),
('smtp_password', '01l93pDapK', 'Contraseña de correo de envío SMTP');


/* 2. AUTH & USUARIOS (CRM DE CLIENTES) */
CREATE TABLE IF NOT EXISTS Roles (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(50) NOT NULL UNIQUE,
    Description VARCHAR(255) NULL
);

INSERT INTO Roles (Name, Description) VALUES
('Admin', 'Administrador con acceso completo'),
('Cliente', 'Usuario comprador');

CREATE TABLE IF NOT EXISTS Users (
    Id VARCHAR(36) PRIMARY KEY,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NULL,
    GoogleId VARCHAR(255) NULL,
    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(100) NOT NULL,
    Phone VARCHAR(50) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS UserRoles (
    UserId VARCHAR(36) NOT NULL,
    RoleId INT NOT NULL,
    PRIMARY KEY (UserId, RoleId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Addresses (
    Id VARCHAR(36) PRIMARY KEY,
    UserId VARCHAR(36) NOT NULL,
    Commune VARCHAR(100) NOT NULL,
    Street VARCHAR(255) NOT NULL,
    Number VARCHAR(20) NOT NULL,
    PropertyType VARCHAR(20) DEFAULT 'House',
    Floor VARCHAR(10) NULL,
    Department VARCHAR(20) NULL,
    Country VARCHAR(100) DEFAULT 'Chile',
    Latitude DECIMAL(10, 8) NULL,
    Longitude DECIMAL(11, 8) NULL,
    IsDefault TINYINT DEFAULT 0,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);


/* 3. CATÁLOGO DE PRODUCTOS */
CREATE TABLE IF NOT EXISTS Categories (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ParentId INT NULL,
    Name VARCHAR(100) NOT NULL,
    Slug VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT NULL,
    ImageUrl VARCHAR(255) NULL,
    IsActive TINYINT DEFAULT 1,
    FOREIGN KEY (ParentId) REFERENCES Categories(Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Products (
    Id VARCHAR(36) PRIMARY KEY,
    CategoryId INT NULL,
    Name VARCHAR(150) NOT NULL,
    Slug VARCHAR(150) NOT NULL UNIQUE,
    Description TEXT NULL,
    BasePrice DECIMAL(10,2) NOT NULL,
    ImageUrl VARCHAR(255) NULL,
    DefontanaProductCode VARCHAR(100) NULL UNIQUE,
    IsActive TINYINT DEFAULT 1,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ProductVariants (
    Id VARCHAR(36) PRIMARY KEY,
    ProductId VARCHAR(36) NOT NULL,
    VariantName VARCHAR(100) NOT NULL,
    PriceAdjustment DECIMAL(10,2) DEFAULT 0.00,
    SKU VARCHAR(100) UNIQUE NOT NULL,
    IsActive TINYINT DEFAULT 1,
    FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE
);


/* 4. STOCK E INVENTARIO */
CREATE TABLE IF NOT EXISTS Inventory (
    VariantId VARCHAR(36) PRIMARY KEY,
    Quantity INT NOT NULL DEFAULT 0,
    SafetyBuffer INT NOT NULL DEFAULT 2,
    LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (VariantId) REFERENCES ProductVariants(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS InventoryMovements (
    Id VARCHAR(36) PRIMARY KEY,
    VariantId VARCHAR(36) NOT NULL,
    QuantityChange INT NOT NULL,
    MovementType VARCHAR(50) NOT NULL,
    ReferenceId VARCHAR(255) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (VariantId) REFERENCES ProductVariants(Id) ON DELETE CASCADE
);


/* 5. CUPONES DE DESCUENTO */
CREATE TABLE IF NOT EXISTS Coupons (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Code VARCHAR(50) NOT NULL UNIQUE,
    DiscountType VARCHAR(20) NOT NULL,
    DiscountValue DECIMAL(10,2) NOT NULL,
    MinOrderValue DECIMAL(10,2) DEFAULT 0.00,
    MaxUses INT NULL,
    UsesCount INT DEFAULT 0,
    CategoryId INT NULL,
    ProductId VARCHAR(36) NULL,
    ValidFrom DATETIME NULL,
    ValidTo DATETIME NULL,
    IsActive TINYINT DEFAULT 1,
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id) ON DELETE SET NULL,
    FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE SET NULL
);


/* 6. VENTAS, PAGOS Y LOGÍSTICA (DELIVERY / RETIRO) */
CREATE TABLE IF NOT EXISTS Orders (
    Id VARCHAR(36) PRIMARY KEY,
    UserId VARCHAR(36) NULL,
    AddressId VARCHAR(36) NULL,
    CouponId INT NULL,
    TotalAmount DECIMAL(10,2) NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'Nuevo',
    ShippingMethod VARCHAR(50) NOT NULL,
    PickupTime VARCHAR(100) NULL,
    ShippingCost DECIMAL(10,2) DEFAULT 0.00,
    Notes TEXT NULL,
    BoletaNumber VARCHAR(100) NULL,
    BoletaUrl VARCHAR(255) NULL,
    FiscalPrinterStatus VARCHAR(50) DEFAULT 'Pendiente',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL,
    FOREIGN KEY (AddressId) REFERENCES Addresses(Id) ON DELETE SET NULL,
    FOREIGN KEY (CouponId) REFERENCES Coupons(Id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS OrderItems (
    Id VARCHAR(36) PRIMARY KEY,
    OrderId VARCHAR(36) NOT NULL,
    VariantId VARCHAR(36) NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (VariantId) REFERENCES ProductVariants(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Payments (
    Id VARCHAR(36) PRIMARY KEY,
    OrderId VARCHAR(36) NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    PaymentMethod VARCHAR(50) NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    TransactionId VARCHAR(100) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE
);


/* 7. INTEGRACIONES: DEFONTANA ERP */
CREATE TABLE IF NOT EXISTS DefontanaConfig (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ClientSecret VARCHAR(255) NOT NULL,
    AccessToken VARCHAR(2048) NULL,
    TokenExpiresAt DATETIME NULL,
    IsActive TINYINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS DefontanaSyncLogs (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    SyncType VARCHAR(50) NOT NULL,
    Status VARCHAR(50) NOT NULL,
    Message TEXT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;
