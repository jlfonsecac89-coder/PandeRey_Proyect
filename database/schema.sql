-- =========================================================
-- MVP Pan de Rey - Arquitectura de Base de Datos (SQL Server)
-- =========================================================

-- 1. AUTH & USUARIOS
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE, -- 'Admin', 'Cliente'
    Description NVARCHAR(255)
);

CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NULL, -- Null if Google Auth
    GoogleId NVARCHAR(255) NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(50),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE UserRoles (
    UserId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Users(Id),
    RoleId INT FOREIGN KEY REFERENCES Roles(Id),
    PRIMARY KEY (UserId, RoleId)
);

-- 2. CATÁLOGO
CREATE TABLE Categories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ParentId INT NULL FOREIGN KEY REFERENCES Categories(Id),
    Name NVARCHAR(100) NOT NULL,
    Slug NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(MAX),
    ImageUrl NVARCHAR(255),
    IsActive BIT DEFAULT 1
);

CREATE TABLE Products (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CategoryId INT FOREIGN KEY REFERENCES Categories(Id),
    Name NVARCHAR(150) NOT NULL,
    Slug NVARCHAR(150) NOT NULL UNIQUE,
    Description NVARCHAR(MAX),
    BasePrice DECIMAL(10,2) NOT NULL,
    ImageUrl NVARCHAR(255),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE ProductVariants (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProductId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Products(Id),
    VariantName NVARCHAR(100) NOT NULL, -- ej. 'Relleno Dulce de Leche', 'Cobertura Chocolate'
    PriceAdjustment DECIMAL(10,2) DEFAULT 0, -- Precio extra sobre la base
    SKU NVARCHAR(100) UNIQUE,
    IsActive BIT DEFAULT 1
);

-- 3. STOCK Y GESTIÓN DE INVENTARIO
CREATE TABLE Inventory (
    VariantId UNIQUEIDENTIFIER PRIMARY KEY FOREIGN KEY REFERENCES ProductVariants(Id),
    Quantity INT NOT NULL DEFAULT 0,
    SafetyBuffer INT NOT NULL DEFAULT 2, -- Cuando Quantity <= SafetyBuffer, pasa a Agotado
    LastUpdated DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE InventoryMovements (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    VariantId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES ProductVariants(Id),
    QuantityChange INT NOT NULL, -- Positivo (Entrada), Negativo (Salida/Venta)
    MovementType NVARCHAR(50) NOT NULL, -- 'Compra', 'Venta', 'Ajuste', 'Reserva Temporal'
    ReferenceId NVARCHAR(255), -- ID de orden o ajuste
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);

-- 4. VENTAS, MARKETING Y LOGÍSTICA
CREATE TABLE Addresses (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Users(Id),
    RegionId NVARCHAR(50),
    ProvinceId NVARCHAR(50),
    Commune NVARCHAR(100) NOT NULL,
    Street NVARCHAR(255) NOT NULL,
    Number NVARCHAR(20) NOT NULL,
    PropertyType NVARCHAR(20) DEFAULT 'House', -- 'House', 'Building'
    Floor NVARCHAR(10),
    Department NVARCHAR(20),
    Country NVARCHAR(100) DEFAULT 'Chile',
    Latitude DECIMAL(10, 8) NULL,
    Longitude DECIMAL(11, 8) NULL,
    IsDefault BIT DEFAULT 0
);

CREATE TABLE Coupons (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL UNIQUE,
    DiscountType NVARCHAR(20) NOT NULL, -- 'Percentage', 'FixedAmount'
    DiscountValue DECIMAL(10,2) NOT NULL,
    MinOrderValue DECIMAL(10,2) DEFAULT 0,
    MaxUses INT NULL,
    UsesCount INT DEFAULT 0,
    CategoryId INT NULL FOREIGN KEY REFERENCES Categories(Id),
    ProductId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Products(Id),
    ValidFrom DATETIME2,
    ValidTo DATETIME2,
    IsActive BIT DEFAULT 1
);

CREATE TABLE Orders (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Users(Id),
    AddressId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Addresses(Id),
    CouponId INT NULL FOREIGN KEY REFERENCES Coupons(Id),
    TotalAmount DECIMAL(10,2) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Nuevo', -- 'Nuevo', 'Preparando', 'Listo', 'Entregado', 'Cancelado'
    ShippingMethod NVARCHAR(50) NOT NULL, -- 'Retiro', 'Delivery'
    PickupTime NVARCHAR(100) NULL,
    ShippingCost DECIMAL(10,2) DEFAULT 0,
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE OrderItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    OrderId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Orders(Id),
    VariantId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES ProductVariants(Id),
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    Subtotal AS (Quantity * UnitPrice)
);

-- 5. ROW LEVEL SECURITY (RLS) Básico (Concepto para SQL Server)
-- Crear un esquema de seguridad para habilitar RLS si se conecta mediante un contexto
CREATE SCHEMA Security;
GO

CREATE FUNCTION Security.fn_UserSecurityPredicate(@UserId UNIQUEIDENTIFIER)
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_UserSecurityPredicateResult
    -- La lógica aquí valida si el usuario logueado en la sesión de base de datos
    -- coincide con el @UserId o si tiene rol de 'Admin'.
    -- En entornos Node.js se pasa el UserId vía CONTEXT_INFO o SESSION_CONTEXT
    WHERE @UserId = CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER)
    OR CAST(SESSION_CONTEXT(N'Role') AS NVARCHAR(50)) = 'Admin';
GO

-- Ejemplo de aplicación a la tabla Orders
CREATE SECURITY POLICY Security.OrderSecurityPolicy
    ADD FILTER PREDICATE Security.fn_UserSecurityPredicate(UserId)
    ON dbo.Orders
    WITH (STATE = ON);
GO

CREATE SECURITY POLICY Security.AddressSecurityPolicy
    ADD FILTER PREDICATE Security.fn_UserSecurityPredicate(UserId)
    ON dbo.Addresses
    WITH (STATE = ON);
GO
