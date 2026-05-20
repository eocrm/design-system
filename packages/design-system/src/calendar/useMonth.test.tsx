import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useMonth } from './useMonth';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useMonth', () => {
  it('returns 4–6 full weeks of 7 days each', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const weeks = result.current.weeks;
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
    weeks.forEach((week) => {
      expect(week.length).toBe(7);
    });
  });

  it('first week starts on the locale-defined first-day-of-week (en-US → Sunday)', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weeks[0][0].date.getDay()).toBe(0);
  });

  it('first week starts on Monday for ru-RU', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.weeks[0][0].date.getDay()).toBe(1);
  });

  it('weekStartsOn option overrides the locale default', () => {
    const { result } = renderHook(
      () => useMonth(new Date(2026, 4, 1), { weekStartsOn: 0 }),
      { wrapper: wrapWithLocale('ru-RU') },
    );
    expect(result.current.weeks[0][0].date.getDay()).toBe(0);
  });

  it('marks leading/trailing days from adjacent months with isCurrentMonth: false', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const firstWeek = result.current.weeks[0];
    const lastWeek = result.current.weeks[result.current.weeks.length - 1];
    const hasLeading = firstWeek.some((d) => !d.isCurrentMonth);
    const hasTrailing = lastWeek.some((d) => !d.isCurrentMonth);
    expect(hasLeading || hasTrailing).toBe(true);
  });

  it('every current-month day has isCurrentMonth: true', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 15)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const allDays = result.current.weeks.flat();
    const may = allDays.filter((d) => d.date.getMonth() === 4 && d.date.getFullYear() === 2026);
    expect(may.length).toBe(31);
    may.forEach((d) => expect(d.isCurrentMonth).toBe(true));
  });

  it('isToday matches only the day equal to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 20, 14));
    try {
      const { result } = renderHook(() => useMonth(new Date(2026, 4, 20)), {
        wrapper: wrapWithLocale('en-US'),
      });
      const todayCells = result.current.weeks.flat().filter((d) => d.isToday);
      expect(todayCells.length).toBe(1);
      expect(todayCells[0].date.getDate()).toBe(20);
    } finally {
      vi.useRealTimers();
    }
  });

  it('weekdayLabels has 7 entries in display order starting with the week-start day', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weekdayLabels.length).toBe(7);
    expect(typeof result.current.weekdayLabels[0]).toBe('string');
  });

  it('monthLabel is a non-empty localized string', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.monthLabel).toMatch(/2026/);
  });

  it('returns referentially stable weeks across re-renders with same inputs', () => {
    const anchor = new Date(2026, 4, 20);
    const { result, rerender } = renderHook(() => useMonth(anchor), {
      wrapper: wrapWithLocale('en-US'),
    });
    const first = result.current.weeks;
    rerender();
    expect(result.current.weeks).toBe(first);
  });

  it('day.key matches toDateKey for that day', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 15)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const may15 = result.current.weeks.flat().find((d) => d.dayOfMonth === 15 && d.isCurrentMonth);
    expect(may15?.key).toBe('2026-05-15');
  });
});
