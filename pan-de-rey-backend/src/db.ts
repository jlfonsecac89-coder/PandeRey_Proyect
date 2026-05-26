import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
    host: process.env.DB_HOST || '136.243.227.82', // Defaults to hosting IP for production config
    user: process.env.DB_USER || 'bimndboe',
    password: process.env.DB_PASSWORD || '01l93pDapK',
    database: process.env.DB_NAME || 'bimndboe_panderey',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool: mysql.Pool;

export const getDbPool = (): mysql.Pool => {
    if (!pool) {
        try {
            pool = mysql.createPool(dbConfig);
        } catch (err) {
            console.error('Database pool creation failed:', err);
            throw err;
        }
    }
    return pool;
};
