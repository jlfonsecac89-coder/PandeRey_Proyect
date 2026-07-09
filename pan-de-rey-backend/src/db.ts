import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuration mapped to environment variables
export const dbConfig = {
    host: process.env.DB_HOST || 'db.cxhjthmgkzqpldkkdqkv.supabase.co',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '01l93pDapK', // user can modify this in their local .env
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
    
    // Convert common MySQL functions to Postgres equivalents
    formattedSql = formattedSql
        .replace(/UUID\(\)/gi, 'gen_random_uuid()')
        .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\$?[\d]+|\?)\s+DAY\)/gi, "NOW() - ($1 * INTERVAL '1 day')")
        .replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE/gi, 'ON CONFLICT DO UPDATE');
        
    return formattedSql;
}

class PgConnectionWrapper {
    private client: PoolClient;
    
    constructor(client: PoolClient) {
        this.client = client;
    }
    
    async query(sql: string, params?: any[]): Promise<[any[], any]> {
        const pgSql = mysqlToPostgresQuery(sql);
        const res = await this.client.query(pgSql, params || []);
        return [res.rows, null];
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
        return [res.rows, null];
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
            console.log('[Postgres Pool] Initialized successfully for Supabase.');
        } catch (err) {
            console.error('Postgres pool creation failed:', err);
            throw err;
        }
    }
    return poolWrapper;
};
