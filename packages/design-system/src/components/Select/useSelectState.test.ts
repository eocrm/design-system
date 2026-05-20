import { act, renderHook } from '@testing-library/react';
import { useSelectState } from './useSelectState';

describe('useSelectState — single mode', () => {
  it('initializes uncontrolled value from defaultValue', () => {
    const { result } = renderHook(() => useSelectState({ multiple: false, defaultValue: 'a' }));
    expect(result.current.value).toBe('a');
  });

  it("defaults uncontrolled value to '' when no defaultValue is provided", () => {
    const { result } = renderHook(() => useSelectState({ multiple: false }));
    expect(result.current.value).toBe('');
  });

  it('setValue updates internal state and fires onChange in uncontrolled mode', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSelectState({ multiple: false, onChange }));
    act(() => {
      result.current.setValue('a');
    });
    expect(result.current.value).toBe('a');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('reflects controlled value after rerender', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useSelectState({ multiple: false, value }),
      { initialProps: { value: 'a' } },
    );
    expect(result.current.value).toBe('a');
    rerender({ value: 'b' });
    expect(result.current.value).toBe('b');
  });

  it('setValue in controlled mode fires onChange but does NOT update internal state', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSelectState({ multiple: false, value: 'a', onChange }));
    act(() => {
      result.current.setValue('b');
    });
    expect(result.current.value).toBe('a');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('toggleValue in single mode behaves like setValue', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSelectState({ multiple: false, onChange }));
    act(() => {
      result.current.toggleValue('a');
    });
    expect(result.current.value).toBe('a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});

describe('useSelectState — multi mode', () => {
  it('initializes uncontrolled value from defaultValue array', () => {
    const { result } = renderHook(() =>
      useSelectState({ multiple: true, defaultValue: ['a', 'b'] }),
    );
    expect(result.current.value).toEqual(['a', 'b']);
  });

  it('defaults uncontrolled value to [] when no defaultValue is provided', () => {
    const { result } = renderHook(() => useSelectState({ multiple: true }));
    expect(result.current.value).toEqual([]);
  });

  it('toggleValue appends a value that is not present', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSelectState({ multiple: true, defaultValue: ['a'], onChange }),
    );
    act(() => {
      result.current.toggleValue('b');
    });
    expect(result.current.value).toEqual(['a', 'b']);
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
  });

  it('toggleValue removes a value that is already present', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSelectState({ multiple: true, defaultValue: ['a', 'b'], onChange }),
    );
    act(() => {
      result.current.toggleValue('a');
    });
    expect(result.current.value).toEqual(['b']);
    expect(onChange).toHaveBeenLastCalledWith(['b']);
  });

  it('reflects controlled value array after rerender', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string[] }) => useSelectState({ multiple: true, value }),
      { initialProps: { value: ['a'] } },
    );
    expect(result.current.value).toEqual(['a']);
    rerender({ value: ['a', 'b'] });
    expect(result.current.value).toEqual(['a', 'b']);
  });

  it('toggleValue in controlled mode fires onChange but does NOT update internal state', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSelectState({ multiple: true, value: ['a'], onChange }));
    act(() => {
      result.current.toggleValue('b');
    });
    expect(result.current.value).toEqual(['a']);
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
  });
});

describe('useSelectState — open state', () => {
  it('defaults to closed', () => {
    const { result } = renderHook(() => useSelectState({ multiple: false }));
    expect(result.current.open).toBe(false);
  });

  it('respects defaultOpen', () => {
    const { result } = renderHook(() => useSelectState({ multiple: false, defaultOpen: true }));
    expect(result.current.open).toBe(true);
  });

  it('setOpen toggles uncontrolled state and fires onOpenChange', () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useSelectState({ multiple: false, onOpenChange }));
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.open).toBe(true);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    act(() => {
      result.current.setOpen(false);
    });
    expect(result.current.open).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('honors controlled open prop after rerender', () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useSelectState({ multiple: false, open }),
      { initialProps: { open: false } },
    );
    expect(result.current.open).toBe(false);
    rerender({ open: true });
    expect(result.current.open).toBe(true);
  });

  it('setOpen in controlled mode fires onOpenChange but does NOT update internal state', () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useSelectState({ multiple: false, open: false, onOpenChange }),
    );
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.open).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });
});
