import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const sqlConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'yourStrong(!)Password',
    database: process.env.DB_NAME || 'PanDeReyDB',
    server: process.env.DB_SERVER || 'localhost',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true', 
        trustServerCertificate: true 
    }
};

export const getDbPool = async () => {
    try {
        const pool = await sql.connect(sqlConfig);
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
};
