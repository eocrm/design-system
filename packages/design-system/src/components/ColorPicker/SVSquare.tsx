import {
  forwardRef,
  useCallback,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import styles from './ColorPicker.module.scss';

export interface SVSquareProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current hue (0–360). Drives the solid base color of the pad. */
  hue: number;
  /** Current saturation (0–100). Drives the indicator's x position. */
  s: number;
  /** Current value/brightness (0–100). Drives the indicator's y position. */
  v: number;
  /** Fires per drag tick + per keyboard step with the new (s, v) tuple. */
  onChange: (s: number, v: number) => void;
  /** Fires on pointer release (end of a drag gesture). */
  onChangeEnd?: () => void;
  /** Disable interaction. */
  disabled?: boolean;
}

/**
 * 2D saturation/value pad. Background is a solid hue color overlaid with
 * stacked CSS gradients (white→transparent left→right + black→transparent
 * bottom→top), so the visible pixel at (x, y) in the pad represents the
 * color at (S = x%, V = 100 - y%) in HSV space. Picking is pointer-driven;
 * keyboard nav adjusts S/V by 1% per arrow press (10% with Shift).
 *
 * Not exported from the package — used internally by ColorPickerPanel.
 *
 * @remarks Why role="application"
 * 2D pointer-driven controls don't have a standard ARIA pattern (slider is
 * 1D, button is binary). The accepted compromise is `role="application"`
 * with an aria-valuetext describing the current state — same precedent as
 * ImageCrop's viewport in this library.
 */
export const SVSquare = forwardRef<HTMLDivElement, SVSquareProps>(function SVSquare(
  { hue, s, v, onChange, onChangeEnd, disabled = false, className, ...rest },
  ref,
) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  // Combine the forwarded ref with our internal padRef.
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      padRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const commitFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nextS = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const nextV = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
      onChange(nextS, nextV);
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // jsdom doesn't implement setPointerCapture; drag still works via pointermove.
      }
      isDraggingRef.current = true;
      commitFromPointer(e.clientX, e.clientY);
    },
    [commitFromPointer, disabled],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled || !isDraggingRef.current) return;
      commitFromPointer(e.clientX, e.clientY);
    },
    [commitFromPointer, disabled],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled || !isDraggingRef.current) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // jsdom — ignore.
      }
      isDraggingRef.current = false;
      onChangeEnd?.();
    },
    [disabled, onChangeEnd],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const step = e.shiftKey ? 10 : 1;
      let nextS = s;
      let nextV = v;
      switch (e.key) {
        case 'ArrowLeft':
          nextS = Math.max(0, s - step);
          break;
        case 'ArrowRight':
          nextS = Math.min(100, s + step);
          break;
        case 'ArrowUp':
          nextV = Math.min(100, v + step);
          break;
        case 'ArrowDown':
          nextV = Math.max(0, v - step);
          break;
        case 'Home':
          nextS = 0;
          break;
        case 'End':
          nextS = 100;
          break;
        case 'PageUp':
          nextV = 100;
          break;
        case 'PageDown':
          nextV = 0;
          break;
        default:
          return;
      }
      e.preventDefault();
      if (nextS !== s || nextV !== v) {
        onChange(nextS, nextV);
      }
    },
    [disabled, onChange, s, v],
  );

  // Reset drag state if `disabled` flips true mid-gesture (defensive — same
  // pattern as ImageCrop). We don't need a useEffect because the next
  // pointermove with disabled=true bails before reading the ref, but we DO
  // need to clear it so future interactions start fresh.
  if (disabled && isDraggingRef.current) {
    isDraggingRef.current = false;
  }

  // hsl(<h>, 100%, 50%) gives the solid hue base; CSS pseudos add the
  // saturation + value gradients.
  const baseStyle: CSSProperties = {
    backgroundColor: `hsl(${hue}, 100%, 50%)`,
  };

  return (
    <div
      ref={setRef}
      role="application"
      aria-label="Saturation and brightness"
      aria-valuetext={`saturation ${Math.round(s)} percent, brightness ${Math.round(v)} percent`}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={clsx(styles.svSquare, disabled && styles.svSquareDisabled, className)}
      style={baseStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <div className={styles.svIndicator} style={{ left: `${s}%`, top: `${100 - v}%` }} />
    </div>
  );
});
