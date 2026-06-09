<?php
/**
 * Pan de Rey - PHP API Bridge
 * Reemplaza el backend de Node.js en entornos de hosting sin soporte de Node.js.
 */

// Cabeceras HTTP obligatorias para APIs JSON y CORS
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Manejo de peticiones de preflight OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Cargar la configuración y la conexión de la base de datos
require_once __DIR__ . '/config.php';

// Helper para generar UUIDs (equivalente a crypto.randomUUID() en Node.js)
function generateUuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Helper para despachar un webhook al orquestador n8n
function triggerN8nWebhook($orderId, $db) {
    if (!defined('N8N_WEBHOOK_URL') || empty(N8N_WEBHOOK_URL) || strpos(N8N_WEBHOOK_URL, 'tu-n8n.com') !== false) {
        return false;
    }
    
    try {
        // Consultar detalles del pedido
        $stmt = $db->prepare("
            SELECT o.Id, o.TotalAmount, o.Status, o.ShippingMethod, o.PickupTime, o.ShippingCost, o.Notes,
                   o.SlaStartedAt, o.SlaPausedAt, o.SlaPausedTime, o.DeliveryPin, o.CreatedAt, o.UpdatedAt,
                   u.FirstName, u.LastName, u.Phone, u.Email
            FROM Orders o
            LEFT JOIN Users u ON o.UserId = u.Id
            WHERE o.Id = :id
        ");
        $stmt->execute([':id' => $orderId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            return false;
        }
        
        // Consultar productos de la orden
        $itemStmt = $db->prepare("
            SELECT oi.Quantity, oi.UnitPrice, oi.Subtotal, p.Name as ProductName, pv.VariantName
            FROM OrderItems oi
            JOIN ProductVariants pv ON oi.VariantId = pv.Id
            JOIN Products p ON pv.ProductId = p.Id
            WHERE oi.OrderId = :id
        ");
        $itemStmt->execute([':id' => $orderId]);
        $items = $itemStmt->fetchAll();
        
        $formattedItems = [];
        foreach ($items as $it) {
            $formattedItems[] = "{$it['Quantity']}x {$it['ProductName']} ({$it['VariantName']})";
        }
        
        $payload = [
            'event' => 'order_status_updated',
            'order' => [
                'id' => $order['Id'],
                'customer' => [
                    'name' => !empty($order['FirstName']) ? trim($order['FirstName'] . ' ' . ($order['LastName'] ?? '')) : 'Invitado',
                    'email' => $order['Email'] ?? 'No Registrado',
                    'phone' => $order['Phone'] ?? 'No Registrado'
                ],
                'shippingMethod' => $order['ShippingMethod'],
                'pickupTime' => $order['PickupTime'],
                'total' => (float)$order['TotalAmount'],
                'status' => $order['Status'],
                'slaStartedAt' => $order['SlaStartedAt'],
                'slaPausedAt' => $order['SlaPausedAt'],
                'slaPausedTime' => (int)$order['SlaPausedTime'],
                'deliveryPin' => $order['DeliveryPin'],
                'items' => $formattedItems,
                'createdAt' => $order['CreatedAt'],
                'updatedAt' => $order['UpdatedAt']
            ]
        ];
        
        $ch = curl_init(N8N_WEBHOOK_URL);
        $jsonPayload = json_encode($payload);
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2); // Timeout corto de 2 segundos para no colgar la API
        
        $result = curl_exec($ch);
        curl_close($ch);
        return $result;
    } catch (Exception $e) {
        error_log("Webhook trigger failed: " . $e->getMessage());
        return false;
    }
}

// Helper para enviar correos electrónicos de cambio de estado
function sendStatusEmailPHP($clientEmail, $orderId, $status, $total) {
    try {
        $fromEmail = FROM_EMAIL;
        $fromName = FROM_NAME;
        $subject = "Pan de Rey - Pedido " . substr($orderId, 0, 8) . " actualizado: " . $status;
        
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: =?utf-8?B?" . base64_encode($fromName) . "?= <" . $fromEmail . ">\r\n";
        $headers .= "Reply-To: " . $fromEmail . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        $formattedTotal = number_format($total, 0, ',', '.');
        $shortId = substr($orderId, 0, 8);
        $statusUpper = htmlspecialchars(strtoupper($status));

        $html = "
        <div style=\"font-family: 'Montserrat', sans-serif; background-color: #0b0b0b; color: #f3f3f3; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #C5A880;\">
            <div style=\"text-align: center; margin-bottom: 30px;\">
                <h1 style=\"color: #C5A880; font-family: 'Playfair Display', serif; margin: 0; font-size: 28px; letter-spacing: 2px;\">PAN DE REY</h1>
                <p style=\"color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin-top: 5px;\">Artesanal & Premium</p>
            </div>
            <div style=\"background-color: #161616; padding: 30px; border-radius: 6px; border: 1px solid #2a2a2a; margin-bottom: 30px;\">
                <h2 style=\"color: #fff; font-size: 18px; margin-top: 0; border-bottom: 1px solid #2a2a2a; padding-bottom: 10px;\">¡Hola! Tu pedido ha cambiado de estado</h2>
                <p style=\"font-size: 14px; color: #ccc; line-height: 1.6;\">Queremos informarte que tu pedido <strong>#{$shortId}</strong> ha sido actualizado a:</p>
                <div style=\"background-color: #C5A880; color: #0b0b0b; padding: 12px; font-weight: bold; text-align: center; border-radius: 4px; font-size: 16px; margin: 20px 0; text-transform: uppercase; letter-spacing: 2px;\">
                    {$statusUpper}
                </div>
                <p style=\"font-size: 14px; color: #ccc;\">Monto Total: <strong>\${$formattedTotal}</strong></p>
            </div>
            <div style=\"text-align: center; color: #666; font-size: 12px; border-top: 1px solid #2a2a2a; padding-top: 20px;\">
                <p style=\"margin: 5px 0;\">Este es un correo automático de Pan de Rey.</p>
                <p style=\"margin: 5px 0;\">Contáctanos en <a href=\"mailto:{$fromEmail}\" style=\"color: #C5A880; text-decoration: none;\">{$fromEmail}</a></p>
            </div>
        </div>
        ";

        // Envía el correo usando la función de servidor local (puede requerir configuración SMTP en PHP.ini de cPanel)
        @mail($clientEmail, $subject, $html, $headers);
        return true;
    } catch (Exception $e) {
        error_log("Failed to send status email: " . $e->getMessage());
        return false;
    }
}

// Obtener la ruta solicitada desde el parámetro 'route' inyectado por .htaccess
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';

try {
    $db = getDatabaseConnection();
    
    // --- ROUTING ---
    
    // 1. GET /api/orders - Listar todos los pedidos para el admin kanban y sustitución
    if ($route === 'orders' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        // A. Consultar órdenes y detalles de usuarios (incluye nuevos campos SLA, PIN y de seguimiento con fallback seguro)
        $orderRows = [];
        try {
            $orderQuery = "
                SELECT o.Id, o.UserId, o.AddressId, o.CouponId, o.TotalAmount, o.Status, 
                       o.ShippingMethod, o.PickupTime, o.ShippingCost, o.Notes, o.CreatedAt,
                       o.SlaStartedAt, o.SlaPausedAt, o.SlaPausedTime, o.DeliveryPin,
                       o.CompletenessPercent, o.OrderState, o.LabelPrintedCount, o.ActualDeliveryTime,
                       u.FirstName, u.LastName, u.Phone, u.Email
                FROM Orders o
                LEFT JOIN Users u ON o.UserId = u.Id
                ORDER BY o.CreatedAt DESC
            ";
            $ordersStmt = $db->query($orderQuery);
            $orderRows = $ordersStmt->fetchAll();
        } catch (PDOException $e) {
            // Fallback si no se han creado las columnas de seguimiento
            $orderQuery = "
                SELECT o.Id, o.UserId, o.AddressId, o.CouponId, o.TotalAmount, o.Status, 
                       o.ShippingMethod, o.PickupTime, o.ShippingCost, o.Notes, o.CreatedAt,
                       o.SlaStartedAt, o.SlaPausedAt, o.SlaPausedTime, o.DeliveryPin,
                       u.FirstName, u.LastName, u.Phone, u.Email
                FROM Orders o
                LEFT JOIN Users u ON o.UserId = u.Id
                ORDER BY o.CreatedAt DESC
            ";
            $ordersStmt = $db->query($orderQuery);
            $orderRows = $ordersStmt->fetchAll();
        }
        
        // B. Consultar ítems de orden con nombres de productos y variantes
        $itemsQuery = "
            SELECT oi.OrderId, oi.Quantity, oi.UnitPrice, oi.Subtotal, oi.VariantId, p.Name as ProductName, pv.VariantName
            FROM OrderItems oi
            JOIN ProductVariants pv ON oi.VariantId = pv.Id
            JOIN Products p ON pv.ProductId = p.Id
        ";
        $itemsStmt = $db->query($itemsQuery);
        $itemRows = $itemsStmt->fetchAll();
        
        // C. Agrupar ítems por OrderId
        $itemsByOrder = [];
        $itemsRawByOrder = [];
        foreach ($itemRows as $item) {
            $orderId = $item['OrderId'];
            if (!isset($itemsByOrder[$orderId])) {
                $itemsByOrder[$orderId] = [];
                $itemsRawByOrder[$orderId] = [];
            }
            $itemsByOrder[$orderId][] = $item;
            
            // Para el panel de excepciones/sustitución, necesitamos un objeto más detallado del ítem
            $itemsRawByOrder[$orderId][] = [
                'variantId' => $item['VariantId'],
                'productName' => $item['ProductName'],
                'variantName' => $item['VariantName'],
                'quantity' => (int)$item['Quantity'],
                'price' => (float)$item['UnitPrice'],
                'subtotal' => (float)$item['Subtotal']
            ];
        }
        
        // D. Formatear órdenes para el Kanban de React
        $orders = [];
        foreach ($orderRows as $order) {
            $orderId = $order['Id'];
            $items = isset($itemsByOrder[$orderId]) ? $itemsByOrder[$orderId] : [];
            
            $formattedItems = [];
            foreach ($items as $it) {
                $formattedItems[] = "{$it['Quantity']}x {$it['ProductName']} ({$it['VariantName']})";
            }
            
            // Formato de hora similar a toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            $timeFormatted = date("H:i", strtotime($order['CreatedAt']));
            
            $orders[] = [
                'id' => $order['Id'],
                'customerName' => !empty($order['FirstName']) ? trim($order['FirstName'] . ' ' . ($order['LastName'] ?? '')) : 'Invitado',
                'email' => $order['Email'] ?? 'No Registrado',
                'phone' => $order['Phone'] ?? 'No Registrado',
                'items' => $formattedItems,
                'itemsRaw' => isset($itemsRawByOrder[$orderId]) ? $itemsRawByOrder[$orderId] : [],
                'total' => (float)$order['TotalAmount'],
                'status' => $order['Status'],
                'time' => $timeFormatted,
                'createdAt' => $order['CreatedAt'],
                'shippingMethod' => $order['ShippingMethod'],
                'slaStartedAt' => $order['SlaStartedAt'],
                'slaPausedAt' => $order['SlaPausedAt'],
                'slaPausedTime' => (int)$order['SlaPausedTime'],
                'deliveryPin' => $order['DeliveryPin'],
                // Nuevos campos
                'pickupTime' => $order['PickupTime'] ?? '',
                'completenessPercent' => isset($order['CompletenessPercent']) ? (int)$order['CompletenessPercent'] : ($order['Status'] === 'Incompleto' ? 66 : 100),
                'orderState' => isset($order['OrderState']) ? $order['OrderState'] : ($order['Status'] === 'Nuevo' ? 'Pendiente' : 'Aceptado'),
                'labelPrintedCount' => isset($order['LabelPrintedCount']) ? (int)$order['LabelPrintedCount'] : 0,
                'actualDeliveryTime' => $order['ActualDeliveryTime'] ?? null
            ];
        }
        
        echo json_encode($orders);
        exit;
    }
    
    // 1.5. POST /api/orders/increment-label - Incrementar el contador de etiquetas impresas
    elseif ($route === 'orders/increment-label' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, true);
        $orderId = isset($input['orderId']) ? trim($input['orderId']) : '';
        
        if (empty($orderId)) {
            http_response_code(400);
            echo json_encode(['error' => 'Order ID is required']);
            exit;
        }
        
        try {
            // Verificar si la columna existe antes de actualizar
            try {
                $db->query("SELECT LabelPrintedCount FROM Orders LIMIT 1");
            } catch (PDOException $ex) {
                // Agregar la columna si no existe
                $db->exec("ALTER TABLE Orders ADD COLUMN LabelPrintedCount INT NOT NULL DEFAULT 0");
            }

            $stmt = $db->prepare("UPDATE Orders SET LabelPrintedCount = LabelPrintedCount + 1 WHERE Id = :id");
            $stmt->execute([':id' => $orderId]);
            
            $selectStmt = $db->prepare("SELECT LabelPrintedCount FROM Orders WHERE Id = :id");
            $selectStmt->execute([':id' => $orderId]);
            $res = $selectStmt->fetch();
            
            echo json_encode([
                'success' => true, 
                'labelPrintedCount' => isset($res['LabelPrintedCount']) ? (int)$res['LabelPrintedCount'] : 1
            ]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al incrementar etiquetas', 'details' => $e->getMessage()]);
            exit;
        }
    }
    
    // 2. POST /api/orders/update-status - Cambiar estado de un pedido (con control de SLA, PIN y webhook n8n)
    elseif ($route === 'orders/update-status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Leer el cuerpo de la petición JSON
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, true);
        
        $orderId = isset($input['orderId']) ? trim($input['orderId']) : '';
        $newStatus = isset($input['newStatus']) ? trim($input['newStatus']) : '';
        $pin = isset($input['pin']) ? trim($input['pin']) : '';
        
        if (empty($orderId) || empty($newStatus)) {
            http_response_code(400);
            echo json_encode(['error' => 'Order ID and New Status are required']);
            exit;
        }
        
        // A. Obtener datos actuales del pedido
        $selectStmt = $db->prepare("
            SELECT o.TotalAmount, o.ShippingMethod, o.Status, o.SlaStartedAt, o.SlaPausedAt, o.SlaPausedTime, o.DeliveryPin, u.Email, u.Phone 
            FROM Orders o 
            LEFT JOIN Users u ON o.UserId = u.Id 
            WHERE o.Id = :id
        ");
        $selectStmt->execute([':id' => $orderId]);
        $orderInfo = $selectStmt->fetch();
        
        if (!$orderInfo) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            exit;
        }
        
        $currentStatus = $orderInfo['Status'];
        $shippingMethod = $orderInfo['ShippingMethod'];
        $dbPin = $orderInfo['DeliveryPin'];
        
        // B. Lógica de seguridad para Delivery en cambio a "Entregado"
        if ($newStatus === 'Entregado' && $shippingMethod === 'Delivery') {
            if (empty($dbPin)) {
                // Si por alguna razón no se generó PIN, creamos uno de escape para no trabar el flujo.
                $dbPin = '9999';
                $updatePinStmt = $db->prepare("UPDATE Orders SET DeliveryPin = '9999' WHERE Id = :id");
                $updatePinStmt->execute([':id' => $orderId]);
            }
            if ($pin !== $dbPin) {
                http_response_code(400);
                echo json_encode(['error' => 'Código PIN de entrega incorrecto. Verificación fallida.']);
                exit;
            }
        }
        
        // C. Construir query dinámico para actualizar campos de estado, SLA y PIN
        $updateFields = ['Status = :status'];
        $queryParams = [':status' => $newStatus, ':id' => $orderId];
        
        // C.1. Iniciar SLA
        if ($newStatus === 'Aceptado') {
            $updateFields[] = 'SlaStartedAt = COALESCE(SlaStartedAt, NOW())';
        }
        
        // C.2. Pausar SLA (Entrada a Incompleto)
        if ($newStatus === 'Incompleto') {
            $updateFields[] = 'SlaPausedAt = COALESCE(SlaPausedAt, NOW())';
        }
        
        // C.3. Reanudar SLA (Salida de Incompleto)
        if ($currentStatus === 'Incompleto' && $newStatus !== 'Incompleto') {
            $updateFields[] = 'SlaPausedTime = SlaPausedTime + COALESCE(TIMESTAMPDIFF(SECOND, SlaPausedAt, NOW()), 0)';
            $updateFields[] = 'SlaPausedAt = NULL';
        }
        
        // C.4. Generar PIN de Delivery al pasar a "En Camino"
        if ($newStatus === 'En Camino' && $shippingMethod === 'Delivery') {
            // Genera PIN aleatorio de 4 dígitos entre 1000 y 9999
            $generatedPin = sprintf("%04d", mt_rand(1000, 9999));
            $updateFields[] = 'DeliveryPin = COALESCE(DeliveryPin, :generated_pin)';
            $queryParams[':generated_pin'] = $generatedPin;
        }
        
        $sql = "UPDATE Orders SET " . implode(', ', $updateFields) . " WHERE Id = :id";
        $updateStmt = $db->prepare($sql);
        $updateStmt->execute($queryParams);
        
        // D. Envío del correo en segundo plano
        $totalAmount = (float)$orderInfo['TotalAmount'];
        $email = !empty($orderInfo['Email']) ? $orderInfo['Email'] : 'panderey.cl@gmail.com';
        sendStatusEmailPHP($email, $orderId, $newStatus, $totalAmount);
        
        // E. Disparar el webhook de n8n
        triggerN8nWebhook($orderId, $db);
        
        echo json_encode(['status' => 'success', 'message' => "Order status updated to {$newStatus}"]);
        exit;
    }
    
    // 3. POST /api/orders/substitute - Endpoint para sustitución de producto faltante por stock
    elseif ($route === 'orders/substitute' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, true);
        
        $orderId = isset($input['orderId']) ? trim($input['orderId']) : '';
        $variantIdToRemove = isset($input['variantIdToRemove']) ? trim($input['variantIdToRemove']) : '';
        $variantIdToAdd = isset($input['variantIdToAdd']) ? trim($input['variantIdToAdd']) : '';
        
        if (empty($orderId) || empty($variantIdToRemove) || empty($variantIdToAdd)) {
            http_response_code(400);
            echo json_encode(['error' => 'OrderId, variantIdToRemove, and variantIdToAdd are required']);
            exit;
        }
        
        // A. Comenzar transacción
        $db->beginTransaction();
        
        try {
            // A.1. Obtener pedido actual y validar que esté "Incompleto"
            $ordStmt = $db->prepare("SELECT Status, ShippingMethod FROM Orders WHERE Id = :id FOR UPDATE");
            $ordStmt->execute([':id' => $orderId]);
            $order = $ordStmt->fetch();
            
            if (!$order) {
                http_response_code(404);
                echo json_encode(['error' => 'Order not found']);
                $db->rollBack();
                exit;
            }
            
            if ($order['Status'] !== 'Incompleto') {
                http_response_code(400);
                echo json_encode(['error' => 'Order is not in Incomplete status']);
                $db->rollBack();
                exit;
            }
            
            // A.2. Obtener el item a remover del pedido
            $itemStmt = $db->prepare("SELECT Id, Quantity FROM OrderItems WHERE OrderId = :orderId AND VariantId = :varId");
            $itemStmt->execute([':orderId' => $orderId, ':varId' => $variantIdToRemove]);
            $itemToRemove = $itemStmt->fetch();
            
            if (!$itemToRemove) {
                http_response_code(400);
                echo json_encode(['error' => 'Product to remove not found in this order']);
                $db->rollBack();
                exit;
            }
            
            $quantity = (int)$itemToRemove['Quantity'];
            $orderItemId = $itemToRemove['Id'];
            
            // A.3. Validar variante a añadir
            $varStmt = $db->prepare("
                SELECT pv.Id, pv.PriceAdjustment, p.BasePrice 
                FROM ProductVariants pv 
                JOIN Products p ON pv.ProductId = p.Id 
                WHERE pv.Id = :varId AND pv.IsActive = 1
            ");
            $varStmt->execute([':varId' => $variantIdToAdd]);
            $variantToAdd = $varStmt->fetch();
            
            if (!$variantToAdd) {
                http_response_code(404);
                echo json_encode(['error' => 'Replacement product variant not found or inactive']);
                $db->rollBack();
                exit;
            }
            
            // A.4. Actualizar el ítem de la orden en OrderItems
            // (La regla de negocio dicta que el cliente elige un reemplazo del mismo valor, 
            // por lo que mantenemos la cantidad, y los precios unitario y subtotal originales de la compra)
            $updateItemStmt = $db->prepare("UPDATE OrderItems SET VariantId = :newVarId WHERE Id = :itemId");
            $updateItemStmt->execute([':newVarId' => $variantIdToAdd, ':itemId' => $orderItemId]);
            
            // A.5. Reajustar inventario
            // Devolver stock de la variante que ya no se despacha
            $invAddStmt = $db->prepare("UPDATE Inventory SET Quantity = Quantity + :qty WHERE VariantId = :varId");
            $invAddStmt->execute([':qty' => $quantity, ':varId' => $variantIdToRemove]);
            
            // Descontar stock de la nueva variante de reemplazo
            $invSubStmt = $db->prepare("UPDATE Inventory SET Quantity = Quantity - :qty WHERE VariantId = :varId");
            $invSubStmt->execute([':qty' => $quantity, ':varId' => $variantIdToAdd]);
            
            // Loguear movimientos de inventario
            $logMoveStmt = $db->prepare("
                INSERT INTO InventoryMovements (Id, VariantId, QuantityChange, MovementType, ReferenceId) 
                VALUES (:id, :varId, :qty, :type, :refId)
            ");
            // Movimiento de devolución
            $logMoveStmt->execute([
                ':id' => generateUuid(),
                ':varId' => $variantIdToRemove,
                ':qty' => $quantity,
                ':type' => 'Sustitucion Devuelto',
                ':refId' => $orderId
            ]);
            // Movimiento de salida
            $logMoveStmt->execute([
                ':id' => generateUuid(),
                ':varId' => $variantIdToAdd,
                ':qty' => -$quantity,
                ':type' => 'Sustitucion Despacho',
                ':refId' => $orderId
            ]);
            
            // A.6. Avanzar el estado automáticamente y reanudar el SLA
            // ShippingMethod: 'Delivery' -> Listo para Despacho, 'Retiro' -> Listo para Retiro (o 'Listo')
            $nextStatus = ($order['ShippingMethod'] === 'Delivery') ? 'Listo para Despacho' : 'Listo para Retiro';
            
            $updateOrderStmt = $db->prepare("
                UPDATE Orders 
                SET Status = :status,
                    SlaPausedTime = SlaPausedTime + COALESCE(TIMESTAMPDIFF(SECOND, SlaPausedAt, NOW()), 0),
                    SlaPausedAt = NULL
                WHERE Id = :id
            ");
            $updateOrderStmt->execute([':status' => $nextStatus, ':id' => $orderId]);
            
            // B. Confirmar transacción
            $db->commit();
            
            // C. Disparar el webhook de n8n
            triggerN8nWebhook($orderId, $db);
            
            echo json_encode([
                'status' => 'success',
                'message' => "Sustitución procesada con éxito. Pedido actualizado a {$nextStatus} y reanudado.",
                'nextStatus' => $nextStatus
            ]);
            exit;
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
    
    // 4. GET /api/orders/analytics - Obtener KPIs y datos de venta para el CRM Dashboard
    elseif ($route === 'orders/analytics' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        // A. Total ventas, total pedidos y total unidades vendidas
        $kpiQuery = "
            SELECT 
                SUM(TotalAmount) as totalSales, 
                COUNT(Id) as totalOrders,
                (SELECT SUM(Quantity) FROM OrderItems) as totalUnits
            FROM Orders
            WHERE Status != 'Cancelado'
        ";
        $kpiStmt = $db->query($kpiQuery);
        $kpiRow = $kpiStmt->fetch();
        
        // B. Alertas de inventario
        $invQuery = "
            SELECT 
                COALESCE(SUM(CASE WHEN Quantity = 0 THEN 1 ELSE 0 END), 0) as sinStock,
                COALESCE(SUM(CASE WHEN Quantity >= 1 AND Quantity <= 3 THEN 1 ELSE 0 END), 0) as critico,
                COALESCE(SUM(CASE WHEN Quantity >= 4 AND Quantity <= 5 THEN 1 ELSE 0 END), 0) as riesgo,
                COALESCE(SUM(CASE WHEN Quantity >= 6 AND Quantity <= 9 THEN 1 ELSE 0 END), 0) as alerta
            FROM Inventory
        ";
        $invStmt = $db->query($invQuery);
        $invRow = $invStmt->fetch();
        
        // C. Pedidos pendientes agrupados por método de entrega
        $pendingQuery = "
            SELECT 
                COALESCE(SUM(CASE WHEN ShippingMethod = 'Retiro' AND Status IN ('Nuevo', 'Preparando', 'Listo', 'Listo para Retiro') THEN 1 ELSE 0 END), 0) as pendientesRetiro,
                COALESCE(SUM(CASE WHEN ShippingMethod = 'Delivery' AND Status IN ('Nuevo', 'Preparando', 'Listo para Despacho', 'En Ruta', 'En Camino') THEN 1 ELSE 0 END), 0) as pendientesEnvio
            FROM Orders
        ";
        $pendingStmt = $db->query($pendingQuery);
        $pendingRow = $pendingStmt->fetch();
        
        // D. Ventas agrupadas por Categorías
        $catQuery = "
            SELECT c.Name as name, SUM(oi.Subtotal) as value, SUM(oi.Quantity) as units
            FROM OrderItems oi
            JOIN ProductVariants pv ON oi.VariantId = pv.Id
            JOIN Products p ON pv.ProductId = p.Id
            JOIN Categories c ON p.CategoryId = c.Id
            GROUP BY c.Name
        ";
        $catStmt = $db->query($catQuery);
        $categoryDistribution = $catStmt->fetchAll();
        
        // E. Top 5 productos más vendidos
        $prodQuery = "
            SELECT p.Name as name, SUM(oi.Subtotal) as totalAmount, SUM(oi.Quantity) as totalUnits
            FROM OrderItems oi
            JOIN ProductVariants pv ON oi.VariantId = pv.Id
            JOIN Products p ON pv.ProductId = p.Id
            GROUP BY p.Name
            ORDER BY totalAmount DESC
            LIMIT 5
        ";
        $prodStmt = $db->query($prodQuery);
        $productSalesRows = $prodStmt->fetchAll();
        
        $productSales = [];
        foreach ($productSalesRows as $p) {
            $productSales[] = [
                'name' => $p['name'],
                'totalAmount' => (float)$p['totalAmount'],
                'totalUnits' => (int)$p['totalUnits']
            ];
        }
        
        // F. Últimos 5 registros de usuarios
        $crmQuery = "
            SELECT FirstName, LastName, Email, CreatedAt 
            FROM Users 
            ORDER BY CreatedAt DESC 
            LIMIT 5
        ";
        $crmStmt = $db->query($crmQuery);
        $recentSignups = $crmStmt->fetchAll();
        
        // Responder con la misma estructura JSON que espera el frontend
        echo json_encode([
            'kpis' => [
                'ventas' => (float)($kpiRow['totalSales'] ?? 0),
                'pedidos' => (int)($kpiRow['totalOrders'] ?? 0),
                'unidades' => (int)($kpiRow['totalUnits'] ?? 0),
                'alerta' => (int)($invRow['alerta'] ?? 0),
                'riesgo' => (int)($invRow['riesgo'] ?? 0),
                'critico' => (int)($invRow['critico'] ?? 0),
                'sinStock' => (int)($invRow['sinStock'] ?? 0),
'pendientesRetiro' => (int)($pendingRow['pendientesRetiro'] ?? 0),
                'pendientesEnvio' => (int)($pendingRow['pendientesEnvio'] ?? 0)
            ],
            'categoryDistribution' => $categoryDistribution,
            'productSales' => $productSales,
            'recentSignups' => $recentSignups
        ]);
        exit;
    }
    
    // 5. GET /api/orders/seed - Inicializar y poblar base de datos con pedidos de prueba
    elseif ($route === 'orders/seed' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        // Asegurar de forma dinámica que las columnas de seguimiento existan en la tabla Orders
        try {
            $db->query("SELECT CompletenessPercent, OrderState, LabelPrintedCount, ActualDeliveryTime FROM Orders LIMIT 1");
        } catch (PDOException $e) {
            try {
                $db->exec("ALTER TABLE Orders ADD COLUMN CompletenessPercent INT NOT NULL DEFAULT 100");
                $db->exec("ALTER TABLE Orders ADD COLUMN OrderState VARCHAR(50) NOT NULL DEFAULT 'Pendiente'");
                $db->exec("ALTER TABLE Orders ADD COLUMN LabelPrintedCount INT NOT NULL DEFAULT 0");
                $db->exec("ALTER TABLE Orders ADD COLUMN ActualDeliveryTime TIMESTAMP NULL DEFAULT NULL");
            } catch (PDOException $ex) {
                // Ignorar si ya se agregaron en otra petición paralela
            }
        }

        // Comenzamos una transacción atómica
        $db->beginTransaction();
        
        try {
            // Deshabilitar FKs para poder hacer TRUNCATE
            $db->exec('SET FOREIGN_KEY_CHECKS = 0');
            
            $db->exec('TRUNCATE TABLE Payments');
            $db->exec('TRUNCATE TABLE OrderItems');
            $db->exec('TRUNCATE TABLE Orders');
            $db->exec('TRUNCATE TABLE InventoryMovements');
            $db->exec('TRUNCATE TABLE Inventory');
            $db->exec('TRUNCATE TABLE ProductVariants');
            $db->exec('TRUNCATE TABLE Products');
            $db->exec('TRUNCATE TABLE Categories');
            $db->exec('TRUNCATE TABLE UserRoles');
            $db->exec('TRUNCATE TABLE Users');
            
            // A. Poblar Categorías
            $categories = [
                [1, 'Panadería', 'panaderia'],
                [2, 'Pastelería', 'pasteleria'],
                [3, 'Sin Gluten', 'sin-gluten'],
                [4, 'Bebestibles', 'bebestibles'],
                [5, 'Ofertas', 'offers']
            ];
            $catInsert = $db->prepare('INSERT INTO Categories (Id, Name, Slug, IsActive) VALUES (?, ?, ?, 1)');
            foreach ($categories as $cat) {
                $catInsert->execute($cat);
            }
            
            // B. Poblar Productos
            $products = [
                ['prod-1', 1, 'Pan de Masa Madre Clásico', 'pan-de-masa-madre-clasico', 4500, 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80'],
                ['prod-2', 1, 'Focaccia al Romero', 'focaccia-al-romero', 3800, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'],
                ['prod-3', 1, 'Baguette Tradicional', 'baguette-tradicional', 1800, 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80'],
                ['prod-4', 1, 'Pan de Centeno Alemán', 'pan-de-centeno-aleman', 4200, 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&crop=edges'],
                ['prod-5', 1, 'Ciabatta Rústica', 'ciabatta-rustica', 2200, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&crop=faces'],
                ['prod-6', 2, 'Croissant de Mantequilla', 'croissant-de-mantequilla', 2200, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80'],
                ['prod-7', 2, 'Pain au Chocolat', 'pain-au-chocolat', 2500, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&sat=1'],
                ['prod-8', 2, 'Tarta de Limón y Merengue', 'tarta-de-limon-y-merengue', 3800, 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80'],
                ['prod-9', 2, 'Roll de Canela Glaseado', 'roll-de-canela-glaseado', 2800, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80&sat=2'],
                ['prod-10', 3, 'Brownie Sin Gluten', 'brownie-sin-gluten', 2500, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80'],
                ['prod-11', 3, 'Pan de Molde Keto', 'pan-de-molde-keto', 5500, 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&bri=1'],
                ['prod-12', 3, 'Galletas de Almendra', 'galletas-de-almendra', 1800, 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=1'],
                ['prod-13', 4, 'Café Latte XL', 'cafe-latte-xl', 3500, 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80'],
                ['prod-14', 4, 'Espresso Doble', 'espresso-doble', 2200, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80'],
                ['prod-15', 4, 'Cappuccino Italiano', 'cappuccino-italiano', 3200, 'https://images.unsplash.com/photo-1495474472207-464a8d960c8b?w=800&q=80']
            ];
            
            $prodInsert = $db->prepare('INSERT INTO Products (Id, CategoryId, Name, Slug, BasePrice, ImageUrl, IsActive) VALUES (?, ?, ?, ?, ?, ?, 1)');
            $varInsert = $db->prepare('INSERT INTO ProductVariants (Id, ProductId, VariantName, PriceAdjustment, SKU, IsActive) VALUES (?, ?, "Clásico", 0.00, ?, 1)');
            $invInsert = $db->prepare('INSERT INTO Inventory (VariantId, Quantity, SafetyBuffer) VALUES (?, ?, 2)');
            
            foreach ($products as $p) {
                $prodInsert->execute($p);
                
                // Variantes
                $variantId = "var-" . $p[0];
                $sku = "SKU-" . strtoupper($p[3]);
                $varInsert->execute([$variantId, $p[0], $sku]);
                
                // Inventario (Stock variado para KPIs)
                $qty = 10;
                if ($p[0] === 'prod-7') $qty = 0; // Pain au Chocolat - Sin stock
                if ($p[0] === 'prod-5') $qty = 2; // Ciabatta - Crítico
                if ($p[0] === 'prod-9') $qty = 3; // Cinnamon - Crítico
                if ($p[0] === 'prod-4') $qty = 4; // Rye - Riesgo
                if ($p[0] === 'prod-11') $qty = 5; // Keto - Riesgo
                if ($p[0] === 'prod-2') $qty = 8; // Focaccia - Alerta
                if ($p[0] === 'prod-8') $qty = 6; // Lemon - Alerta
                
                $invInsert->execute([$variantId, $qty]);
            }
            
            // C. Poblar Usuarios (CRM)
            $users = [
                ['user-uuid-1', 'maria.gonzalez@gmail.com', 'María', 'González', '+56987654321'],
                ['user-uuid-2', 'juan.perez@yahoo.com', 'Juan', 'Pérez', '+56911112222'],
                ['user-uuid-3', 'diego.munoz@outlook.com', 'Diego', 'Muñoz', '+56933334444'],
                ['user-uuid-4', 'camila.rojas@gmail.com', 'Camila', 'Rojas', '+56955556666'],
                ['user-uuid-5', 'jose.fonseca@gmail.com', 'José', 'Fonseca', '+56977778888']
            ];
            
            $userInsert = $db->prepare('INSERT INTO Users (Id, Email, FirstName, LastName, Phone) VALUES (?, ?, ?, ?, ?)');
            $roleInsert = $db->prepare('INSERT INTO UserRoles (UserId, RoleId) VALUES (?, 2)'); // Cliente
            
            foreach ($users as $u) {
                $userInsert->execute($u);
                $roleInsert->execute([$u[0]]);
            }
            
            // D. Poblar Pedidos y Pagos
            $orderCount = 28;
            $statuses = ['Nuevo', 'Preparando', 'Listo', 'En Ruta', 'Entregado', 'Cancelado', 'Incompleto'];
            $methods = ['Retiro', 'Delivery'];
            $paymentMethods = ['Webpay', 'Transferencia', 'Efectivo'];
            $variantsPool = [
                ['id' => 'var-prod-1', 'price' => 4500],
                ['id' => 'var-prod-2', 'price' => 3800],
                ['id' => 'var-prod-3', 'price' => 1800],
                ['id' => 'var-prod-6', 'price' => 2200],
                ['id' => 'var-prod-7', 'price' => 2500],
                ['id' => 'var-prod-10', 'price' => 2500],
                ['id' => 'var-prod-13', 'price' => 3500],
                ['id' => 'var-prod-1-semillas', 'price' => 6500]
            ];
            
            $ordInsert = $db->prepare("
                INSERT INTO Orders (Id, UserId, TotalAmount, Status, ShippingMethod, ShippingCost, CreatedAt, SlaStartedAt, SlaPausedAt, SlaPausedTime, DeliveryPin, CompletenessPercent, OrderState, LabelPrintedCount, ActualDeliveryTime) 
                VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $oiInsert = $db->prepare("
                INSERT INTO OrderItems (Id, OrderId, VariantId, Quantity, UnitPrice, Subtotal) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $payInsert = $db->prepare("
                INSERT INTO Payments (Id, OrderId, Amount, PaymentMethod, Status, CreatedAt) 
                VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
            ");
            
            for ($i = 1; $i <= $orderCount; $i++) {
                $orderId = "order-uuid-" . str_pad($i, 4, '0', STR_PAD_LEFT);
                $userIndex = $i % count($users);
                $userId = $users[$userIndex][0];
                $daysAgo = (int)floor(($i / $orderCount) * 30);
                
                // Asignación de estados para garantizar diversidad y coherencia
                if ($i === 1) {
                    $status = 'Nuevo';
                } elseif ($i === 2) {
                    $status = 'Preparando';
                } elseif ($i === 3) {
                    $status = 'Listo';
                } elseif ($i === 4) {
                    $status = 'Incompleto';
                } else {
                    $status = $statuses[$i % count($statuses)];
                }
                
                $method = $methods[$i % count($methods)];
                $paymentMethod = $paymentMethods[$i % count($paymentMethods)];
                
                $itemQuantity = 1 + ($i % 3);
                $orderSubtotal = 0;
                $itemsToInsert = [];
                
                for ($j = 0; $j < $itemQuantity; $j++) {
                    $variant = $variantsPool[($i + $j) % count($variantsPool)];
                    $qty = 1 + ($j % 2);
                    $sub = $variant['price'] * $qty;
                    $orderSubtotal += $sub;
                    $itemsToInsert[] = [
                        'id' => generateUuid(),
                        'variantId' => $variant['id'],
                        'quantity' => $qty,
                        'price' => $variant['price'],
                        'subtotal' => $sub
                    ];
                }
                
                $shippingCost = ($method === 'Delivery') ? 3500 : 0;
                $totalAmount = $orderSubtotal + $shippingCost;
                
                // Datos para SLA y PIN en el seed
                $slaStarted = null;
                $slaPaused = null;
                $slaPausedTimeAccum = 0;
                $deliveryPin = null;
                
                if ($status !== 'Nuevo' && $status !== 'Cancelado') {
                    $slaStarted = date("Y-m-d H:i:s", strtotime("-30 minutes"));
                    
                    if ($status === 'Incompleto') {
                        $slaPaused = date("Y-m-d H:i:s", strtotime("-10 minutes"));
                        $slaPausedTimeAccum = 120;
                    }
                    
                    if ($method === 'Delivery') {
                        $deliveryPin = sprintf("%04d", mt_rand(1000, 9999));
                    }
                }
                
                // Nuevos campos de seguimiento
                $completenessPercent = ($status === 'Incompleto') ? 66 : 100;
                $orderState = ($status === 'Nuevo') ? 'Pendiente' : 'Aceptado';
                $labelPrintedCount = ($status === 'Nuevo') ? 0 : ($i % 3);
                
                $actualDeliveryTime = null;
                if ($status === 'Entregado') {
                    $minutesToAdd = ($method === 'Retiro') ? 35 : 55;
                    $actualDeliveryTime = date("Y-m-d H:i:s", strtotime("-30 minutes + {$minutesToAdd} minutes"));
                }
                
                // A. Insertar orden
                $ordInsert->execute([
                    $orderId, 
                    $userId, 
                    $totalAmount, 
                    $status, 
                    $method, 
                    $shippingCost, 
                    $daysAgo, 
                    $slaStarted, 
                    $slaPaused, 
                    $slaPausedTimeAccum, 
                    $deliveryPin,
                    $completenessPercent,
                    $orderState,
                    $labelPrintedCount,
                    $actualDeliveryTime
                ]);
                
                // B. Insertar ítems
                foreach ($itemsToInsert as $item) {
                    $oiInsert->execute([$item['id'], $orderId, $item['variantId'], $item['quantity'], $item['price'], $item['subtotal']]);
                }
                
                // C. Insertar pago
                $payStatus = ($status === 'Cancelado') ? 'Rechazado' : 'Aprobado';
                $payId = generateUuid();
                $payInsert->execute([$payId, $orderId, $totalAmount, $paymentMethod, $payStatus, $daysAgo]);
            }
            
            $db->exec('SET FOREIGN_KEY_CHECKS = 1');
            $db->commit();
            
            echo json_encode([
                'status' => 'success', 
                'message' => "Base de datos poblada exitosamente en PHP con " . count($users) . " usuarios, " . count($products) . " productos y {$orderCount} pedidos simulados históricos con soporte para SLA y PIN."
            ]);
            exit;
        } catch (Exception $e) {
            $db->exec('SET FOREIGN_KEY_CHECKS = 1');
            $db->rollBack();
            throw $e;
        }
    }
    
    // Ruta no encontrada
    else {
        http_response_code(404);
        echo json_encode(['error' => "API Route '{$route}' not found or Method not matching"]);
        exit;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'API Execution Failure',
        'details' => $e->getMessage()
    ]);
    exit;
}
