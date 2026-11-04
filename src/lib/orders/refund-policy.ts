// Plazos de reembolso que se muestran al cliente (términos, correo, página del
// pedido). Sin "server-only": lo importan componentes de cliente y de servidor.
//
// Mercado Pago no devuelve el dinero al instante: acepta el reembolso y luego
// el abono depende del medio de pago y del banco. Por eso la política separa
// lo que depende de la tienda (pedir el reembolso) de lo que no (acreditación)
// y fija un tope total. El gerente ajusta los números en Ajustes del sistema.
export type RefundPolicy = {
  requestBusinessDays: number;
  debitBusinessDays: number;
  maxDays: number;
};

// El artículo 3 bis de la Ley 19.496 exige devolver "a la mayor brevedad
// posible y, en cualquier caso, antes de cuarenta y cinco días" desde la
// comunicación del retracto: la tienda no debería prometer más que eso.
export const REFUND_LEGAL_MAX_DAYS = 45;

export function refundPolicySentences(p: RefundPolicy): string[] {
  return [
    `Solicitamos el reembolso a Mercado Pago dentro de ${p.requestBusinessDays} día${p.requestBusinessDays === 1 ? "" : "s"} hábil${p.requestBusinessDays === 1 ? "" : "es"} desde que se aprueba la cancelación.`,
    `Una vez solicitado, el dinero vuelve a tu medio de pago y el plazo en que lo ves depende de tu banco: con tarjeta de débito o prepago, hasta ${p.debitBusinessDays} días hábiles; con tarjeta de crédito, se refleja en tu estado de cuenta, habitualmente en el próximo ciclo de facturación.`,
    `En todo caso, el reembolso se completa dentro de ${p.maxDays} días corridos desde que se solicita la cancelación.`,
  ];
}

export function refundPolicyText(p: RefundPolicy): string {
  return refundPolicySentences(p).join(" ");
}

// Texto de la sección "Cancelaciones, devoluciones y reembolsos" de los Términos.
// El gerente puede reescribirlo en Ajustes del sistema; vacío = este texto.
// Marcadores que se reemplazan con los plazos vigentes:
//   {dias_solicitud} {dias_debito} {dias_maximo}   → los números
//   {plazos}                                       → las tres frases de plazos
// Un párrafo se separa con una línea en blanco y **texto** va en negrita.
export const REFUND_TEMPLATE_MAX_LENGTH = 3000;

export const DEFAULT_REFUND_TEMPLATE = `Para cancelar un pedido ya pagado, contáctanos por los medios indicados al final de estos términos. Si el pedido se cancela —a tu solicitud o porque la tienda no puede prepararlo— te reembolsamos el monto efectivamente pagado al mismo medio de pago, a través de Mercado Pago.

**El reembolso no es instantáneo.** {plazos}

No controlamos los tiempos de tu banco o emisor de tarjeta. Si pasado el plazo no ves el dinero, escríbenos con el N.º de tu pedido y lo revisamos contigo. En pedidos por encargo con retiro en varias fechas, si ya retiraste una parte, el reembolso de la parte pendiente se coordina directamente con la tienda.`;

export function renderRefundTemplate(template: string, p: RefundPolicy): string[] {
  const filled = template
    .replaceAll("{plazos}", refundPolicyText(p))
    .replaceAll("{dias_solicitud}", String(p.requestBusinessDays))
    .replaceAll("{dias_debito}", String(p.debitBusinessDays))
    .replaceAll("{dias_maximo}", String(p.maxDays));
  return filled
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean);
}
