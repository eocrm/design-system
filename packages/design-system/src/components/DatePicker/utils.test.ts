import {
  combineDateAndTime,
  formatDate,
  formatDateTime,
  formatTime,
  getLocaleDateOrder,
  getLocaleHourCycle,
  isDateOutOfRange,
  parseDate,
  parseDateTime,
  parseTime,
  resolveHourCycle,
  roundTimeToStep,
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
    it('defaults to 24-hour when cycle arg is omitted (back-compat)', () => {
      expect(formatDateTime(new Date(2026, 4, 28, 13, 5), 'en-US')).toBe('05/28/2026 13:05');
    });
    it('renders AM/PM when cycle="12"', () => {
      expect(formatDateTime(new Date(2026, 4, 28, 14, 30), 'en-US', '12')).toBe(
        '05/28/2026 2:30 PM',
      );
      expect(formatDateTime(new Date(2026, 4, 28, 0, 0), 'en-US', '12')).toBe(
        '05/28/2026 12:00 AM',
      );
      expect(formatDateTime(new Date(2026, 4, 28, 12, 0), 'en-US', '12')).toBe(
        '05/28/2026 12:00 PM',
      );
    });
    it('preserves 24-hour output when cycle="24" is explicit', () => {
      expect(formatDateTime(new Date(2026, 4, 28, 9, 0), 'en-US', '24')).toBe('05/28/2026 09:00');
    });
  });

  describe('getLocaleHourCycle', () => {
    it('detects 12-hour locales (en-US)', () => {
      expect(getLocaleHourCycle('en-US')).toBe('12');
    });
    it('detects 24-hour locales (ru-RU)', () => {
      expect(getLocaleHourCycle('ru-RU')).toBe('24');
    });
    it('detects 24-hour locales (de-DE)', () => {
      expect(getLocaleHourCycle('de-DE')).toBe('24');
    });
    it('detects 24-hour locales (ja-JP)', () => {
      expect(getLocaleHourCycle('ja-JP')).toBe('24');
    });
  });

  describe('resolveHourCycle', () => {
    it("resolves 'auto' against the locale (en-US → '12')", () => {
      expect(resolveHourCycle('auto', 'en-US')).toBe('12');
    });
    it("resolves 'auto' against the locale (ru-RU → '24')", () => {
      expect(resolveHourCycle('auto', 'ru-RU')).toBe('24');
    });
    it("passes through explicit '12'", () => {
      expect(resolveHourCycle('12', 'ru-RU')).toBe('12');
    });
    it("passes through explicit '24'", () => {
      expect(resolveHourCycle('24', 'en-US')).toBe('24');
    });
  });

  describe('formatTime', () => {
    it("formats 24h as zero-padded HH:mm", () => {
      expect(formatTime(14, 30, '24')).toBe('14:30');
      expect(formatTime(9, 0, '24')).toBe('09:00');
      expect(formatTime(0, 0, '24')).toBe('00:00');
      expect(formatTime(23, 59, '24')).toBe('23:59');
    });
    it("formats 12h with AM/PM and one-digit hour when applicable", () => {
      expect(formatTime(14, 30, '12')).toBe('2:30 PM');
      expect(formatTime(11, 5, '12')).toBe('11:05 AM');
      expect(formatTime(23, 5, '12')).toBe('11:05 PM');
    });
    it("maps internal hour 0 to '12 AM' and 12 to '12 PM'", () => {
      expect(formatTime(0, 0, '12')).toBe('12:00 AM');
      expect(formatTime(12, 0, '12')).toBe('12:00 PM');
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

  describe('parseTime', () => {
    it('returns null for empty / whitespace input', () => {
      expect(parseTime('')).toBeNull();
      expect(parseTime('   ')).toBeNull();
    });

    it('parses HH:mm', () => {
      expect(parseTime('14:30')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });

    it('parses single-digit hours with colon (H:mm)', () => {
      expect(parseTime('9:05')).toEqual({ hours: 9, minutes: 5 });
    });

    it('trims surrounding whitespace before parsing', () => {
      expect(parseTime('  09:15  ')).toEqual({ hours: 9, minutes: 15 });
    });

    it('parses 4-digit HHmm (no colon)', () => {
      expect(parseTime('1430')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('0000')).toEqual({ hours: 0, minutes: 0 });
    });

    it('parses 3-digit Hmm (no colon, single-digit hour)', () => {
      expect(parseTime('930')).toEqual({ hours: 9, minutes: 30 });
    });

    it('parses hours-only (HH/H) with minutes defaulted to 0', () => {
      expect(parseTime('14')).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime('9')).toEqual({ hours: 9, minutes: 0 });
      expect(parseTime('0')).toEqual({ hours: 0, minutes: 0 });
    });

    it('rejects out-of-range hours (>= 24)', () => {
      expect(parseTime('24:00')).toBeNull();
      expect(parseTime('99')).toBeNull();
      expect(parseTime('2400')).toBeNull();
    });

    it('rejects out-of-range minutes (>= 60)', () => {
      expect(parseTime('12:60')).toBeNull();
      expect(parseTime('1299')).toBeNull();
    });

    it('rejects garbage and partial inputs that match no shape', () => {
      expect(parseTime('abc')).toBeNull();
      expect(parseTime('12:3')).toBeNull(); // minutes must be exactly 2 digits with colon
      expect(parseTime('12:345')).toBeNull();
      expect(parseTime('1:2:3')).toBeNull();
      expect(parseTime('12a30')).toBeNull();
    });

    it('parses AM/PM colon form to 24h internal', () => {
      expect(parseTime('2:30 PM')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('2:30 AM')).toEqual({ hours: 2, minutes: 30 });
      expect(parseTime('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime('12:30 PM')).toEqual({ hours: 12, minutes: 30 });
      expect(parseTime('11:59 PM')).toEqual({ hours: 23, minutes: 59 });
    });

    it('parses AM/PM digits form ("230pm")', () => {
      expect(parseTime('230pm')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('1230 a.m.')).toEqual({ hours: 0, minutes: 30 });
    });

    it('parses AM/PM hours-only form ("2pm" / "2 PM" / "12am")', () => {
      expect(parseTime('2 PM')).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime('2pm')).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime('12am')).toEqual({ hours: 0, minutes: 0 });
    });

    it('is case-insensitive and tolerates periods in "P.M."', () => {
      expect(parseTime('2:30 pm')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('2:30 P.M.')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('2:30P.M.')).toEqual({ hours: 14, minutes: 30 });
    });

    it('rejects invalid 12-hour hours (0 / 13) with AM/PM suffix', () => {
      expect(parseTime('0:30 PM')).toBeNull();
      expect(parseTime('13:00 PM')).toBeNull();
    });

    it('rejects bare AM/PM with no hour digits', () => {
      expect(parseTime('P.M.')).toBeNull();
      expect(parseTime('pm')).toBeNull();
    });
  });

  describe('roundTimeToStep', () => {
    it('returns input unchanged when step <= 1 (no-op mode)', () => {
      expect(roundTimeToStep(9, 27, 1)).toEqual({ hours: 9, minutes: 27 });
      expect(roundTimeToStep(9, 27, 0)).toEqual({ hours: 9, minutes: 27 });
    });

    it('rounds down toward the nearest step', () => {
      expect(roundTimeToStep(14, 22, 15)).toEqual({ hours: 14, minutes: 15 });
      expect(roundTimeToStep(14, 7, 15)).toEqual({ hours: 14, minutes: 0 });
    });

    it('rounds up toward the nearest step', () => {
      expect(roundTimeToStep(14, 23, 15)).toEqual({ hours: 14, minutes: 30 });
      expect(roundTimeToStep(14, 38, 15)).toEqual({ hours: 14, minutes: 45 });
    });

    it('ties round UP (Math.round of .5)', () => {
      // 14:23 with step=15 → halfway from 15→30 is 22.5; 14:23 > 22.5 → up to 30
      expect(roundTimeToStep(14, 23, 15)).toEqual({ hours: 14, minutes: 30 });
      // exact tie: 14:22.5 isn't representable in minutes, but 14:30 with step=60
      // → 14:30 is halfway from 14→15, rounds up to 15:00.
      expect(roundTimeToStep(14, 30, 60)).toEqual({ hours: 15, minutes: 0 });
    });

    it('leaves step-aligned values untouched', () => {
      expect(roundTimeToStep(0, 0, 15)).toEqual({ hours: 0, minutes: 0 });
      expect(roundTimeToStep(14, 30, 15)).toEqual({ hours: 14, minutes: 30 });
      expect(roundTimeToStep(23, 45, 15)).toEqual({ hours: 23, minutes: 45 });
    });

    it('clamps results to 23:59 (no overflow past end-of-day)', () => {
      // 23:59 with step=30 → rounded ~24:00, clamp to 23:59.
      expect(roundTimeToStep(23, 59, 30)).toEqual({ hours: 23, minutes: 59 });
      // 23:45 with step=60 → rounds up to 24:00, clamp to 23:59.
      expect(roundTimeToStep(23, 45, 60)).toEqual({ hours: 23, minutes: 59 });
    });

    it('rolls minutes into the next hour when appropriate', () => {
      expect(roundTimeToStep(9, 58, 5)).toEqual({ hours: 10, minutes: 0 });
    });

    it('handles uncommon steps (5 / 30 / 60)', () => {
      expect(roundTimeToStep(9, 17, 5)).toEqual({ hours: 9, minutes: 15 });
      expect(roundTimeToStep(9, 18, 5)).toEqual({ hours: 9, minutes: 20 });
      expect(roundTimeToStep(9, 14, 30)).toEqual({ hours: 9, minutes: 0 });
      expect(roundTimeToStep(9, 16, 30)).toEqual({ hours: 9, minutes: 30 });
      expect(roundTimeToStep(14, 29, 60)).toEqual({ hours: 14, minutes: 0 });
      expect(roundTimeToStep(14, 31, 60)).toEqual({ hours: 15, minutes: 0 });
    });

    it('returns 00:00 when input would round to 00:00', () => {
      expect(roundTimeToStep(0, 7, 15)).toEqual({ hours: 0, minutes: 0 });
    });
  });
});
