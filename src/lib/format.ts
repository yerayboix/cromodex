/** Date wording for the UI (Spanish, Spain time). */

const TIME_ZONE = "Europe/Madrid";

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const longDay = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
});
const clock = new Intl.DateTimeFormat("es-ES", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function daysAgo(date: Date, now: Date) {
  const a = Date.parse(dayKey.format(date));
  const b = Date.parse(dayKey.format(now));
  return Math.round((b - a) / 86_400_000);
}

/** "Hoy", "Ayer" or "24 de noviembre". */
export function dayLabel(date: Date, now = new Date()) {
  const d = daysAgo(date, now);
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return longDay.format(date);
}

/** "hoy", "ayer" or "el 24 de noviembre", to follow "desde". */
export function sinceLabel(date: Date, now = new Date()) {
  const d = daysAgo(date, now);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  return `el ${longDay.format(date)}`;
}

/** Calendar day in Spain time, for grouping. */
export function dayGroupKey(date: Date) {
  return dayKey.format(date);
}

export function timeLabel(date: Date) {
  return clock.format(date);
}
