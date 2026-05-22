import { renderHook } from '@testing-library/react';
import { useModalStack, modalStack } from './useModalStack';

describe('modalStack singleton', () => {
  afterEach(() => {
    // Reset the stack between tests.
    modalStack._reset();
  });

  it('register returns 0 for the first modal, 1 for the second', () => {
    expect(modalStack.register('a')).toBe(0);
    expect(modalStack.register('b')).toBe(1);
  });

  it('unregister removes a modal from the stack', () => {
    modalStack.register('a');
    modalStack.register('b');
    modalStack.unregister('a');
    expect(modalStack.isTop('b')).toBe(true);
    expect(modalStack.depthOf('b')).toBe(0);
  });

  it('isTop returns true for the most-recently-registered modal', () => {
    modalStack.register('a');
    modalStack.register('b');
    expect(modalStack.isTop('b')).toBe(true);
    expect(modalStack.isTop('a')).toBe(false);
  });

  it('topDepth returns the current stack height', () => {
    expect(modalStack.topDepth()).toBe(0);
    modalStack.register('a');
    expect(modalStack.topDepth()).toBe(1);
    modalStack.register('b');
    expect(modalStack.topDepth()).toBe(2);
    modalStack.unregister('a');
    // 'b' is still open; topDepth reflects open count.
    expect(modalStack.topDepth()).toBe(1);
  });

  it('depthOf compacts indexes after a mid-stack unregister', () => {
    modalStack.register('a');
    modalStack.register('b');
    modalStack.register('c');
    modalStack.unregister('a');
    expect(modalStack.depthOf('b')).toBe(0);
    expect(modalStack.depthOf('c')).toBe(1);
  });
});

describe('useModalStack', () => {
  afterEach(() => {
    modalStack._reset();
  });

  it('returns null depth when active=false', () => {
    const { result } = renderHook(() => useModalStack('a', false));
    expect(result.current.depth).toBeNull();
  });

  it('registers when active goes true and returns depth', () => {
    const { result, rerender } = renderHook(({ active }) => useModalStack('a', active), {
      initialProps: { active: false },
    });
    expect(result.current.depth).toBeNull();
    rerender({ active: true });
    expect(result.current.depth).toBe(0);
  });

  it('isTop reflects current top state', () => {
    renderHook(() => useModalStack('a', true));
    const { result } = renderHook(() => useModalStack('b', true));
    // b registered second, so b is top.
    expect(result.current.isTop).toBe(true);
  });

  it('first modal isTop flips to false when a second modal registers', () => {
    const a = renderHook(() => useModalStack('a', true));
    expect(a.result.current.isTop).toBe(true);
    renderHook(() => useModalStack('b', true));
    // a must now reflect that b is on top.
    expect(a.result.current.isTop).toBe(false);
  });

  it('unregisters on unmount', () => {
    const { unmount } = renderHook(() => useModalStack('a', true));
    expect(modalStack.depthOf('a')).toBe(0);
    unmount();
    expect(modalStack.depthOf('a')).toBe(-1);
  });
});
