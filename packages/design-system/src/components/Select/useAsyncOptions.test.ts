import { act, configure, renderHook } from '@testing-library/react';
import { useAsyncOptions } from './useAsyncOptions';
import type { SelectOptions } from './Select';

const A: SelectOptions = [{ value: 'a', label: 'A' }];
const B: SelectOptions = [{ value: 'b', label: 'B' }];

describe('useAsyncOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // RTL's waitFor polls via setInterval; under fake timers the interval
    // never ticks unless we advance timers. The asyncWrapper drains a
    // microtask + setTimeout(0) on each yield so waitFor's poll fires.
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    configure({ asyncWrapper: async (cb) => cb() });
  });

  it('does NOT call loadOptions until enabled=true (loadOnOpen gate)', async () => {
    const loadOptions = vi.fn(async () => A);
    renderHook(() => useAsyncOptions({ loadOptions, query: '', enabled: false, debounceMs: 100 }));
    await vi.advanceTimersByTimeAsync(200);
    expect(loadOptions).not.toHaveBeenCalled();
  });

  it('calls loadOptions("") on first enable', async () => {
    const loadOptions = vi.fn(async (_q: string, _signal: AbortSignal) => A);
    const { result, rerender } = renderHook(
      ({ enabled }) => useAsyncOptions({ loadOptions, query: '', enabled, debounceMs: 100 }),
      { initialProps: { enabled: false } },
    );
    rerender({ enabled: true });
    // Drain the debounce window, then run all pending timers/microtasks so
    // the loadOptions promise resolution settles into state before assert.
    // The state updates fire from the promise resolution, so the timer
    // advance must run inside `act()` to keep RTL happy.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
      await vi.runAllTimersAsync();
    });
    expect(loadOptions).toHaveBeenCalledTimes(1);
    expect(loadOptions.mock.calls[0][0]).toBe('');
    expect(result.current.options).toEqual(A);
  });

  it('debounces query changes', async () => {
    const loadOptions = vi.fn(async (q: string) => (q === 'b' ? B : A));
    const { rerender } = renderHook(
      ({ query }) => useAsyncOptions({ loadOptions, query, enabled: true, debounceMs: 100 }),
      { initialProps: { query: '' } },
    );
    await vi.advanceTimersByTimeAsync(150);
    expect(loadOptions).toHaveBeenCalledTimes(1);
    rerender({ query: 'b' });
    await vi.advanceTimersByTimeAsync(50);
    expect(loadOptions).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60);
    expect(loadOptions).toHaveBeenCalledTimes(2);
    expect(loadOptions.mock.calls[1][0]).toBe('b');
  });

  it('aborts the previous request when query changes mid-flight', async () => {
    const signals: AbortSignal[] = [];
    const loadOptions = vi.fn(async (_q: string, signal: AbortSignal) => {
      signals.push(signal);
      await new Promise((res) => setTimeout(res, 10000));
      return A;
    });
    const { rerender } = renderHook(
      ({ query }) => useAsyncOptions({ loadOptions, query, enabled: true, debounceMs: 100 }),
      { initialProps: { query: '' } },
    );
    await vi.advanceTimersByTimeAsync(150);
    expect(signals).toHaveLength(1);
    rerender({ query: 'b' });
    await vi.advanceTimersByTimeAsync(150);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('renders error state on rejection (non-abort)', async () => {
    const loadOptions = vi.fn(async () => {
      throw new Error('boom');
    });
    const { result } = renderHook(() =>
      useAsyncOptions({ loadOptions, query: '', enabled: true, debounceMs: 0 }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
      await vi.runAllTimersAsync();
    });
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.loading).toBe(false);
  });
});
