import { Pool, PoolClient } from 'pg';

// Configuration mapped to environment variables
export const dbConfig = {
    host: process.env.DB_HOST || 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '01l93pDapK',
    database: process.env.DB_NAME || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        rejectUnauthorized: false // Supabase connections require SSL
    }
};

// SQL compatibility layer: Translates MySQL syntax to PostgreSQL syntax
export function mysqlToPostgresQuery(sql: string): string {
    let index = 1;
    
    // Replace "?" placeholder with "$1", "$2", etc. (ignoring quoted strings)
    let tempSql = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        if (char === "'" && sql[i - 1] !== '\\') {
            inSingleQuote = !inSingleQuote;
        } else if (char === '"' && sql[i - 1] !== '\\') {
            inDoubleQuote = !inDoubleQuote;
        }
        
        if (char === '?' && !inSingleQuote && !inDoubleQuote) {
            tempSql += `$${index++}`;
        } else {
            tempSql += char;
        }
    }
    
    // Convert backticks ` ` to double quotes " "
    let formattedSql = '';
    for (let i = 0; i < tempSql.length; i++) {
        const char = tempSql[i];
        if (char === '`') {
            formattedSql += '"';
        } else {
            formattedSql += char;
        }
    }
    
    // Convert MySQL functions to Postgres equivalents
    formattedSql = formattedSql
        .replace(/UUID\(\)/gi, 'gen_random_uuid()')
        .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\$?[\d]+|\?)\s+DAY\)/gi, "NOW() - ($1 * INTERVAL '1 day')")
        .replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE/gi, 'ON CONFLICT DO UPDATE');

    // Mapear nombres de tablas PascalCase a snake_case de Postgres
    formattedSql = formattedSql
        .replace(/SystemSettings/g, 'system_settings')
        .replace(/ProductVariants/g, 'product_variants')
        .replace(/InventoryMovements/g, 'inventory_movements')
        .replace(/UserRoles/g, 'user_roles')
        .replace(/OrderItems/g, 'order_items')
        .replace(/DefontanaConfig/g, 'defontana_config')
        .replace(/DefontanaSyncLogs/g, 'defontana_sync_logs')
        .replace(/Users/g, 'profiles')
        .replace(/Roles/g, 'roles')
        .replace(/Profiles/g, 'profiles')
        .replace(/Addresses/g, 'addresses')
        .replace(/Categories/g, 'categories')
        .replace(/Products/g, 'products')
        .replace(/Inventory/g, 'inventory')
        .replace(/Coupons/g, 'coupons')
        .replace(/Orders/g, 'orders')
        .replace(/Payments/g, 'payments')
        // Mapear nombres de columnas PascalCase/camelCase a snake_case de Postgres
        .replace(/SettingKey/g, 'setting_key')
        .replace(/SettingValue/g, 'setting_value')
        .replace(/ParentId/g, 'parent_id')
        .replace(/ImageUrl/g, 'image_url')
        .replace(/IsActive/g, 'is_active')
        .replace(/BasePrice/g, 'base_price')
        .replace(/DefontanaProductCode/g, 'defontana_product_code')
        .replace(/VariantName/g, 'variant_name')
        .replace(/PriceAdjustment/g, 'price_adjustment')
        .replace(/SafetyBuffer/g, 'safety_buffer')
        .replace(/LastUpdated/g, 'last_updated')
        .replace(/QuantityChange/g, 'quantity_change')
        .replace(/MovementType/g, 'movement_type')
        .replace(/ReferenceId/g, 'reference_id')
        .replace(/PropertyType/g, 'property_type')
        .replace(/IsDefault/g, 'is_default')
        .replace(/DiscountType/g, 'discount_type')
        .replace(/DiscountValue/g, 'discount_value')
        .replace(/MinOrderValue/g, 'min_order_value')
        .replace(/MaxUses/g, 'max_uses')
        .replace(/UsesCount/g, 'uses_count')
        .replace(/ValidFrom/g, 'valid_from')
        .replace(/ValidTo/g, 'valid_to')
        .replace(/UserId/g, 'user_id')
        .replace(/AddressId/g, 'address_id')
        .replace(/CouponId/g, 'coupon_id')
        .replace(/ProductId/g, 'product_id')
        .replace(/CategoryId/g, 'category_id')
        .replace(/RoleId/g, 'role_id')
        .replace(/TotalAmount/g, 'total_amount')
        .replace(/ShippingMethod/g, 'shipping_method')
        .replace(/PickupTime/g, 'pickup_time')
        .replace(/ShippingCost/g, 'shipping_cost')
        .replace(/BoletaNumber/g, 'boleta_number')
        .replace(/BoletaUrl/g, 'boleta_url')
        .replace(/FiscalPrinterStatus/g, 'fiscal_printer_status')
        .replace(/OrderId/g, 'order_id')
        .replace(/VariantId/g, 'variant_id')
        .replace(/UnitPrice/g, 'unit_price')
        .replace(/PaymentMethod/g, 'payment_method')
        .replace(/TransactionId/g, 'transaction_id')
        .replace(/ClientSecret/g, 'client_secret')
        .replace(/AccessToken/g, 'access_token')
        .replace(/TokenExpiresAt/g, 'token_expires_at')
        .replace(/SyncType/g, 'sync_type')
        .replace(/FirstName/g, 'first_name')
        .replace(/LastName/g, 'last_name')
        .replace(/CreatedAt/g, 'created_at')
        .replace(/UpdatedAt/g, 'updated_at');
        
    return formattedSql;
}

// Convert lowercase/snake_case database keys to PascalCase for compatibility with original code
function mapRowKeys(row: any): any {
    if (!row || typeof row !== 'object') return row;
    const mapped: any = {};
    for (const key of Object.keys(row)) {
        let newKey = key;
        if (key === 'id') newKey = 'Id';
        else if (key === 'email') newKey = 'Email';
        else if (key === 'phone') newKey = 'Phone';
        else if (key === 'first_name') newKey = 'FirstName';
        else if (key === 'last_name') newKey = 'LastName';
        else if (key === 'variant_name') newKey = 'VariantName';
        else if (key === 'price_adjustment') newKey = 'PriceAdjustment';
        else if (key === 'base_price') newKey = 'BasePrice';
        else if (key === 'sku') newKey = 'SKU';
        else if (key === 'quantity') newKey = 'Quantity';
        else if (key === 'safety_buffer') newKey = 'SafetyBuffer';
        else if (key === 'setting_key') newKey = 'SettingKey';
        else if (key === 'setting_value') newKey = 'SettingValue';
        else if (key === 'user_id') newKey = 'UserId';
        else if (key === 'address_id') newKey = 'AddressId';
        else if (key === 'coupon_id') newKey = 'CouponId';
        else if (key === 'total_amount') newKey = 'TotalAmount';
        else if (key === 'status') newKey = 'Status';
        else if (key === 'shipping_method') newKey = 'ShippingMethod';
        else if (key === 'pickup_time') newKey = 'PickupTime';
        else if (key === 'shipping_cost') newKey = 'ShippingCost';
        else if (key === 'notes') newKey = 'Notes';
        else if (key === 'boleta_number') newKey = 'BoletaNumber';
        else if (key === 'boleta_url') newKey = 'BoletaUrl';
        else if (key === 'created_at') newKey = 'CreatedAt';
        else if (key === 'updated_at') newKey = 'UpdatedAt';
        else if (key === 'variant_id') newKey = 'VariantId';
        else if (key === 'unit_price') newKey = 'UnitPrice';
        else if (key === 'subtotal') newKey = 'Subtotal';
        else if (key === 'amount') newKey = 'Amount';
        else if (key === 'payment_method') newKey = 'PaymentMethod';
        else if (key === 'transaction_id') newKey = 'TransactionId';
        else if (key === 'role_id') newKey = 'RoleId';
        else {
            // Capitalize first letter
            newKey = key.charAt(0).toUpperCase() + key.slice(1);
        }
        mapped[newKey] = row[key];
    }
    return mapped;
}

class PgConnectionWrapper {
    private client: PoolClient;
    
    constructor(client: PoolClient) {
        this.client = client;
    }
    
    async query(sql: string, params?: any[]): Promise<[any[], any]> {
        const pgSql = mysqlToPostgresQuery(sql);
        const res = await this.client.query(pgSql, params || []);
        const mappedRows = res.rows.map(mapRowKeys);
        return [mappedRows, null];
    }
    
    async beginTransaction(): Promise<void> {
        await this.client.query('BEGIN');
    }
    
    async commit(): Promise<void> {
        await this.client.query('COMMIT');
    }
    
    async rollback(): Promise<void> {
        await this.client.query('ROLLBACK');
    }
    
    async release(): Promise<void> {
        this.client.release();
    }
}

class PgPoolWrapper {
    private pool: Pool;
    
    constructor(pool: Pool) {
        this.pool = pool;
    }
    
    async query(sql: string, params?: any[]): Promise<[any[], any]> {
        const pgSql = mysqlToPostgresQuery(sql);
        const res = await this.pool.query(pgSql, params || []);
        const mappedRows = res.rows.map(mapRowKeys);
        return [mappedRows, null];
    }
    
    async getConnection(): Promise<any> {
        const client = await this.pool.connect();
        return new PgConnectionWrapper(client);
    }
    
    async end(): Promise<void> {
        await this.pool.end();
    }
}

let poolWrapper: PgPoolWrapper | null = null;

export const getDbPool = (): any => {
    if (!poolWrapper) {
        try {
            const pgPool = new Pool({
                host: dbConfig.host,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                port: dbConfig.port,
                ssl: dbConfig.ssl,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000
            });
            
            poolWrapper = new PgPoolWrapper(pgPool);
            // Drop profiles_id_fkey constraint to allow guest checkouts (leads)
            pgPool.query('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;').catch(err => {
                console.warn('[Database Setup WARNING]: Could not drop profiles_id_fkey constraint:', err.message);
            });
            console.log('[Frontend Postgres Pool] Initialized successfully.');
        } catch (err) {
            console.error('Postgres pool creation failed:', err);
            throw err;
        }
    }
    return poolWrapper;
};
