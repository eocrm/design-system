import { renderHook } from '@testing-library/react';
import { useModalStack, modalStack } from './useModalStack';

describe('modalStack singleton', () => {
  afterEach(() => {
    // Reset the stack between tests.
    modalStack._reset();
  });

  it('register returns 0 for the first modal, 1 for the second', () => {
    expect(modalStack.register('a', 'replace')).toBe(0);
    expect(modalStack.register('b', 'replace')).toBe(1);
  });

  it('unregister removes a modal from the stack', () => {
    modalStack.register('a', 'replace');
    modalStack.register('b', 'replace');
    modalStack.unregister('a');
    expect(modalStack.isTop('b')).toBe(true);
    expect(modalStack.depthOf('b')).toBe(0);
  });

  it('isTop returns true for the most-recently-registered modal', () => {
    modalStack.register('a', 'replace');
    modalStack.register('b', 'replace');
    expect(modalStack.isTop('b')).toBe(true);
    expect(modalStack.isTop('a')).toBe(false);
  });

  it('topDepth returns the current stack height', () => {
    expect(modalStack.topDepth()).toBe(0);
    modalStack.register('a', 'replace');
    expect(modalStack.topDepth()).toBe(1);
    modalStack.register('b', 'replace');
    expect(modalStack.topDepth()).toBe(2);
    modalStack.unregister('a');
    // 'b' is still open; topDepth reflects open count.
    expect(modalStack.topDepth()).toBe(1);
  });

  it('depthOf compacts indexes after a mid-stack unregister', () => {
    modalStack.register('a', 'replace');
    modalStack.register('b', 'replace');
    modalStack.register('c', 'replace');
    modalStack.unregister('a');
    expect(modalStack.depthOf('b')).toBe(0);
    expect(modalStack.depthOf('c')).toBe(1);
  });

  it('topMode reflects the top entry', () => {
    modalStack.register('a', 'overlay');
    expect(modalStack.topMode()).toBe('overlay');
    modalStack.register('b', 'replace');
    expect(modalStack.topMode()).toBe('replace');
  });

  it('topMode returns null when stack is empty', () => {
    expect(modalStack.topMode()).toBeNull();
  });
});

describe('useModalStack', () => {
  afterEach(() => {
    modalStack._reset();
  });

  it('returns null depth when active=false', () => {
    const { result } = renderHook(() => useModalStack('a', false, 'replace'));
    expect(result.current.depth).toBeNull();
  });

  it('registers when active goes true and returns depth', () => {
    const { result, rerender } = renderHook(({ active }) => useModalStack('a', active, 'replace'), {
      initialProps: { active: false },
    });
    expect(result.current.depth).toBeNull();
    rerender({ active: true });
    expect(result.current.depth).toBe(0);
  });

  it('isTop reflects current top state', () => {
    renderHook(() => useModalStack('a', true, 'replace'));
    const { result } = renderHook(() => useModalStack('b', true, 'replace'));
    // b registered second, so b is top.
    expect(result.current.isTop).toBe(true);
  });

  it('first modal isTop flips to false when a second modal registers', () => {
    const a = renderHook(() => useModalStack('a', true, 'replace'));
    expect(a.result.current.isTop).toBe(true);
    renderHook(() => useModalStack('b', true, 'replace'));
    // a must now reflect that b is on top.
    expect(a.result.current.isTop).toBe(false);
  });

  it('unregisters on unmount', () => {
    const { unmount } = renderHook(() => useModalStack('a', true, 'replace'));
    expect(modalStack.depthOf('a')).toBe(0);
    unmount();
    expect(modalStack.depthOf('a')).toBe(-1);
  });
});
