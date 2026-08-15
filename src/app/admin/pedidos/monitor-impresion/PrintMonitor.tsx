"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Cuánto antes de la hora comprometida (sla_deadline) se manda a imprimir
// la comanda — pedido explícito del negocio: "que se imprima sola cuando
// falten 30 minutos para el vencimiento del SLA".
const AUTO_PRINT_LEAD_MINUTES = 30;
const POLL_INTERVAL_MS = 20_000;

// Los navegadores no dejan disparar `print()` silenciosamente ni abrir una
// pestaña nueva sin gesto del usuario (se trata como popup y se bloquea) —
// por eso este componente navega la MISMA pestaña a la comanda cuando
// corresponde (eso sí está permitido desde un timer). El diálogo nativo de
// impresión del navegador va a seguir apareciendo salvo que el navegador de
// la tablet/PC de cocina esté configurado en modo kiosco de impresión
// (ej. Chrome con --kiosk-printing apuntando a la impresora de comandas).
export function PrintMonitor() {
  const router = useRouter();
  const [status, setStatus] = useState("Buscando pedidos próximos a vencer...");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function checkDue() {
      const leadWindow = new Date(Date.now() + AUTO_PRINT_LEAD_MINUTES * 60000).toISOString();
      const { data: due } = await supabase
        .from("orders")
        .select("id, sla_deadline")
        .in("status", ["paid", "preparing"])
        .is("ticket_printed_at", null)
        .not("sla_deadline", "is", null)
        .lte("sla_deadline", leadWindow)
        .order("sla_deadline", { ascending: true })
        .limit(1);

      if (cancelled) return;

      if (due && due.length > 0) {
        setStatus(`Enviando a imprimir pedido #${due[0].id.slice(0, 8)}...`);
        router.push(`/admin/pedidos/${due[0].id}/ticket?auto=1`);
        return;
      }
      setStatus(`Sin pedidos pendientes de imprimir. Última revisión: ${new Date().toLocaleTimeString("es-CL")}`);
    }

    checkDue();
    const interval = setInterval(checkDue, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  return <p className="text-xs text-foreground-muted/70">{status}</p>;
}
