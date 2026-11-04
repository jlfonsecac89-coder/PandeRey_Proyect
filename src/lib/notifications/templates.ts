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

const P = 'style="font-size:14px;color:#F5F5DC;opacity:0.85;"';

// `orderLabel` es el N° visible del pedido (PDR-000123, ver formatOrderNumber).
// Los correos de seguimiento reciben el texto ya armado en vez del UUID para
// que el cliente vea el mismo código en todos lados.

// Orden de compra: se envía solo cuando el pago quedó confirmado. La boleta no
// viaja por correo — se emite aparte y se entrega impresa al retirar.
export function purchaseConfirmedTemplate(params: {
  orderLabel: string;
  total: number;
  deliveryConfirmationCode: string;
  deliveryMethod: "pickup" | "shipping";
  storeName?: string | null;
  // Una línea por día de retiro (ej. "mar 22 dic — 2 unidades").
  pickupLines?: string[];
}) {
  const { orderLabel, total, deliveryConfirmationCode, deliveryMethod, storeName, pickupLines } = params;

  const pickupBlock =
    deliveryMethod === "pickup"
      ? `
        <p ${P}>Retiro en tienda${storeName ? `: <strong>${storeName}</strong>` : ""}.</p>
        ${
          pickupLines && pickupLines.length > 0
            ? `<ul style="font-size:14px;color:#F5F5DC;opacity:0.85;margin:8px 0;padding-left:18px;">${pickupLines
                .map((l) => `<li>${l}</li>`)
                .join("")}</ul>`
            : ""
        }
        <p style="font-size:13px;color:#F5F5DC;opacity:0.7;">Cuando retires tu pedido te entregamos la boleta impresa.</p>`
      : `
        <p ${P}>Te avisamos cuando salga en camino.</p>
        <p style="font-size:13px;color:#F5F5DC;opacity:0.7;">Guarda este código — te lo van a pedir al momento de la entrega:</p>
        <p style="font-size:28px;letter-spacing:0.15em;color:#D4AF37;font-weight:bold;text-align:center;margin:16px 0;">${deliveryConfirmationCode}</p>`;

  return {
    subject: `Orden de compra ${orderLabel} — Pan de Rey`,
    html: wrap(
      "Orden de compra",
      `
        <p ${P}>Confirmamos tu pago. Tu pedido <strong>${orderLabel}</strong> quedó registrado por un total de <strong>${formatCLP(total)}</strong>.</p>
        ${pickupBlock}
      `,
    ),
  };
}

export function readyForPickupTemplate(orderLabel: string) {
  return {
    subject: "Tu pedido está listo para retirar — Pan de Rey",
    html: wrap(
      "Listo para retirar",
      `<p ${P}>Tu pedido <strong>${orderLabel}</strong> ya está listo. Te esperamos en tienda.</p>`,
    ),
  };
}

export function inRouteTemplate(orderLabel: string, deliveryConfirmationCode: string) {
  return {
    subject: "Tu pedido va en camino — Pan de Rey",
    html: wrap(
      "¡Va en camino!",
      `
        <p ${P}>Tu pedido <strong>${orderLabel}</strong> salió en camino.</p>
        <p style="font-size:13px;color:#F5F5DC;opacity:0.7;">Ten a mano este código — te lo va a pedir el repartidor al momento de la entrega:</p>
        <p style="font-size:28px;letter-spacing:0.15em;color:#D4AF37;font-weight:bold;text-align:center;margin:16px 0;">${deliveryConfirmationCode}</p>
      `,
    ),
  };
}

export function deliveredTemplate(orderLabel: string) {
  return {
    subject: "Pedido entregado — Pan de Rey",
    html: wrap(
      "¡Entregado!",
      `<p ${P}>Tu pedido <strong>${orderLabel}</strong> fue entregado. ¡Que lo disfrutes!</p>`,
    ),
  };
}

export function deliveryIssueTemplate(orderLabel: string) {
  return {
    subject: "No pudimos entregar tu pedido — Pan de Rey",
    html: wrap(
      "No pudimos entregarlo",
      `<p ${P}>Tuvimos un problema para entregar tu pedido <strong>${orderLabel}</strong>. Nuestro repartidor va a esperar unos minutos más en la zona — si no logramos contactarte, tu pedido va a volver a la tienda y te vamos a escribir con los pasos a seguir.</p>`,
    ),
  };
}

export function returnedToStoreTemplate(orderLabel: string) {
  return {
    subject: "Tu pedido volvió a la tienda — Pan de Rey",
    html: wrap(
      "Volvió a la tienda",
      `
        <p ${P}>No pudimos entregar tu pedido <strong>${orderLabel}</strong> y volvió a la tienda. Elige cómo seguir desde tu página de seguimiento:</p>
        <ul ${P}>
          <li>Reenviar con un costo adicional de envío, o</li>
          <li>Retirarlo gratis en tienda.</li>
        </ul>
      `,
    ),
  };
}

export function paymentFailedTemplate(orderLabel: string) {
  return {
    subject: "No pudimos procesar tu pago — Pan de Rey",
    html: wrap(
      "El pago no se pudo completar",
      `<p ${P}>No pudimos procesar el pago de tu pedido <strong>${orderLabel}</strong>. Puedes intentarlo de nuevo desde tu carrito.</p>`,
    ),
  };
}

// Cancelación de un pedido pagado. `refund` describe qué pasó con el dinero: un
// reembolso ya solicitado a Mercado Pago (con los plazos vigentes, porque no es
// inmediato), uno que todavía se está gestionando, o ninguno.
export function orderCancelledTemplate(params: {
  orderLabel: string;
  refund: { state: "requested"; amount: number; policy: string[] } | { state: "processing" } | null;
}) {
  const { orderLabel, refund } = params;

  let refundBlock = "";
  if (refund?.state === "requested") {
    refundBlock = `
      <p ${P}>Solicitamos el reembolso de <strong>${formatCLP(refund.amount)}</strong> a tu medio de pago.</p>
      <p ${P}>${refund.policy.join(" ")}</p>`;
  } else if (refund?.state === "processing") {
    refundBlock = `<p ${P}>Estamos gestionando tu reembolso y te avisaremos apenas lo hayamos solicitado a Mercado Pago.</p>`;
  }

  return {
    subject: `Pedido ${orderLabel} cancelado — Pan de Rey`,
    html: wrap(
      "Pedido cancelado",
      `<p ${P}>Tu pedido <strong>${orderLabel}</strong> fue cancelado.</p>${refundBlock}
       <p ${P}>Si tienes dudas, responde este correo o escríbenos a la tienda.</p>`,
    ),
  };
}
