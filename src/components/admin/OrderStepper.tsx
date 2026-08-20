import { PIPELINE_GROUPS, statusToGroup, type PipelineGroup } from "@/lib/orders/pipeline";

// Extraído de AdminOrderRow.tsx (paso 2 del blueprint admin-redesign) —
// mismo comportamiento, ahora reusable (ej. tarjetas del Kanban).
//
// Pasos "normales" del pipeline (excluye problemas/cancelados, que son
// desvíos del camino feliz y se muestran aparte) — el paso "en_camino" solo
// aplica a pedidos con envío, así que se salta para retiro en tienda (4
// pasos para retiro, 5 para envío).
const PICKUP_STEPS: { key: PipelineGroup; label: string }[] = [
  { key: "pago_pendiente", label: "Recibido" },
  { key: "por_preparar", label: "Preparando" },
  { key: "listos", label: "Listo" },
  { key: "entregados", label: "Entregado" },
];
const SHIPPING_STEPS: { key: PipelineGroup; label: string }[] = [
  { key: "pago_pendiente", label: "Recibido" },
  { key: "por_preparar", label: "Preparando" },
  { key: "listos", label: "Listo" },
  { key: "en_camino", label: "En camino" },
  { key: "entregados", label: "Entregado" },
];

export function OrderStepper({
  status,
  deliveryMethod,
}: {
  status: string;
  deliveryMethod: "pickup" | "shipping";
}) {
  const group = statusToGroup(status);
  const steps = deliveryMethod === "pickup" ? PICKUP_STEPS : SHIPPING_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === group);

  if (group === "problemas" || group === "cancelados") {
    return (
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] ${
          group === "cancelados"
            ? "border-red-500/40 text-red-400"
            : "border-orange-500/40 text-orange-400"
        }`}
      >
        {PIPELINE_GROUPS[group].label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done = currentIndex >= 0 && i <= currentIndex;
        return (
          <span
            key={step.key}
            title={step.label}
            className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold ${
              done ? "bg-gold text-ink" : "bg-white/10 text-foreground/40"
            }`}
          >
            {done ? "✓" : i + 1}
          </span>
        );
      })}
    </div>
  );
}
