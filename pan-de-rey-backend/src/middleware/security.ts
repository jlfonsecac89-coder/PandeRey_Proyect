import { Request, Response, NextFunction } from 'express';
import { getDbPool } from '../db';

/**
 * Middleware to apply basic security headers protecting against common web exploits.
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Anti-clickjacking header
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Cross-Site Scripting (XSS) protection filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Strict-Transport-Security (HSTS) if connection is HTTPS (simulated/enforced in prod)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
};

/**
 * Middleware to validate administrative API requests against the IP whitelist configured in SystemSettings.
 */
export const ipWhitelistFilter = async (req: Request, res: Response, next: NextFunction) => {
    const isProtectedPath = req.path.startsWith('/api/settings') || req.path.startsWith('/api/crm');
    if (!isProtectedPath) {
        return next();
    }

    try {
        const pool = getDbPool();
        const [rows]: any = await pool.query("SELECT SettingValue FROM SystemSettings WHERE SettingKey = 'ipWhitelist'");
        
        let allowedIps: string[] = [];
        if (rows.length > 0 && rows[0].SettingValue) {
            allowedIps = rows[0].SettingValue.split(',').map((ip: string) => ip.trim());
        }

        if (allowedIps.length === 0) {
            // No whitelist configured, skip check
            return next();
        }

        // Get request IP
        const rawIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '').split(',')[0].trim();
        const clientIp = rawIp.replace(/^::ffff:/, ''); // Normalize IPv6 mapped IPv4

        // Local loopback is always permitted to avoid locking out developer
        const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';

        if (isLocal || allowedIps.includes(clientIp)) {
            return next();
        }

        console.warn(`[Security Alert] Forbidden access attempt from IP: ${clientIp} to route: ${req.path}`);
        
        // Log access rejection to Security Audit Logs simulation/database
        // In a real system we would insert into a SecurityLogs table.
        
        return res.status(403).json({
            error: 'Restricción de Seguridad: Dirección IP de origen no autorizada para el acceso administrativo.'
        });
    } catch (err) {
        console.error('IP Whitelisting check failed:', err);
        // Safe fallback: allow developers to connect if table is not yet generated
        next();
    }
};
