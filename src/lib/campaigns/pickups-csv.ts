import { formatOrderNumber } from "@/lib/format";
import type { PickupLine } from "./pickups-data";

const HEADER = [
  "N° pedido",
  "Cliente",
  "Teléfono",
  "Producto",
  "Unidades",
  "Fecha de retiro",
  "Estado del retiro",
  "Retirado el",
  "N° de boleta",
];

// Punto y coma: el Excel en configuración regional de Chile usa ";" como
// separador de lista, con "," abriría todo en una sola columna.
const SEPARATOR = ";";

// Un valor que empieza con = + - @ se interpreta como fórmula al abrirlo en
// Excel; el nombre del cliente lo escribe el cliente, así que se neutraliza.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const DATE_TIME = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function pickupLinesToCsv(lines: PickupLine[]): string {
  const rows = lines.map((l) =>
    [
      formatOrderNumber(l.orderNumber),
      l.customerName,
      l.customerPhone ?? "",
      l.productName,
      String(l.quantity),
      l.pickupDate.split("-").reverse().join("-"),
      l.pickedUpAt ? "Retirado" : "Pendiente",
      l.pickedUpAt ? DATE_TIME.format(new Date(l.pickedUpAt)) : "",
      l.receiptNumber ?? "",
    ]
      .map(cell)
      .join(SEPARATOR),
  );
  // BOM para que Excel reconozca UTF-8 (tildes y eñes).
  return "﻿" + [HEADER.map(cell).join(SEPARATOR), ...rows].join("\r\n");
}
