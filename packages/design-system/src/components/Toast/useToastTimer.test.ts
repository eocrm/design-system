import { renderHook, act } from '@testing-library/react';
import { useToastTimer } from './useToastTimer';

describe('useToastTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onExpire after `duration` ms when not paused', () => {
    const onExpire = vi.fn();
    renderHook(() =>
      useToastTimer({
        id: 'a',
        duration: 1000,
        paused: false,
        onExpire,
        getVisible: () => true,
      }),
    );
    expect(onExpire).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('never calls onExpire when duration is persistent', () => {
    const onExpire = vi.fn();
    renderHook(() =>
      useToastTimer({
        id: 'a',
        duration: 'persistent',
        paused: false,
        onExpire,
        getVisible: () => true,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(100_000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('pause captures remaining; resume re-arms with that remaining', () => {
    const onExpire = vi.fn();
    const { rerender } = renderHook(
      ({ paused }) =>
        useToastTimer({
          id: 'a',
          duration: 1000,
          paused,
          onExpire,
          getVisible: () => true,
        }),
      { initialProps: { paused: false } },
    );

    act(() => vi.advanceTimersByTime(400));
    expect(onExpire).not.toHaveBeenCalled();

    rerender({ paused: true });
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).not.toHaveBeenCalled();

    rerender({ paused: false });
    // Only 600ms should remain.
    act(() => vi.advanceTimersByTime(599));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('paused at mount: no timer running until paused flips false', () => {
    const onExpire = vi.fn();
    const { rerender } = renderHook(
      ({ paused }) =>
        useToastTimer({
          id: 'a',
          duration: 500,
          paused,
          onExpire,
          getVisible: () => true,
        }),
      { initialProps: { paused: true } },
    );
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).not.toHaveBeenCalled();

    rerender({ paused: false });
    act(() => vi.advanceTimersByTime(500));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('hidden document acts like paused', () => {
    const onExpire = vi.fn();
    let visible = false;
    const { rerender: _ } = renderHook(() =>
      useToastTimer({
        id: 'a',
        duration: 1000,
        paused: false,
        onExpire,
        getVisible: () => visible,
      }),
    );
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).not.toHaveBeenCalled();

    visible = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('unmount clears the timer and visibility listener', () => {
    const onExpire = vi.fn();
    const { unmount } = renderHook(() =>
      useToastTimer({
        id: 'a',
        duration: 1000,
        paused: false,
        onExpire,
        getVisible: () => true,
      }),
    );
    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('changing duration mid-life resets the remaining (and re-arms if not paused)', () => {
    const onExpire = vi.fn();
    const { rerender } = renderHook(
      ({ duration }) =>
        useToastTimer({
          id: 'a',
          duration,
          paused: false,
          onExpire,
          getVisible: () => true,
        }),
      { initialProps: { duration: 1000 } },
    );
    act(() => vi.advanceTimersByTime(500));
    rerender({ duration: 2000 });
    // Old 500 is forgotten; new full 2000 should elapse before expire.
    act(() => vi.advanceTimersByTime(1999));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
