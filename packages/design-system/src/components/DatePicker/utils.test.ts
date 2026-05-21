import { formatDate, getLocaleDateOrder, isDateOutOfRange, parseDate, toIsoDate } from './utils';

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
});
