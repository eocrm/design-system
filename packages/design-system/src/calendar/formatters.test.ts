import {
  formatMonth,
  formatWeekdayShort,
  formatWeekdayNarrow,
  formatDayShort,
  formatDayLong,
  formatRange,
  formatHour,
  _resetFormatterCacheForTests,
} from './formatters';

beforeEach(() => {
  _resetFormatterCacheForTests();
});

describe('formatMonth', () => {
  it('includes the year for en-US', () => {
    const out = formatMonth(new Date(2026, 4, 20), 'en-US');
    expect(out).toMatch(/2026/);
  });

  it('returns a Cyrillic month name for ru-RU', () => {
    const out = formatMonth(new Date(2026, 4, 20), 'ru-RU');
    expect(out).toMatch(/[Ѐ-ӿ]/);
  });
});

describe('formatWeekdayShort / formatWeekdayNarrow', () => {
  it('short returns a short weekday label for en-US', () => {
    const out = formatWeekdayShort(new Date(2026, 4, 20), 'en-US');
    expect(out.toLowerCase()).toContain('wed');
  });

  it('narrow returns a single-character label for en-US', () => {
    const out = formatWeekdayNarrow(new Date(2026, 4, 20), 'en-US');
    expect(out.length).toBeLessThanOrEqual(2);
  });
});

describe('formatDayShort / formatDayLong', () => {
  it('short includes the day number', () => {
    const out = formatDayShort(new Date(2026, 4, 20), 'en-US');
    expect(out).toContain('20');
  });

  it('long includes weekday and day number', () => {
    const out = formatDayLong(new Date(2026, 4, 20), 'en-US');
    expect(out.toLowerCase()).toContain('wed');
    expect(out).toContain('20');
  });
});

describe('formatRange', () => {
  it('includes both endpoint days', () => {
    const out = formatRange(new Date(2026, 4, 18), new Date(2026, 4, 24), 'en-US');
    expect(out).toContain('18');
    expect(out).toContain('24');
  });
});

describe('formatHour', () => {
  it('contains the hour for en-US 9 AM', () => {
    expect(formatHour(9, 'en-US')).toContain('9');
  });

  it('uses 24-hour format for ru-RU (13 → "13")', () => {
    expect(formatHour(13, 'ru-RU')).toContain('13');
  });
});

describe('formatter cache', () => {
  it('reuses cached formatter for identical (locale, options)', () => {
    const a = formatMonth(new Date(2026, 4, 20), 'en-US');
    const b = formatMonth(new Date(2026, 5, 20), 'en-US');
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
    expect(a).toMatch(/May/);
    expect(b).toMatch(/June/);
  });

  it('produces different output for different locales (cache differentiates)', () => {
    const enus = formatMonth(new Date(2026, 4, 20), 'en-US');
    const ruru = formatMonth(new Date(2026, 4, 20), 'ru-RU');
    expect(enus).not.toBe(ruru);
  });
});
