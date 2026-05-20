import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useDay } from './useDay';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useDay', () => {
  it('returns the Day for the requested date', () => {
    const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.day.dayOfMonth).toBe(20);
    expect(result.current.day.key).toBe('2026-05-20');
  });

  it('dayLabel and dayShortLabel are non-empty', () => {
    const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.dayLabel.length).toBeGreaterThan(0);
    expect(result.current.dayShortLabel.length).toBeGreaterThan(0);
  });

  it('localizes for ru-RU (Cyrillic in long label)', () => {
    const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.dayLabel).toMatch(/[Ѐ-ӿ]/);
  });

  it('isToday true when the input is today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 20, 12));
    try {
      const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
        wrapper: wrapWithLocale('en-US'),
      });
      expect(result.current.day.isToday).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('weekday is 0 for the locale week-start day (ru-RU: Monday)', () => {
    // 2026-05-04 is Monday
    const { result } = renderHook(() => useDay(new Date(2026, 4, 4)), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.day.weekday).toBe(0);
  });

  it('returns referentially stable day across re-renders with same input', () => {
    const date = new Date(2026, 4, 20);
    const { result, rerender } = renderHook(() => useDay(date), {
      wrapper: wrapWithLocale('en-US'),
    });
    const first = result.current.day;
    rerender();
    expect(result.current.day).toBe(first);
  });
});
