import { renderHook } from '@testing-library/react';
import { useScrollLock } from './useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('locks scroll on first acquire (overflow: hidden on html and body)', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
  });

  it('restores scroll when refcount drops to zero', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.documentElement.style.overflow).toBe('hidden');
    unmount();
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  it('second acquire while locked is a no-op (refcount only)', () => {
    const a = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    const b = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    b.unmount();
    // First lock still active.
    expect(document.body.style.overflow).toBe('hidden');
    a.unmount();
    // Now released.
    expect(document.body.style.overflow).toBe('');
  });

  it('restores ORIGINAL overflow values, not blank', () => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('active=false is a no-op', () => {
    renderHook(() => useScrollLock(false));
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  it('pads body-right by the disappearing scrollbar width to prevent layout shift', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1183,
    });

    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.paddingRight).toBe('17px');
    unmount();
    expect(document.body.style.paddingRight).toBe('');

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1024,
    });
  });

  it('does not pad when no scrollbar is present (innerWidth === clientWidth)', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 390,
    });

    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.paddingRight).toBe('');
    unmount();
  });
});
