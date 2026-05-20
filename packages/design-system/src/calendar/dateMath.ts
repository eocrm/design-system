const MS_PER_DAY = 86_400_000;

export function addDays(date: Date, n: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

export function addMonths(date: Date, n: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + n);
  // Clamp day to the target month's last day (handles Jan 31 + 1m → Feb 28/29)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

export function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date {
  const result = startOfDay(date);
  const delta = (result.getDay() - weekStartsOn + 7) % 7;
  result.setDate(result.getDate() - delta);
  return result;
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  return result;
}

export function endOfMonth(date: Date): Date {
  // Day 0 of next month = last day of current month.
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(date: Date, now: Date = new Date()): boolean {
  return isSameDay(date, now);
}

export function isWeekend(date: Date, weekendDays: readonly number[]): boolean {
  return weekendDays.includes(date.getDay());
}

export function daysBetween(a: Date, b: Date): number {
  const startA = startOfDay(a).getTime();
  const startB = startOfDay(b).getTime();
  return Math.round((startB - startA) / MS_PER_DAY);
}

export function toDateKey(date: Date): string {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function fromDateKey(key: string): Date {
  const [yyyy, mm, dd] = key.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}
