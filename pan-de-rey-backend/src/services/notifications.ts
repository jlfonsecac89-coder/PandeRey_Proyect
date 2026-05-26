import nodemailer from 'nodemailer';
import { getDbPool } from '../db';

// SMTP Transport Configurer
const getTransporter = async () => {
    try {
        const pool = getDbPool();
        const [rows]: any = await pool.query(
            'SELECT SettingKey, SettingValue FROM SystemSettings WHERE SettingKey IN (\'smtp_host\', \'smtp_port\', \'smtp_user\', \'smtp_password\', \'social_email\')'
        );
        
        const settings: Record<string, string> = {};
        rows.forEach((r: any) => {
            settings[r.SettingKey] = r.SettingValue;
        });

        const host = settings['smtp_host'] || 'mail.pruebapdrey.001webhospedaje.com';
        const port = parseInt(settings['smtp_port'] || '587');
        const user = settings['smtp_user'] || 'contacto@pruebapdrey.001webhospedaje.com';
        const pass = settings['smtp_password'] || '01l93pDapK';
        
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // True for 465, false for others
            auth: { user, pass },
            tls: {
                rejectUnauthorized: false // Avoid SSL handshake errors on test domains
            }
        });
    } catch (err) {
        console.error('Failed to configure SMTP transport, using fallback:', err);
        // Fallback mock transporter
        return nodemailer.createTransport({
            host: 'mail.pruebapdrey.001webhospedaje.com',
            port: 587,
            secure: false,
            auth: {
                user: 'contacto@pruebapdrey.001webhospedaje.com',
                pass: '01l93pDapK'
            },
            tls: { rejectUnauthorized: false }
        });
    }
};

export const sendStatusEmail = async (clientEmail: string, orderId: string, status: string, total: number) => {
    try {
        const transporter = await getTransporter();
        const fromEmail = 'panderey.cl@gmail.com'; // User's requested sender
        
        const subject = `Pan de Rey - Pedido ${orderId.substring(0, 8)} actualizado: ${status}`;
        const html = `
            <div style="font-family: 'Montserrat', sans-serif; background-color: #0b0b0b; color: #f3f3f3; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #C5A880;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #C5A880; font-family: 'Playfair Display', serif; margin: 0; font-size: 28px; letter-spacing: 2px;">PAN DE REY</h1>
                    <p style="color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin-top: 5px;">Artesanal & Premium</p>
                </div>
                <div style="background-color: #161616; padding: 30px; border-radius: 6px; border: 1px solid #2a2a2a; margin-bottom: 30px;">
                    <h2 style="color: #fff; font-size: 18px; margin-top: 0; border-bottom: 1px solid #2a2a2a; padding-bottom: 10px;">¡Hola! Tu pedido ha cambiado de estado</h2>
                    <p style="font-size: 14px; color: #ccc; line-height: 1.6;">Queremos informarte que tu pedido <strong>#${orderId.substring(0, 8)}</strong> ha sido actualizado a:</p>
                    <div style="background-color: #C5A880; color: #0b0b0b; padding: 12px; font-weight: bold; text-align: center; border-radius: 4px; font-size: 16px; margin: 20px 0; text-transform: uppercase; letter-spacing: 2px;">
                        ${status}
                    </div>
                    <p style="font-size: 14px; color: #ccc;">Monto Total: <strong>$${total.toLocaleString()}</strong></p>
                </div>
                <div style="text-align: center; color: #666; font-size: 12px; border-t: 1px solid #2a2a2a; padding-top: 20px;">
                    <p style="margin: 5px 0;">Este es un correo automático de Pan de Rey.</p>
                    <p style="margin: 5px 0;">Contáctanos en <a href="mailto:${fromEmail}" style="color: #C5A880; text-decoration: none;">${fromEmail}</a></p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"Pan de Rey" <${fromEmail}>`,
            to: clientEmail,
            subject,
            html
        });
        console.log(`[Notification] Email sent successfully to ${clientEmail} for order ${orderId} (Status: ${status})`);
    } catch (err) {
        console.error('Failed to send status email:', err);
    }
};

export const sendStatusWhatsApp = async (clientPhone: string, orderId: string, status: string) => {
    try {
        // En producción se conectaría con la API de Twilio, 360dialog, etc.
        // Aquí simulamos el envío por consola detallando los parámetros
        console.log(`[Notification MOCK WHATSAPP] Sending message to ${clientPhone}:
        "Pan de Rey: ¡Hola! Tu pedido #${orderId.substring(0, 8)} ha cambiado al estado: *${status.toUpperCase()}*. Gracias por tu compra!"`);
    } catch (err) {
        console.error('Failed to send WhatsApp notification:', err);
    }
};
