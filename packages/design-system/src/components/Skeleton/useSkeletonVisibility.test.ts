import { act, renderHook } from '@testing-library/react';
import { useSkeletonVisibility } from './useSkeletonVisibility';

describe('useSkeletonVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T12:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('is immediately visible while loading when no delay is configured', () => {
    const { result, unmount } = renderHook(() => useSkeletonVisibility(true));

    expect(result.current).toBe(true);
    unmount();
  });

  it('cancels a pending display when loading finishes inside the delay', () => {
    let loading = true;
    const { result, rerender, unmount } = renderHook(() =>
      useSkeletonVisibility(loading, { delay: 200 }),
    );

    act(() => vi.advanceTimersByTime(100));
    loading = false;
    rerender();
    act(() => vi.advanceTimersByTime(100));

    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it('becomes visible only after the configured delay', () => {
    const { result, unmount } = renderHook(() => useSkeletonVisibility(true, { delay: 200 }));

    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    unmount();
  });

  it('remains visible until the minimum duration has elapsed', () => {
    let loading = true;
    const { result, rerender, unmount } = renderHook(() =>
      useSkeletonVisibility(loading, { delay: 100, minDuration: 300 }),
    );

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(50));
    loading = false;
    rerender();

    act(() => vi.advanceTimersByTime(249));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
    unmount();
  });

  it.each([0, -100])('normalizes a %dms delay and minimum duration to zero', (duration) => {
    let loading = true;
    const { result, rerender, unmount } = renderHook(() =>
      useSkeletonVisibility(loading, { delay: duration, minDuration: duration }),
    );

    expect(result.current).toBe(true);

    loading = false;
    rerender();
    expect(result.current).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it('restarts the full delay for a new loading cycle after cancellation', () => {
    let loading = true;
    const { result, rerender, unmount } = renderHook(() =>
      useSkeletonVisibility(loading, { delay: 200 }),
    );

    act(() => vi.advanceTimersByTime(100));
    loading = false;
    rerender();

    loading = true;
    rerender();
    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    unmount();
  });

  it('clears a pending timer when its consumer unmounts', () => {
    const { unmount } = renderHook(() => useSkeletonVisibility(true, { delay: 200 }));
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
