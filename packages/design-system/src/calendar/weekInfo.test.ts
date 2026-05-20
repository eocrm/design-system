import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';

describe('getFirstDayOfWeek', () => {
  it('returns Sunday (0) for en-US', () => {
    expect(getFirstDayOfWeek('en-US')).toBe(0);
  });

  it('returns Monday (1) for ru-RU', () => {
    expect(getFirstDayOfWeek('ru-RU')).toBe(1);
  });

  it('returns Monday (1) for de-DE', () => {
    expect(getFirstDayOfWeek('de-DE')).toBe(1);
  });

  it('falls back to Monday for an unknown locale', () => {
    expect(getFirstDayOfWeek('xx-YY')).toBe(1);
  });

  it('uses the static fallback when Intl.Locale.getWeekInfo is missing', () => {
    const orig = (Intl.Locale.prototype as { getWeekInfo?: unknown }).getWeekInfo;
    // @ts-expect-error — intentionally delete to simulate older runtime
    delete Intl.Locale.prototype.getWeekInfo;
    try {
      expect(getFirstDayOfWeek('en-US')).toBe(0);
      expect(getFirstDayOfWeek('ru-RU')).toBe(1);
    } finally {
      // @ts-expect-error — restore
      Intl.Locale.prototype.getWeekInfo = orig;
    }
  });
});

describe('getWeekendDays', () => {
  it('returns [0, 6] for en-US (Sat/Sun)', () => {
    expect(getWeekendDays('en-US')).toEqual([0, 6]);
  });

  it('returns [5, 6] for ar-SA (Fri/Sat)', () => {
    expect(getWeekendDays('ar-SA')).toEqual([5, 6]);
  });

  it('falls back to [0, 6] for unknown locales', () => {
    expect(getWeekendDays('xx-YY')).toEqual([0, 6]);
  });

  it('uses the static fallback when Intl.Locale.getWeekInfo is missing', () => {
    const orig = (Intl.Locale.prototype as { getWeekInfo?: unknown }).getWeekInfo;
    // @ts-expect-error — intentionally delete
    delete Intl.Locale.prototype.getWeekInfo;
    try {
      expect(getWeekendDays('ar-SA')).toEqual([5, 6]);
      expect(getWeekendDays('en-US')).toEqual([0, 6]);
    } finally {
      // @ts-expect-error — restore
      Intl.Locale.prototype.getWeekInfo = orig;
    }
  });
});
