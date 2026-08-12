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

// Despacho puede tener un horario propio (`delivery_schedule`) — si Admin no
// lo configuró explícitamente, se usa el mismo horario que retiro
// (`business_hours`) en vez de dejar el despacho sin horario disponible.
export function resolveSchedule(
  businessHours: BusinessHours,
  deliverySchedule: BusinessHours,
  deliveryMethod: "pickup" | "shipping",
): BusinessHours {
  if (deliveryMethod === "shipping" && deliverySchedule && deliverySchedule.length > 0) {
    return deliverySchedule;
  }
  return businessHours;
}

const SLOT_MINUTES = 15;

// Genera los horarios agendables (cada 15 min) para un día puntual, dentro
// del rango open-close configurado para ese día de la semana. `dayEntry` ya
// viene resuelto (retiro o despacho) — esta función no sabe de esa distinción.
export function slotsForDay(dayEntry: DaySchedule | null): string[] {
  if (!dayEntry) return [];
  const openMinutes = toMinutes(dayEntry.open);
  const closeMinutes = toMinutes(dayEntry.close);
  const slots: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += SLOT_MINUTES) {
    const h = Math.floor(m / 60)
      .toString()
      .padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    slots.push(`${h}:${mm}`);
  }
  return slots;
}

// Diferencia (en minutos) entre UTC y hora de Chile para el instante dado —
// Chile cambió de regla de horario de verano varias veces en los últimos
// años, así que en vez de asumir un offset fijo (-3 o -4), se lo pregunta a
// Intl para ese instante puntual: formatea la misma fecha "como si fuera"
// UTC y "como si fuera" Chile (sin offset en el string), y la diferencia
// entre ambas lecturas es el offset real vigente en ese momento.
function chileOffsetMinutes(date: Date): number {
  const asUtc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const asChile = new Date(date.toLocaleString("en-US", { timeZone: CHILE_TZ }));
  return (asChile.getTime() - asUtc.getTime()) / 60000;
}

// Convierte "año-mes-día hora:minuto en hora de Chile" a un instante UTC
// real — necesario para armar el `scheduled_at` que se guarda en la base
// (siempre UTC) a partir de un día+slot que el cliente eligió en la grilla.
export function chileWallTimeToUtc(y: number, m: number, d: number, hh: number, mm: number): Date {
  const naiveUtcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offsetMinutes = chileOffsetMinutes(naiveUtcGuess);
  return new Date(naiveUtcGuess.getTime() - offsetMinutes * 60000);
}

// Año/mes/día de un instante, en hora de Chile — para armar la lista de
// "próximos días agendables" a partir de "ahora" sin depender de la zona
// horaria del servidor.
export function chileDateYmd(date: Date): { y: number; m: number; d: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sunday";
  return { y: get("year"), m: get("month"), d: get("day"), day: WEEKDAY_INDEX[weekday] ?? 0 };
}

// Suma días de calendario a un año/mes/día — aritmética pura de fechas
// (sin hora/zona), así que no hay que preocuparse por DST acá.
export function addDaysToYmd(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function weekdayFromYmd(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
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
