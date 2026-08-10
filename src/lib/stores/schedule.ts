// Horario de atención de una sucursal — usado para validar que la fecha/hora
// de retiro o despacho que elige el cliente en el checkout caiga dentro del
// rango real de la tienda (Admin lo configura en Configuración > Sucursales).
// Un mismo horario se usa tanto para retiro como para despacho: v1 no
// diferencia "horario de atención al público" de "horario de reparto" (esa
// distinción existe en el schema pero todavía no tiene UI de Admin — se
// puede separar más adelante si hace falta).
export type DaySchedule = { day: number; open: string; close: string };
export type BusinessHours = DaySchedule[] | null;

const CHILE_TZ = "America/Santiago";

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// El horario de la tienda es local a Chile — calcular día/hora con
// Intl.DateTimeFormat fijado a esa zona evita que el resultado cambie según
// la zona horaria del servidor o del navegador del cliente (que puede no
// coincidir con la del servidor).
function chileDateParts(date: Date): { day: number; minutesOfDay: number } {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: CHILE_TZ, weekday: "long" }).format(date);
  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(timeParts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(timeParts.find((p) => p.type === "minute")?.value ?? "0");
  return { day: WEEKDAY_INDEX[weekday] ?? date.getDay(), minutesOfDay: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Sin horario configurado = sin restricción (todavía no rompe el checkout
// para sucursales que Admin no haya configurado).
export function isWithinBusinessHours(hours: BusinessHours, date: Date): boolean {
  if (!hours || hours.length === 0) return true;
  const { day, minutesOfDay } = chileDateParts(date);
  const entry = hours.find((h) => h.day === day);
  if (!entry) return false;
  return minutesOfDay >= toMinutes(entry.open) && minutesOfDay < toMinutes(entry.close);
}

const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo, para mostrar en orden natural

// Agrupa días consecutivos con el mismo horario ("Lun-Vie 09:00-20:00")
// para que el horario configurado se lea como en cualquier vitrina, no como
// un dump de los 7 días.
export function formatBusinessHours(hours: BusinessHours): string {
  if (!hours || hours.length === 0) return "Sin horario configurado";
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const segments: string[] = [];
  let i = 0;
  while (i < WEEK_ORDER.length) {
    const entry = byDay.get(WEEK_ORDER[i]);
    if (!entry) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < WEEK_ORDER.length) {
      const next = byDay.get(WEEK_ORDER[j + 1]);
      if (!next || next.open !== entry.open || next.close !== entry.close) break;
      j++;
    }
    const label = j > i ? `${DAY_ABBR[WEEK_ORDER[i]]}-${DAY_ABBR[WEEK_ORDER[j]]}` : DAY_ABBR[WEEK_ORDER[i]];
    segments.push(`${label} ${entry.open}-${entry.close}`);
    i = j + 1;
  }
  return segments.length ? segments.join(" · ") : "Cerrado";
}
