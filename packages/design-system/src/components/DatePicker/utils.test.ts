import {
  combineDateAndTime,
  formatDate,
  formatDateTime,
  getLocaleDateOrder,
  isDateOutOfRange,
  parseDate,
  parseDateTime,
  toIsoDate,
  toIsoDateTime,
  toTimeInputValue,
} from './utils';

describe('DatePicker utils', () => {
  describe('formatDate', () => {
    it('formats en-US as MM/DD/YYYY', () => {
      expect(formatDate(new Date(2026, 4, 21), 'en-US')).toBe('05/21/2026');
    });

    it('formats ru-RU as DD.MM.YYYY', () => {
      expect(formatDate(new Date(2026, 4, 21), 'ru-RU')).toBe('21.05.2026');
    });
  });

  describe('getLocaleDateOrder', () => {
    it('en-US → month, day, year', () => {
      expect(getLocaleDateOrder('en-US')).toEqual(['month', 'day', 'year']);
    });

    it('ru-RU → day, month, year', () => {
      expect(getLocaleDateOrder('ru-RU')).toEqual(['day', 'month', 'year']);
    });

    it('ja-JP → year, month, day', () => {
      expect(getLocaleDateOrder('ja-JP')).toEqual(['year', 'month', 'day']);
    });
  });

  describe('parseDate', () => {
    it('returns null for empty / whitespace input', () => {
      expect(parseDate('', 'en-US')).toBeNull();
      expect(parseDate('   ', 'en-US')).toBeNull();
    });

    it('parses ISO YYYY-MM-DD regardless of locale', () => {
      const d = parseDate('2026-05-21', 'ru-RU');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(4);
      expect(d!.getDate()).toBe(21);
    });

    it('parses en-US M/D/YYYY', () => {
      const d = parseDate('5/21/2026', 'en-US');
      expect(d!.getMonth()).toBe(4);
      expect(d!.getDate()).toBe(21);
      expect(d!.getFullYear()).toBe(2026);
    });

    it('parses ru-RU D.M.YYYY', () => {
      const d = parseDate('21.5.2026', 'ru-RU');
      expect(d!.getDate()).toBe(21);
      expect(d!.getMonth()).toBe(4);
      expect(d!.getFullYear()).toBe(2026);
    });

    it('rejects invalid dates (Feb 30) instead of silently rolling over', () => {
      expect(parseDate('2/30/2026', 'en-US')).toBeNull();
    });

    it('rejects mis-formed strings (too few / too many chunks)', () => {
      expect(parseDate('5/21', 'en-US')).toBeNull();
      expect(parseDate('5/21/2026/extra', 'en-US')).toBeNull();
      expect(parseDate('nope', 'en-US')).toBeNull();
    });

    it('accepts 2-digit year by pivoting to 2000+yy', () => {
      const d = parseDate('5/21/26', 'en-US');
      expect(d!.getFullYear()).toBe(2026);
    });

    it('tolerates any non-digit separator', () => {
      expect(parseDate('5-21-2026', 'en-US')?.getDate()).toBe(21);
      expect(parseDate('5 21 2026', 'en-US')?.getDate()).toBe(21);
    });
  });

  describe('toIsoDate', () => {
    it('returns YYYY-MM-DD with zero-padding', () => {
      expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('isDateOutOfRange', () => {
    const may21 = new Date(2026, 4, 21);

    it('returns false when no constraints set', () => {
      expect(isDateOutOfRange(may21)).toBe(false);
    });

    it('returns true when before min', () => {
      expect(isDateOutOfRange(may21, new Date(2026, 4, 22))).toBe(true);
    });

    it('returns false when equal to min (inclusive)', () => {
      expect(isDateOutOfRange(may21, may21)).toBe(false);
    });

    it('returns true when after max', () => {
      expect(isDateOutOfRange(may21, undefined, new Date(2026, 4, 20))).toBe(true);
    });

    it('returns false when equal to max (inclusive)', () => {
      expect(isDateOutOfRange(may21, undefined, may21)).toBe(false);
    });

    it('respects isDateDisabled predicate', () => {
      const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
      expect(isDateOutOfRange(may21, undefined, undefined, isWeekend)).toBe(false);
      expect(isDateOutOfRange(new Date(2026, 4, 23), undefined, undefined, isWeekend)).toBe(true);
    });

    it('ignores time-of-day when comparing against min/max', () => {
      expect(isDateOutOfRange(new Date(2026, 4, 21, 23, 59), new Date(2026, 4, 21, 0, 0))).toBe(
        false,
      );
    });
  });

  describe('formatDateTime', () => {
    it('produces date + zero-padded HH:mm in en-US', () => {
      expect(formatDateTime(new Date(2026, 4, 28, 14, 30), 'en-US')).toBe('05/28/2026 14:30');
    });
    it('uses 24-hour even when locale prefers 12-hour', () => {
      expect(formatDateTime(new Date(2026, 4, 28, 13, 5), 'en-US')).toBe('05/28/2026 13:05');
    });
  });

  describe('parseDateTime', () => {
    it('parses ISO with T separator', () => {
      expect(parseDateTime('2026-05-28T14:30', 'en-US')).toEqual(
        new Date(2026, 4, 28, 14, 30, 0, 0),
      );
    });
    it('parses ISO with space separator', () => {
      expect(parseDateTime('2026-05-28 14:30', 'en-US')).toEqual(
        new Date(2026, 4, 28, 14, 30, 0, 0),
      );
    });
    it('parses locale-formatted date with time', () => {
      expect(parseDateTime('05/28/2026 14:30', 'en-US')).toEqual(
        new Date(2026, 4, 28, 14, 30, 0, 0),
      );
    });
    it('parses date-only as 00:00 (partial typing)', () => {
      expect(parseDateTime('05/28/2026', 'en-US')).toEqual(new Date(2026, 4, 28, 0, 0, 0, 0));
    });
    it('returns null for empty input', () => {
      expect(parseDateTime('', 'en-US')).toBeNull();
      expect(parseDateTime('   ', 'en-US')).toBeNull();
    });
    it('returns null for invalid time (25:99)', () => {
      expect(parseDateTime('05/28/2026 25:99', 'en-US')).toBeNull();
    });
    it('returns null for invalid date with valid time', () => {
      expect(parseDateTime('99/99/9999 14:30', 'en-US')).toBeNull();
    });
  });

  describe('toIsoDateTime', () => {
    it('zero-pads month/day/hour/minute', () => {
      expect(toIsoDateTime(new Date(2026, 0, 5, 3, 7))).toBe('2026-01-05T03:07');
    });
  });

  describe('combineDateAndTime', () => {
    it('replaces hours/minutes, keeps date components', () => {
      const base = new Date(2026, 4, 28, 9, 15, 30, 500);
      const result = combineDateAndTime(base, 14, 0);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(4);
      expect(result.getDate()).toBe(28);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
    it('returns a new Date — does not mutate input', () => {
      const base = new Date(2026, 4, 28, 9, 15);
      const result = combineDateAndTime(base, 14, 0);
      expect(result).not.toBe(base);
      expect(base.getHours()).toBe(9);
    });
  });

  describe('toTimeInputValue', () => {
    it('formats HH:mm zero-padded', () => {
      expect(toTimeInputValue(new Date(2026, 4, 28, 3, 7))).toBe('03:07');
      expect(toTimeInputValue(new Date(2026, 4, 28, 23, 59))).toBe('23:59');
    });
  });
});
