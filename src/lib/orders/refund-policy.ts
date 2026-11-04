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
