import { renderHook } from '@testing-library/react';
import { useScrollLock } from './useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('locks body scroll on first acquire', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
  });

  it('restores body scroll when refcount drops to zero', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('second acquire while locked is a no-op (refcount only)', () => {
    const a = renderHook(() => useScrollLock(true));
    document.body.style.overflow = 'hidden'; // sanity
    const b = renderHook(() => useScrollLock(true));
    // Still locked.
    expect(document.body.style.overflow).toBe('hidden');
    b.unmount();
    // First lock still active.
    expect(document.body.style.overflow).toBe('hidden');
    a.unmount();
    // Now released.
    expect(document.body.style.overflow).toBe('');
  });

  it('restores ORIGINAL overflow value, not blank', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('active=false is a no-op', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.overflow).toBe('');
  });
});
