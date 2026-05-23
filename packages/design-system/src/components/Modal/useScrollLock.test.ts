import { renderHook } from '@testing-library/react';
import { useScrollLock } from './useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 });
  });

  it('pins body to position:fixed on first acquire', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.width).toBe('100%');
    unmount();
  });

  it('restores body styles when refcount drops to zero', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    unmount();
    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.left).toBe('');
    expect(document.body.style.width).toBe('');
  });

  it('second acquire while locked is a no-op (refcount only)', () => {
    const a = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    const b = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    b.unmount();
    expect(document.body.style.position).toBe('fixed');
    a.unmount();
    expect(document.body.style.position).toBe('');
  });

  it('restores ORIGINAL body position value, not blank', () => {
    document.body.style.position = 'relative';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    unmount();
    expect(document.body.style.position).toBe('relative');
  });

  it('active=false is a no-op', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.position).toBe('');
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

  it('captures scroll position into body offsets and restores on unlock via scrollTo', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 50 });

    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.top).toBe('-300px');
    expect(document.body.style.left).toBe('-50px');

    const spy = vi.spyOn(window, 'scrollTo');
    unmount();
    expect(spy).toHaveBeenCalledWith({ left: 50, top: 300, behavior: 'instant' });
    spy.mockRestore();
  });
});
