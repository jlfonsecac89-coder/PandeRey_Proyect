// Seguro para importar desde componentes cliente (AdminNav, formularios) —
// nada de server-only acá; la lectura real vive en modules.ts.

export const MODULES = [
  {
    key: "inventory",
    settingKey: "module_inventory",
    label: "Inventario por stock",
    description:
      "Control de lotes y stock con descuento FIFO. Apagado, los productos solo se marcan Disponible o No disponible.",
  },
  {
    key: "delivery",
    settingKey: "module_delivery",
    label: "Delivery",
    description:
      "Despacho a domicilio, repartidores y portal de delivery. Apagado, la tienda solo ofrece retiro en tienda.",
  },
  {
    key: "invoicing",
    settingKey: "module_invoicing",
    label: "Boletas desde la plataforma",
    description:
      "Emisión de documentos tributarios desde el sistema. Apagado, la boleta se emite en Defontana y al entregar se registra su número.",
  },
  {
    key: "bank_transfer",
    settingKey: "module_bank_transfer",
    label: "Pago por transferencia",
    description:
      "Pago por transferencia coordinado por WhatsApp con confirmación manual. Apagado, solo se paga por Mercado Pago.",
  },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export type ModuleFlags = Record<ModuleKey, boolean>;

export const ALL_MODULES_OFF: ModuleFlags = {
  inventory: false,
  delivery: false,
  invoicing: false,
  bank_transfer: false,
};
