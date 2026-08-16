const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getMoscowWeekRange(now: Date) {
  const moscow = new Date(now.getTime() + MOSCOW_OFFSET_MS);
  const weekday = moscow.getUTCDay() || 7;
  const start = new Date(
    Date.UTC(
      moscow.getUTCFullYear(),
      moscow.getUTCMonth(),
      moscow.getUTCDate() - weekday + 1,
    ) - MOSCOW_OFFSET_MS,
  );

  return {
    start,
    end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000),
  };
}
