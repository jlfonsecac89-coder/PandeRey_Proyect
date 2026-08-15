import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";

// Modelo descargable de la carga masiva — mismas columnas que espera
// importProductsCsv() en src/lib/catalog/import-actions.ts, con una fila de
// ejemplo para que quede claro el formato (departamento/categoría van por
// código, no por nombre, porque el código es lo único garantizado único).
const HEADER = [
  "departamento_codigo",
  "categoria_codigo",
  "nombre",
  "descripcion",
  "precio",
  "sin_gluten",
  "grupo_opcion",
  "valor_opcion",
  "recargo_opcion",
];
const EXAMPLE_ROW = ["PAN", "AMB", "Marraqueta", "Pan amasado clásico", "1200", "no", "", "", ""];

function toCsvRow(values: string[]): string {
  return values
    .map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
    .join(",");
}

export async function GET() {
  await requireRole(["admin", "operaciones"], "/admin-login");

  const csv = [toCsvRow(HEADER), toCsvRow(EXAMPLE_ROW)].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-productos.csv"',
    },
  });
}
