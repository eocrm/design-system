import { renderHook, act } from '@testing-library/react';
import { useResizeHandle } from './useResizeHandle';

function pointer(type: string, clientX: number, pointerId = 1): PointerEvent {
  return new PointerEvent(type, { clientX, pointerId, bubbles: true });
}

describe('useResizeHandle', () => {
  it('returns initial isResizing=false', () => {
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize: () => {} }),
    );
    expect(result.current.isResizing).toBe(false);
  });

  it('pointerdown → pointermove → pointerup fires onResize with delta-clamped width', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize }),
    );

    const target = document.createElement('div');
    // jsdom's setPointerCapture is a no-op; that's fine.
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });
    expect(result.current.isResizing).toBe(true);

    act(() => {
      window.dispatchEvent(pointer('pointermove', 75)); // +25px
    });
    expect(onResize).toHaveBeenCalledWith(125);

    act(() => {
      window.dispatchEvent(pointer('pointerup', 75));
    });
    expect(result.current.isResizing).toBe(false);
  });

  it('clamps width below minWidth', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize }),
    );

    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });

    act(() => {
      window.dispatchEvent(pointer('pointermove', -100)); // -150px would be width=-50
    });
    expect(onResize).toHaveBeenLastCalledWith(40); // clamped to minWidth
  });

  it('clamps to maxWidth when provided', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, maxWidth: 200, onResize }),
    );

    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });

    act(() => {
      window.dispatchEvent(pointer('pointermove', 500));
    });
    expect(onResize).toHaveBeenLastCalledWith(200);
  });

  it('pointercancel ends the drag', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeHandle({ initialWidth: 100, minWidth: 40, onResize }),
    );

    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    target.releasePointerCapture = vi.fn();

    act(() => {
      result.current.onPointerDown({
        ...pointer('pointerdown', 50),
        currentTarget: target,
        clientX: 50,
        pointerId: 1,
      } as any);
    });
    expect(result.current.isResizing).toBe(true);

    act(() => {
      window.dispatchEvent(pointer('pointercancel', 60));
    });
    expect(result.current.isResizing).toBe(false);
  });
});
