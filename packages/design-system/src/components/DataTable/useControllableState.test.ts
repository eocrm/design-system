import { renderHook, act } from '@testing-library/react';
import { useControllableState } from './useControllableState';

describe('useControllableState', () => {
  it('uses defaultValue when uncontrolled', () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: 5 }));
    expect(result.current[0]).toBe(5);
  });

  it('uses value when controlled (ignores default)', () => {
    const { result } = renderHook(() => useControllableState({ value: 10, defaultValue: 5 }));
    expect(result.current[0]).toBe(10);
  });

  it('updates internal state when uncontrolled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 0, onChange }));
    act(() => result.current[1](42));
    expect(result.current[0]).toBe(42);
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it('does NOT update internal state when controlled — only fires onChange', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ v }) => useControllableState({ value: v, onChange }),
      { initialProps: { v: 10 } },
    );
    act(() => result.current[1](99));
    // value prop didn't change, so resolved stays 10
    expect(result.current[0]).toBe(10);
    expect(onChange).toHaveBeenCalledWith(99);

    rerender({ v: 99 });
    expect(result.current[0]).toBe(99);
  });

  it('accepts an updater function', () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: 5 }));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(6);
  });

  it('updater function receives current value when controlled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ value: 10, onChange }));
    act(() => result.current[1]((prev) => prev + 5));
    expect(onChange).toHaveBeenCalledWith(15);
  });
});
