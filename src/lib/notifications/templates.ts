import { formatCLP } from "@/lib/format";

function wrap(title: string, bodyHtml: string): string {
  return `
    <div style="background:#0B0B0B;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#F5F5DC;">
      <div style="max-width:480px;margin:0 auto;background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:24px;">
        <p style="text-transform:uppercase;letter-spacing:0.2em;font-size:11px;color:#A3835B;margin:0 0 8px;">Pan de Rey</p>
        <h1 style="font-size:20px;color:#D4AF37;margin:0 0 16px;">${title}</h1>
        ${bodyHtml}
      </div>
    </div>
  `;
}

export function purchaseConfirmedTemplate(params: {
  orderId: string;
  total: number;
  deliveryConfirmationCode: string;
  deliveryMethod: "pickup" | "shipping";
}) {
  const { orderId, total, deliveryConfirmationCode, deliveryMethod } = params;
  return {
    subject: "Confirmamos tu pedido — Pan de Rey",
    html: wrap(
      "¡Gracias por tu compra!",
      `
        <p style="font-size:14px;color:#F5F5DC;opacity:0.85;">Tu pedido <strong>#${orderId.slice(0, 8)}</strong> fue confirmado por un total de <strong>${formatCLP(total)}</strong>.</p>
        <p style="font-size:14px;color:#F5F5DC;opacity:0.85;">
          ${
            deliveryMethod === "pickup"
              ? "Te avisamos cuando esté listo para retirar."
              : "Te avisamos cuando salga en camino."
          }
        </p>
        <p style="font-size:13px;color:#F5F5DC;opacity:0.7;">Guardá este código — te lo van a pedir al momento de la entrega:</p>
        <p style="font-size:28px;letter-spacing:0.15em;color:#D4AF37;font-weight:bold;text-align:center;margin:16px 0;">${deliveryConfirmationCode}</p>
      `,
    ),
  };
}

export function readyForPickupTemplate(orderId: string) {
  return {
    subject: "Tu pedido está listo para retirar — Pan de Rey",
    html: wrap(
      "Listo para retirar",
      `<p style="font-size:14px;color:#F5F5DC;opacity:0.85;">Tu pedido <strong>#${orderId.slice(0, 8)}</strong> ya está listo. Te esperamos en tienda.</p>`,
    ),
  };
}

export function inRouteTemplate(orderId: string, deliveryConfirmationCode: string) {
  return {
    subject: "Tu pedido va en camino — Pan de Rey",
    html: wrap(
      "¡Va en camino!",
      `
        <p style="font-size:14px;color:#F5F5DC;opacity:0.85;">Tu pedido <strong>#${orderId.slice(0, 8)}</strong> salió en camino.</p>
        <p style="font-size:13px;color:#F5F5DC;opacity:0.7;">Tené a mano este código — te lo va a pedir el repartidor al momento de la entrega:</p>
        <p style="font-size:28px;letter-spacing:0.15em;color:#D4AF37;font-weight:bold;text-align:center;margin:16px 0;">${deliveryConfirmationCode}</p>
      `,
    ),
  };
}

export function deliveredTemplate(orderId: string) {
  return {
    subject: "Pedido entregado — Pan de Rey",
    html: wrap(
      "¡Entregado!",
      `<p style="font-size:14px;color:#F5F5DC;opacity:0.85;">Tu pedido <strong>#${orderId.slice(0, 8)}</strong> fue entregado. ¡Que lo disfrutes!</p>`,
    ),
  };
}

export function deliveryIssueTemplate(orderId: string) {
  return {
    subject: "No pudimos entregar tu pedido — Pan de Rey",
    html: wrap(
      "No pudimos entregarlo",
      `<p style="font-size:14px;color:#F5F5DC;opacity:0.85;">Tuvimos un problema para entregar tu pedido <strong>#${orderId.slice(0, 8)}</strong>. Nuestro repartidor va a esperar unos minutos más en la zona — si no logramos contactarte, tu pedido va a volver a la tienda y te vamos a escribir con los pasos a seguir.</p>`,
    ),
  };
}

export function returnedToStoreTemplate(orderId: string) {
  return {
    subject: "Tu pedido volvió a la tienda — Pan de Rey",
    html: wrap(
      "Volvió a la tienda",
      `
        <p style="font-size:14px;color:#F5F5DC;opacity:0.85;">No pudimos entregar tu pedido <strong>#${orderId.slice(0, 8)}</strong> y volvió a la tienda. Elegí cómo seguir desde tu página de seguimiento:</p>
        <ul style="font-size:14px;color:#F5F5DC;opacity:0.85;">
          <li>Reenviar con un costo adicional de envío, o</li>
          <li>Retirarlo gratis en tienda.</li>
        </ul>
      `,
    ),
  };
}

export function paymentFailedTemplate(orderId: string) {
  return {
    subject: "No pudimos procesar tu pago — Pan de Rey",
    html: wrap(
      "El pago no se pudo completar",
      `<p style="font-size:14px;color:#F5F5DC;opacity:0.85;">No pudimos procesar el pago de tu pedido <strong>#${orderId.slice(0, 8)}</strong>. Podés intentarlo de nuevo desde tu carrito.</p>`,
    ),
  };
}
