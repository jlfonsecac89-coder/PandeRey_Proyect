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
        
        // Sobrescribir con variables de entorno del servidor (Seguridad PCI-DSS)
        config['mercadoPagoPublicKey'] = process.env.MERCADOPAGO_PUBLIC_KEY || 'APP_USR-6f4ded52-e3d9-4e3e-ac07-8bd4655a9df9';
        // Enmascarar completamente el token de acceso para que nunca viaje al cliente
        config['mercadoPagoAccessToken'] = 'APP_USR-46172256••••••••••••••••••••••••••••';
        
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
    
    // Bloquear llaves de pago críticas contra edición desde el cliente
    const blockedKeys = ['mercadopagoaccesstoken', 'mercadopagopublickey'];
    if (blockedKeys.includes(key.toLowerCase())) {
        return res.status(403).json({ error: 'Restricción de Seguridad: Esta clave se configura de forma segura en las variables de entorno del servidor (.env) y no puede ser modificada desde el panel.' });
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
