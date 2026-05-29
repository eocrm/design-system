import {
  autoSwapRange,
  clampRangeEndAfterStart,
  formatDateRange,
  formatDateTimeRange,
  parseDateRange,
  parseDateTimeRange,
} from './utils';

describe('DateRangePicker utils', () => {
  describe('autoSwapRange', () => {
    it('returns the pair unchanged when start <= end', () => {
      const r = autoSwapRange(new Date(2026, 4, 5), new Date(2026, 4, 10));
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(10);
    });

    it('swaps when end < start', () => {
      const r = autoSwapRange(new Date(2026, 4, 10), new Date(2026, 4, 5));
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(10);
    });

    it('returns equal dates for same-day pair (single-day range)', () => {
      const same = new Date(2026, 4, 5);
      const r = autoSwapRange(same, same);
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(5);
    });

    it('ignores time-of-day (day-granular)', () => {
      const a = new Date(2026, 4, 5, 23, 59);
      const b = new Date(2026, 4, 5, 0, 0);
      const r = autoSwapRange(a, b);
      // Same day — autoSwapRange returns { start: a, end: b } deterministically
      // (startOfDay normalizes both to midnight; the equality branch picks a as start).
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(5);
    });
  });

  describe('formatDateRange', () => {
    it('formats en-US as MM/DD/YYYY — MM/DD/YYYY', () => {
      expect(
        formatDateRange({ start: new Date(2026, 4, 21), end: new Date(2026, 5, 4) }, 'en-US'),
      ).toBe('05/21/2026 — 06/04/2026');
    });

    it('formats ru-RU as DD.MM.YYYY — DD.MM.YYYY', () => {
      expect(
        formatDateRange({ start: new Date(2026, 4, 21), end: new Date(2026, 5, 4) }, 'ru-RU'),
      ).toBe('21.05.2026 — 04.06.2026');
    });

    it('single-day range still renders both halves', () => {
      const same = new Date(2026, 4, 21);
      expect(formatDateRange({ start: same, end: same }, 'en-US')).toBe('05/21/2026 — 05/21/2026');
    });
  });

  describe('parseDateRange', () => {
    it('returns null for empty / whitespace input', () => {
      expect(parseDateRange('', 'en-US')).toBeNull();
      expect(parseDateRange('   ', 'en-US')).toBeNull();
    });

    it('parses en-US with em dash', () => {
      const r = parseDateRange('5/21/2026 — 6/4/2026', 'en-US');
      expect(r).not.toBeNull();
      expect(r!.start.getDate()).toBe(21);
      expect(r!.end.getDate()).toBe(4);
      expect(r!.end.getMonth()).toBe(5); // June
    });

    it('parses em-dash without surrounding spaces', () => {
      const r = parseDateRange('5/21/2026—6/4/2026', 'en-US');
      expect(r!.start.getDate()).toBe(21);
      expect(r!.end.getDate()).toBe(4);
    });

    it('parses with en dash', () => {
      const r = parseDateRange('5/21/2026 – 6/4/2026', 'en-US');
      expect(r!.start.getDate()).toBe(21);
      expect(r!.end.getDate()).toBe(4);
    });

    it('parses with hyphen-with-spaces', () => {
      const r = parseDateRange('5/21/2026 - 6/4/2026', 'en-US');
      expect(r!.start.getDate()).toBe(21);
    });

    it('parses with " to " word separator (case-insensitive)', () => {
      const r1 = parseDateRange('5/21/2026 to 6/4/2026', 'en-US');
      const r2 = parseDateRange('5/21/2026 TO 6/4/2026', 'en-US');
      const r3 = parseDateRange('5/21/2026 To 6/4/2026', 'en-US');
      expect(r1!.start.getDate()).toBe(21);
      expect(r2!.start.getDate()).toBe(21);
      expect(r3!.start.getDate()).toBe(21);
    });

    it('parses ru-RU with hyphen-with-spaces', () => {
      const r = parseDateRange('21.5.2026 - 4.6.2026', 'ru-RU');
      expect(r!.start.getDate()).toBe(21);
      expect(r!.start.getMonth()).toBe(4);
      expect(r!.end.getDate()).toBe(4);
      expect(r!.end.getMonth()).toBe(5);
    });

    it('auto-swaps out-of-order typed input', () => {
      const r = parseDateRange('6/4/2026 — 5/21/2026', 'en-US');
      expect(r!.start.getDate()).toBe(21); // May 21 is earlier
      expect(r!.end.getDate()).toBe(4); // Jun 4 is later
    });

    it('returns null when one half is unparseable', () => {
      expect(parseDateRange('5/21/2026 — junk', 'en-US')).toBeNull();
      expect(parseDateRange('junk — 6/4/2026', 'en-US')).toBeNull();
    });

    it('returns null when no separator is found', () => {
      expect(parseDateRange('5/21/2026 6/4/2026', 'en-US')).toBeNull();
    });

    it('returns null when three chunks (multiple separators)', () => {
      // JS split without a limit returns ALL chunks — two em dashes produce
      // three elements, not two. length === 2 check fails, no separator
      // matches, function returns null.
      expect(parseDateRange('5/21/2026 — 6/4/2026 — 7/1/2026', 'en-US')).toBeNull();
    });
  });

  describe('formatDateTimeRange', () => {
    it('joins start/end with em dash', () => {
      expect(
        formatDateTimeRange(
          { start: new Date(2026, 4, 28, 9, 0), end: new Date(2026, 4, 29, 17, 30) },
          'en-US',
        ),
      ).toBe('05/28/2026 09:00 — 05/29/2026 17:30');
    });
    it('defaults to 24-hour when cycle arg is omitted (back-compat)', () => {
      expect(
        formatDateTimeRange(
          { start: new Date(2026, 4, 28, 14, 0), end: new Date(2026, 4, 29, 1, 30) },
          'en-US',
        ),
      ).toBe('05/28/2026 14:00 — 05/29/2026 01:30');
    });
    it("renders AM/PM on both halves when cycle='12'", () => {
      expect(
        formatDateTimeRange(
          { start: new Date(2026, 4, 28, 9, 0), end: new Date(2026, 4, 29, 17, 30) },
          'en-US',
          '12',
        ),
      ).toBe('05/28/2026 9:00 AM — 05/29/2026 5:30 PM');
    });
    it("preserves 24-hour output when cycle='24' is explicit", () => {
      expect(
        formatDateTimeRange(
          { start: new Date(2026, 4, 28, 9, 0), end: new Date(2026, 4, 29, 17, 30) },
          'en-US',
          '24',
        ),
      ).toBe('05/28/2026 09:00 — 05/29/2026 17:30');
    });
  });

  describe('parseDateTimeRange', () => {
    it('parses ISO datetime range with em dash', () => {
      const r = parseDateTimeRange('2026-05-28T09:00 — 2026-05-29T17:30', 'en-US');
      expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
      expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
    });
    it('parses locale-formatted datetime range with em dash', () => {
      const r = parseDateTimeRange('05/28/2026 09:00 — 05/29/2026 17:30', 'en-US');
      expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
      expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
    });
    it('auto-swaps out-of-order pairs', () => {
      const r = parseDateTimeRange('05/29/2026 17:30 — 05/28/2026 09:00', 'en-US');
      expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
      expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
    });
    it('returns null when either half fails to parse', () => {
      expect(parseDateTimeRange('garbage — 05/29/2026 09:00', 'en-US')).toBeNull();
    });
    it('parses locale-formatted datetime range with AM/PM tails on both halves', () => {
      const r = parseDateTimeRange('05/28/2026 9:00 AM — 05/29/2026 5:30 PM', 'en-US');
      expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
      expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
    });
    it('parses mixed 24h + AM/PM tails (lenient)', () => {
      const r = parseDateTimeRange('05/28/2026 09:00 — 05/29/2026 5:30 PM', 'en-US');
      expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
      expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
    });
  });

  describe('clampRangeEndAfterStart', () => {
    it('clamps end-time to start-time when same day end < start', () => {
      const range = {
        start: new Date(2026, 4, 28, 14, 0),
        end: new Date(2026, 4, 28, 10, 0),
      };
      const out = clampRangeEndAfterStart(range);
      expect(out.end.getHours()).toBe(14);
      expect(out.end.getMinutes()).toBe(0);
    });
    it('no-op when same day end >= start', () => {
      const range = {
        start: new Date(2026, 4, 28, 9, 0),
        end: new Date(2026, 4, 28, 17, 0),
      };
      expect(clampRangeEndAfterStart(range)).toBe(range);
    });
    it('no-op when different days', () => {
      const range = {
        start: new Date(2026, 4, 28, 14, 0),
        end: new Date(2026, 4, 29, 10, 0),
      };
      expect(clampRangeEndAfterStart(range)).toBe(range);
    });
  });
});
