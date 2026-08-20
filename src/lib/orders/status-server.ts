import "server-only";
import { getSystemSettings } from "@/lib/settings/system-settings";

// Separado de status.ts porque ese archivo se importa desde componentes
// cliente (AdminOrderRow.tsx) para OrderStatus/STATUS_LABELS — mezclar algo
// que depende de "server-only" ahí rompe el build (import de server-only
// filtrándose al bundle de cliente).

// Editable desde /admin/configuracion/sistema sin redeploy — la variable de
// entorno queda solo como default si nadie configuró nada todavía (ver
// src/lib/settings/system-settings.ts).
export async function orderPrepSlaMinutes(): Promise<number> {
  return (await getSystemSettings()).orderPrepSlaMinutes;
}

export async function maxDeliveryIssueWaitMinutes(): Promise<number> {
  return (await getSystemSettings()).maxDeliveryIssueWaitMinutes;
}
