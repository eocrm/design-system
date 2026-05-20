import {
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  daysBetween,
  toDateKey,
  fromDateKey,
} from './dateMath';

describe('addDays', () => {
  it('adds positive days, crossing month boundary', () => {
    expect(addDays(new Date(2026, 4, 31), 1)).toEqual(new Date(2026, 5, 1));
  });

  it('subtracts when n is negative', () => {
    expect(addDays(new Date(2026, 5, 1), -1)).toEqual(new Date(2026, 4, 31));
  });

  it('returns a new Date (does not mutate input)', () => {
    const a = new Date(2026, 4, 20);
    addDays(a, 5);
    expect(a).toEqual(new Date(2026, 4, 20));
  });
});

describe('addMonths', () => {
  it('adds positive months', () => {
    expect(addMonths(new Date(2026, 0, 15), 2)).toEqual(new Date(2026, 2, 15));
  });

  it('clamps day-of-month on shorter target month', () => {
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
  });

  it('wraps year on +12 months', () => {
    expect(addMonths(new Date(2026, 11, 15), 1)).toEqual(new Date(2027, 0, 15));
  });
});

describe('addWeeks', () => {
  it('adds 7 days per week', () => {
    expect(addWeeks(new Date(2026, 4, 20), 2)).toEqual(new Date(2026, 5, 3));
  });
});

describe('startOfDay', () => {
  it('zeroes the time component, keeps local date', () => {
    const d = new Date(2026, 4, 20, 14, 35, 22, 999);
    expect(startOfDay(d)).toEqual(new Date(2026, 4, 20, 0, 0, 0, 0));
  });
});

describe('startOfWeek', () => {
  it('Monday-start: returns the Monday of the week (Wed → previous Mon)', () => {
    expect(startOfWeek(new Date(2026, 4, 20), 1)).toEqual(new Date(2026, 4, 18));
  });

  it('Sunday-start: returns the Sunday of the week (Wed → previous Sun)', () => {
    expect(startOfWeek(new Date(2026, 4, 20), 0)).toEqual(new Date(2026, 4, 17));
  });

  it('returns the same day when the input is already the week start', () => {
    expect(startOfWeek(new Date(2026, 4, 18), 1)).toEqual(new Date(2026, 4, 18));
  });
});

describe('startOfMonth / endOfMonth', () => {
  it('startOfMonth returns the 1st at local midnight', () => {
    expect(startOfMonth(new Date(2026, 4, 20, 15))).toEqual(new Date(2026, 4, 1));
  });

  it('endOfMonth returns the last day at local midnight', () => {
    expect(endOfMonth(new Date(2026, 1, 1))).toEqual(new Date(2026, 1, 28));
    expect(endOfMonth(new Date(2026, 4, 1))).toEqual(new Date(2026, 4, 31));
  });
});

describe('isSameDay / isSameMonth', () => {
  it('isSameDay matches across time components on the same calendar day', () => {
    expect(isSameDay(new Date(2026, 4, 20, 1, 0), new Date(2026, 4, 20, 23, 59))).toBe(true);
  });

  it('isSameDay false across midnight', () => {
    expect(isSameDay(new Date(2026, 4, 20, 23, 59), new Date(2026, 4, 21, 0, 0))).toBe(false);
  });

  it('isSameMonth matches days within the same calendar month', () => {
    expect(isSameMonth(new Date(2026, 4, 1), new Date(2026, 4, 31))).toBe(true);
    expect(isSameMonth(new Date(2026, 4, 31), new Date(2026, 5, 1))).toBe(false);
  });
});

describe('isToday', () => {
  it('true when the same day as injected now', () => {
    const now = new Date(2026, 4, 20, 14);
    expect(isToday(new Date(2026, 4, 20, 9), now)).toBe(true);
  });

  it('false when day differs', () => {
    const now = new Date(2026, 4, 20);
    expect(isToday(new Date(2026, 4, 19), now)).toBe(false);
  });
});

describe('isWeekend', () => {
  it('true for Saturday when weekendDays is [0, 6]', () => {
    expect(isWeekend(new Date(2026, 4, 23), [0, 6])).toBe(true);
  });

  it('false for Wednesday with default Sat/Sun weekend', () => {
    expect(isWeekend(new Date(2026, 4, 20), [0, 6])).toBe(false);
  });

  it('respects a Fri/Sat weekend (e.g., for ar-SA)', () => {
    expect(isWeekend(new Date(2026, 4, 22), [5, 6])).toBe(true);
    expect(isWeekend(new Date(2026, 4, 24), [5, 6])).toBe(false);
  });
});

describe('daysBetween', () => {
  it('returns calendar-day difference (positive)', () => {
    expect(daysBetween(new Date(2026, 4, 20), new Date(2026, 4, 25))).toBe(5);
  });

  it('returns 0 for the same day across time components', () => {
    expect(daysBetween(new Date(2026, 4, 20, 1), new Date(2026, 4, 20, 23))).toBe(0);
  });

  it('returns negative when b is before a', () => {
    expect(daysBetween(new Date(2026, 4, 25), new Date(2026, 4, 20))).toBe(-5);
  });
});

describe('toDateKey / fromDateKey', () => {
  it('toDateKey produces YYYY-MM-DD with zero-padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('fromDateKey parses to local midnight', () => {
    expect(fromDateKey('2026-05-20')).toEqual(new Date(2026, 4, 20));
  });

  it('round-trips', () => {
    const d = new Date(2026, 6, 4, 8, 30);
    const key = toDateKey(d);
    const parsed = fromDateKey(key);
    expect(isSameDay(parsed, d)).toBe(true);
  });
});
