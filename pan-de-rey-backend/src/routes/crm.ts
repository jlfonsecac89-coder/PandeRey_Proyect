import { Router } from 'express';
import { getDbPool } from '../db';
import crypto from 'crypto';

const router = Router();

// CRM User Registration
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName, phone } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required registration parameters' });
    }
    
    try {
        const pool = getDbPool();
        const userId = crypto.randomUUID();
        
        // Simular hash simple (para un MVP, en producción usar bcrypt/argon2)
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Create user
            await connection.query(
                'INSERT INTO Users (Id, Email, PasswordHash, FirstName, LastName, Phone) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, email, passwordHash, firstName, lastName, phone || null]
            );
            
            // Assign 'Cliente' role (ID 2 in seed)
            await connection.query(
                'INSERT INTO UserRoles (UserId, RoleId) VALUES (?, ?)',
                [userId, 2]
            );
            
            await connection.commit();
            res.json({ status: 'success', message: 'User registered successfully', userId });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
        
    } catch (err: any) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

// CRM User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const pool = getDbPool();
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        
        const [rows]: any = await pool.query(
            `SELECT u.*, r.Name as RoleName 
             FROM Users u 
             JOIN UserRoles ur ON u.Id = ur.UserId 
             JOIN Roles r ON ur.RoleId = r.Id 
             WHERE u.Email = ? AND u.PasswordHash = ?`,
            [email, passwordHash]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = rows[0];
        delete user.PasswordHash; // Delete sensitive info
        
        res.json({ status: 'success', message: 'Login successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// CRM Address book: GET addresses
router.get('/addresses/:userId', async (req, res) => {
    try {
        const pool = getDbPool();
        const [rows] = await pool.query('SELECT * FROM Addresses WHERE UserId = ?', [req.params.userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
});

// CRM Address book: Add Address
router.post('/addresses', async (req, res) => {
    const { userId, commune, street, number, propertyType, floor, department, latitude, longitude, isDefault } = req.body;
    
    try {
        const pool = getDbPool();
        const addressId = crypto.randomUUID();
        
        if (isDefault) {
            // Reset existing defaults
            await pool.query('UPDATE Addresses SET IsDefault = 0 WHERE UserId = ?', [userId]);
        }
        
        await pool.query(
            `INSERT INTO Addresses (Id, UserId, Commune, Street, Number, PropertyType, Floor, Department, Latitude, Longitude, IsDefault) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [addressId, userId, commune, street, number, propertyType || 'House', floor || null, department || null, latitude || null, longitude || null, isDefault ? 1 : 0]
        );
        
        res.json({ status: 'success', addressId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add address' });
    }
});

export default router;
