import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useAgenda } from './useAgenda';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useAgenda', () => {
  it('returns one day per calendar day in the inclusive range', () => {
    const { result } = renderHook(
      () => useAgenda(new Date(2026, 4, 1), new Date(2026, 4, 7)),
      { wrapper: wrapWithLocale('en-US') },
    );
    expect(result.current.days.length).toBe(7);
    expect(result.current.days[0].dayOfMonth).toBe(1);
    expect(result.current.days[6].dayOfMonth).toBe(7);
  });

  it('returns a single day when from === to', () => {
    const { result } = renderHook(
      () => useAgenda(new Date(2026, 4, 20), new Date(2026, 4, 20)),
      { wrapper: wrapWithLocale('en-US') },
    );
    expect(result.current.days.length).toBe(1);
    expect(result.current.days[0].key).toBe('2026-05-20');
  });

  it('rangeLabel includes both endpoints', () => {
    const { result } = renderHook(
      () => useAgenda(new Date(2026, 4, 1), new Date(2026, 4, 31)),
      { wrapper: wrapWithLocale('en-US') },
    );
    expect(result.current.rangeLabel).toContain('1');
    expect(result.current.rangeLabel).toContain('31');
  });

  it('handles ranges that cross month boundaries', () => {
    const { result } = renderHook(
      () => useAgenda(new Date(2026, 4, 28), new Date(2026, 5, 3)),
      { wrapper: wrapWithLocale('en-US') },
    );
    expect(result.current.days.length).toBe(7);
    expect(result.current.days[0].key).toBe('2026-05-28');
    expect(result.current.days[6].key).toBe('2026-06-03');
  });
});
