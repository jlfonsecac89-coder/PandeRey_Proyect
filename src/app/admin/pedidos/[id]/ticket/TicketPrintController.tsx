"use client";

import { useEffect, useRef, useState } from "react";
import { printTicket } from "@/lib/orders/actions";

// Maneja tanto el botón "Imprimir comanda" (click manual) como el disparo
// automático desde el vigía de impresión (?auto=1): en ambos casos, lo que
// arranca el SLA de preparación es la llamada a printTicket(), no la sola
// apertura de la pestaña — así que solo se llama cuando de verdad se manda a
// imprimir, nunca solo por ver el detalle del pedido.
export function TicketPrintController({
  orderId,
  alreadyPrinted,
  autoPrint,
}: {
  orderId: string;
  alreadyPrinted: boolean;
  autoPrint: boolean;
}) {
  const [printed, setPrinted] = useState(alreadyPrinted);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || firedRef.current) return;
    firedRef.current = true;

    printTicket(orderId).finally(() => {
      setPrinted(true);
      window.print();
    });

    // Después de imprimir (o de cerrar el diálogo de impresión), vuelve sola
    // al vigía para seguir esperando el próximo pedido — así la tablet de
    // cocina no se queda trabada en la comanda ya impresa.
    const onAfterPrint = () => {
      window.location.href = "/admin/pedidos/monitor-impresion";
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [autoPrint, orderId]);

  function handleManualPrint() {
    printTicket(orderId).finally(() => setPrinted(true));
    window.print();
  }

  return (
    <div className="mb-4 flex flex-col items-center gap-1 print:hidden">
      <button
        type="button"
        onClick={handleManualPrint}
        className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-hover"
      >
        {printed ? "Reimprimir comanda" : "Imprimir comanda"}
      </button>
      {printed && <p className="text-[10px] text-ink/50">SLA de preparación ya iniciado.</p>}
    </div>
  );
}
