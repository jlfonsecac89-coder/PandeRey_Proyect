import { Router } from 'express';
import { getDbPool } from '../db';

const router = Router();

// GET all settings (Useful for frontend dynamic loading)
router.get('/', async (req, res) => {
    try {
        const pool = getDbPool();
        const [rows]: any = await pool.query('SELECT SettingKey, SettingValue FROM SystemSettings');
        
        // Formato llave-valor
        const config: Record<string, string> = {};
        rows.forEach((r: any) => {
            config[r.SettingKey] = r.SettingValue;
        });
        
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST to update a specific setting key (CMS administration)
router.post('/update', async (req, res) => {
    const { key, value } = req.body;
    
    if (!key) {
        return res.status(400).json({ error: 'Setting key is required' });
    }
    
    try {
        const pool = getDbPool();
        await pool.query(
            'INSERT INTO SystemSettings (SettingKey, SettingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE SettingValue = ?',
            [key, value, value]
        );
        
        res.json({ status: 'success', message: `Setting '${key}' updated successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

export default router;
