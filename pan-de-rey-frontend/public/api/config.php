<?php
/**
 * Pan de Rey - API Configuration & Database Connection
 */

// Evitar acceso directo
define('SECURE_ACCESS', true);

// =========================================================
// CONFIGURACIÓN DE BASE DE DATOS
// =========================================================
// Reemplaza estos valores por los datos reales de tu base de datos en cPanel/Webuzo.
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_USER', 'bimndboe'); 
define('DB_PASS', 'INGRESA_AQUI_LA_CONTRASEÑA_DE_TU_NUEVA_BD'); 
define('DB_NAME', 'INGRESA_AQUI_EL_NOMBRE_DE_TU_NUEVA_BD'); 

// =========================================================
// CONFIGURACIÓN DE CORREO ELECTRONICO
// =========================================================
define('FROM_EMAIL', 'panderey.cl@gmail.com');
define('FROM_NAME', 'Pan de Rey');

// =========================================================
// ORQUESTADOR DE NOTIFICACIONES (n8n / webhook)
// =========================================================
// Reemplaza esta URL por la del webhook real de tu orquestador n8n
define('N8N_WEBHOOK_URL', 'https://tu-n8n.com/webhook/cambio-de-estado');


// =========================================================
// FUNCIÓN DE CONEXIÓN A LA BASE DE DATOS (PDO)
// =========================================================
function getDatabaseConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Error de conexión con la base de datos',
            'details' => $e->getMessage() // Desplegar error para facilitar el debugging
        ]);
        exit;
    }
}
