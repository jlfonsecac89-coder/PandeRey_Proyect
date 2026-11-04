import { chileWallTimeToUtc } from "@/lib/stores/schedule";

// Sin "server-only": lo usan el admin (cliente y servidor) y la tienda.

export type CollectionStatus = "live" | "scheduled" | "expired" | "inactive";

// Una colección es pública solo si está activa Y dentro de su vigencia. La
// política de la base solo mira is_active, así que las fechas se aplican acá.
export function collectionStatus(
  c: { is_active: boolean; starts_at: string | null; ends_at: string | null },
  now: Date = new Date(),
): CollectionStatus {
  if (!c.is_active) return "inactive";
  const t = now.getTime();
  if (c.starts_at && t < new Date(c.starts_at).getTime()) return "scheduled";
  if (c.ends_at && t > new Date(c.ends_at).getTime()) return "expired";
  return "live";
}

// Los inputs datetime-local no traen zona: se interpretan como hora de Chile
// (sin esto, "09:00" se guardaba como 09:00 UTC, 3-4 horas antes de lo pedido).
export function chileLocalToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m.map(Number);
  return chileWallTimeToUtc(y, mo, d, hh, mm).toISOString();
}

const CHILE_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Valor para <input type="datetime-local"> en hora de Chile; "" si no hay fecha.
export function isoToChileLocal(iso: string | null): string {
  if (!iso) return "";
  const parts = CHILE_PARTS.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
