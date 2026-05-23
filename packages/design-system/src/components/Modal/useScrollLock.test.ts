import { renderHook } from '@testing-library/react';
import { useScrollLock } from './useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    // Reset body styles that the lock manipulates.
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    // Reset scroll position (jsdom supports this).
    window.scrollTo(0, 0);
  });

  it('locks body scroll on first acquire (position: fixed)', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
  });

  it('restores body position and scroll when refcount drops to zero', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    unmount();
    expect(document.body.style.position).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.left).toBe('');
    expect(document.body.style.width).toBe('');
  });

  it('second acquire while locked is a no-op (refcount only)', () => {
    const a = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    const b = renderHook(() => useScrollLock(true));
    // Still locked.
    expect(document.body.style.position).toBe('fixed');
    b.unmount();
    // First lock still active.
    expect(document.body.style.position).toBe('fixed');
    a.unmount();
    // Now released.
    expect(document.body.style.position).toBe('');
  });

  it('restores ORIGINAL position and overflow values, not blank', () => {
    document.body.style.overflow = 'scroll';
    document.body.style.position = 'relative';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.position).toBe('relative');
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('active=false is a no-op', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.position).toBe('');
    expect(document.body.style.overflow).toBe('');
  });

  it('pads body-right by the disappearing scrollbar width to prevent layout shift', () => {
    // Simulate a vertical scrollbar of 17px by making window.innerWidth
    // 17 wider than documentElement.clientWidth.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1183,
    });

    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.paddingRight).toBe('17px');
    unmount();
    expect(document.body.style.paddingRight).toBe('');

    // Restore.
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

  it('saves scroll position on lock and restores it on unlock', () => {
    // Simulate the page being scrolled before the modal opens.
    // jsdom supports window.scrollTo but scrollY/scrollX stay 0 in the test
    // environment; we patch them to simulate a real scroll position.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 50 });

    const { unmount } = renderHook(() => useScrollLock(true));
    // Body should be offset to counteract the scroll visually.
    expect(document.body.style.top).toBe('-300px');
    expect(document.body.style.left).toBe('-50px');

    // Track what scrollTo is called with on unlock.
    const spy = vi.spyOn(window, 'scrollTo');

    unmount();
    expect(spy).toHaveBeenCalledWith({ left: 50, top: 300, behavior: 'instant' });
    spy.mockRestore();

    // Restore patched values.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 });
  });
});
