import { autoSwapRange, formatDateRange, parseDateRange } from './utils';

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
      // Same day, either may be start; both halves are May 5.
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(5);
    });
  });

  describe('formatDateRange', () => {
    it('formats en-US as MM/DD/YYYY — MM/DD/YYYY', () => {
      expect(
        formatDateRange(
          { start: new Date(2026, 4, 21), end: new Date(2026, 5, 4) },
          'en-US',
        ),
      ).toBe('05/21/2026 — 06/04/2026');
    });

    it('formats ru-RU as DD.MM.YYYY — DD.MM.YYYY', () => {
      expect(
        formatDateRange(
          { start: new Date(2026, 4, 21), end: new Date(2026, 5, 4) },
          'ru-RU',
        ),
      ).toBe('21.05.2026 — 04.06.2026');
    });

    it('single-day range still renders both halves', () => {
      const same = new Date(2026, 4, 21);
      expect(formatDateRange({ start: same, end: same }, 'en-US')).toBe(
        '05/21/2026 — 05/21/2026',
      );
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
      expect(r1!.start.getDate()).toBe(21);
      expect(r2!.start.getDate()).toBe(21);
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
      // The split takes the FIRST occurrence — if there are two em dashes
      // separating three chunks, the first split is 2-way: ["5/21", "6/4 — 7/1"].
      // The right half then fails to parse because it contains an embedded
      // em dash. So the function returns null.
      expect(parseDateRange('5/21/2026 — 6/4/2026 — 7/1/2026', 'en-US')).toBeNull();
    });
  });
});
