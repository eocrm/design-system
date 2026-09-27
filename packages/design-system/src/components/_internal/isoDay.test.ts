import { formatIsoDay, formatIsoRange, parseIsoDay } from './isoDay';

describe('isoDay', () => {
  it('parses to UTC midnight', () => {
    expect(parseIsoDay('2026-10-07').toISOString()).toBe('2026-10-07T00:00:00.000Z');
  });

  it('throws on malformed input', () => {
    expect(() => parseIsoDay('2026-10-7')).toThrow("expected 'YYYY-MM-DD'");
    expect(() => parseIsoDay('07/10/2026')).toThrow();
  });

  it('formats the calendar day regardless of the host timezone', () => {
    // UTC formatting: the 7th is the 7th even where local time is behind UTC.
    expect(formatIsoDay('2026-10-07', 'en-US', { day: 'numeric' })).toBe('7');
    expect(formatIsoDay('2026-10-07', 'en-US', { weekday: 'short' })).toBe('Wed');
    expect(
      formatIsoDay('2026-10-07', 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    ).toBe('Wednesday, October 7');
  });

  it('collapses a single-month range and spans months / years', () => {
    const month = { month: 'long', year: 'numeric' } as const;
    expect(formatIsoRange('2026-10-05', '2026-10-11', 'en-US', month)).toBe('October 2026');
    expect(formatIsoRange('2026-09-28', '2026-10-04', 'en-US', month)).toMatch(
      /^September\s*–\s*October 2026$/,
    );
    expect(formatIsoRange('2026-12-28', '2027-01-03', 'en-US', month)).toMatch(
      /^December 2026\s*–\s*January 2027$/,
    );
    expect(formatIsoRange('2026-10-07', '2026-10-07', 'en-US', month)).toBe('October 2026');
  });

  it('localizes (ru)', () => {
    expect(
      formatIsoRange('2026-10-05', '2026-10-11', 'ru-RU', { month: 'long', year: 'numeric' }),
    ).toMatch(/^октябрь 2026/);
  });
});
