import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useWeek } from './useWeek';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useWeek', () => {
  it('returns exactly 7 days', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.days.length).toBe(7);
  });

  it('first day matches the locale week-start (en-US → Sunday)', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.days[0].date.getDay()).toBe(0);
  });

  it('first day is Monday for ru-RU', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.days[0].date.getDay()).toBe(1);
  });

  it('weekStartsOn override wins over locale default', () => {
    const { result } = renderHook(
      () => useWeek(new Date(2026, 4, 20), { weekStartsOn: 0 }),
      { wrapper: wrapWithLocale('ru-RU') },
    );
    expect(result.current.days[0].date.getDay()).toBe(0);
  });

  it('weekLabel is a non-empty localized string', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weekLabel.length).toBeGreaterThan(0);
  });

  it('weekdayLabels has 7 entries', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weekdayLabels.length).toBe(7);
  });

  it('all 7 days are in calendar order (each 1 day after the previous)', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const days = result.current.days;
    for (let i = 1; i < 7; i++) {
      const diff = (days[i].date.getTime() - days[i - 1].date.getTime()) / 86_400_000;
      expect(Math.round(diff)).toBe(1);
    }
  });
});
