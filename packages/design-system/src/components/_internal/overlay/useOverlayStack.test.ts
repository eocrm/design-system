import { renderHook } from '@testing-library/react';
import { useOverlayStack, overlayStack } from './useOverlayStack';

describe('overlayStack singleton', () => {
  afterEach(() => {
    // Reset the stack between tests.
    overlayStack._reset();
  });

  it('register returns 0 for the first overlay, 1 for the second', () => {
    expect(overlayStack.register('a', 'replace')).toBe(0);
    expect(overlayStack.register('b', 'replace')).toBe(1);
  });

  it('unregister removes an overlay from the stack', () => {
    overlayStack.register('a', 'replace');
    overlayStack.register('b', 'replace');
    overlayStack.unregister('a');
    expect(overlayStack.isTop('b')).toBe(true);
    expect(overlayStack.depthOf('b')).toBe(0);
  });

  it('isTop returns true for the most-recently-registered overlay', () => {
    overlayStack.register('a', 'replace');
    overlayStack.register('b', 'replace');
    expect(overlayStack.isTop('b')).toBe(true);
    expect(overlayStack.isTop('a')).toBe(false);
  });

  it('topDepth returns the current stack height', () => {
    expect(overlayStack.topDepth()).toBe(0);
    overlayStack.register('a', 'replace');
    expect(overlayStack.topDepth()).toBe(1);
    overlayStack.register('b', 'replace');
    expect(overlayStack.topDepth()).toBe(2);
    overlayStack.unregister('a');
    // 'b' is still open; topDepth reflects open count.
    expect(overlayStack.topDepth()).toBe(1);
  });

  it('depthOf compacts indexes after a mid-stack unregister', () => {
    overlayStack.register('a', 'replace');
    overlayStack.register('b', 'replace');
    overlayStack.register('c', 'replace');
    overlayStack.unregister('a');
    expect(overlayStack.depthOf('b')).toBe(0);
    expect(overlayStack.depthOf('c')).toBe(1);
  });

  it('topMode reflects the top entry', () => {
    overlayStack.register('a', 'overlay');
    expect(overlayStack.topMode()).toBe('overlay');
    overlayStack.register('b', 'replace');
    expect(overlayStack.topMode()).toBe('replace');
  });

  it('topMode returns null when stack is empty', () => {
    expect(overlayStack.topMode()).toBeNull();
  });
});

describe('useOverlayStack', () => {
  afterEach(() => {
    overlayStack._reset();
  });

  it('returns null depth when active=false', () => {
    const { result } = renderHook(() => useOverlayStack('a', false, 'replace'));
    expect(result.current.depth).toBeNull();
  });

  it('registers when active goes true and returns depth', () => {
    const { result, rerender } = renderHook(({ active }) => useOverlayStack('a', active, 'replace'), {
      initialProps: { active: false },
    });
    expect(result.current.depth).toBeNull();
    rerender({ active: true });
    expect(result.current.depth).toBe(0);
  });

  it('isTop reflects current top state', () => {
    renderHook(() => useOverlayStack('a', true, 'replace'));
    const { result } = renderHook(() => useOverlayStack('b', true, 'replace'));
    // b registered second, so b is top.
    expect(result.current.isTop).toBe(true);
  });

  it('first overlay isTop flips to false when a second overlay registers', () => {
    const a = renderHook(() => useOverlayStack('a', true, 'replace'));
    expect(a.result.current.isTop).toBe(true);
    renderHook(() => useOverlayStack('b', true, 'replace'));
    // a must now reflect that b is on top.
    expect(a.result.current.isTop).toBe(false);
  });

  it('unregisters on unmount', () => {
    const { unmount } = renderHook(() => useOverlayStack('a', true, 'replace'));
    expect(overlayStack.depthOf('a')).toBe(0);
    unmount();
    expect(overlayStack.depthOf('a')).toBe(-1);
  });
});
