import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { PrintMonitor } from "./PrintMonitor";

// Pestaña pensada para quedar abierta y fija en la tablet/PC de la
// comandera: no muestra nada operable, solo vigila los pedidos y navega
// sola a la comanda del próximo pedido a imprimir cuando corresponde.
export default async function PrintMonitorPage() {
  await requireRole(["admin", "operaciones"], "/admin-login");

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Cocina</p>
      <h1 className="font-display text-2xl font-medium text-foreground">Vigía de impresión</h1>
      <p className="max-w-sm text-sm text-foreground-muted">
        Dejá esta pestaña abierta. Cuando falten 30 minutos para la hora comprometida de un pedido sin comanda
        impresa, se abre sola la comanda y se manda a imprimir.
      </p>
      <PrintMonitor />
      <Link href="/admin/pedidos" className="mt-2 text-xs text-foreground-muted hover:text-gold">
        ← Volver a Pedidos
      </Link>
    </div>
  );
}
