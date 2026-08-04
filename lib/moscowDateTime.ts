const MOSCOW_TIME_ZONE = "Europe/Moscow";

export function parseMoscowDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const value = new Date(`${date}T${time}:00+03:00`);

  if (Number.isNaN(value.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  if (
    `${part("year")}-${part("month")}-${part("day")}` !== date ||
    `${part("hour")}:${part("minute")}` !== time
  ) {
    return null;
  }

  return value;
}

export function formatMoscowDateTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
