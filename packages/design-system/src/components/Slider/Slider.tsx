import {
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Slider.module.scss';

/** Track height + thumb size. */
export type SliderSize = 'sm' | 'md' | 'lg';

/** Fill color tone (track between min and value). */
export type SliderTone = 'default' | 'success' | 'warning' | 'danger';

/** Layout direction. */
export type SliderOrientation = 'horizontal' | 'vertical';

/** Either a single number (single-thumb) or a [min, max] tuple (range mode). */
export type SliderValue = number | [number, number];

/** Tick-mark configuration. */
export interface SliderMark {
  /** Numeric position of the tick along the track (in min..max units). */
  value: number;
  /**
   * Optional label rendered below (horizontal) or to the right (vertical)
   * of the tick. When omitted, only the tick line renders — no text.
   * When `marks` is passed as `number[]`, the label is auto-set to the
   * value so consumers don't have to wrap each tick in an object.
   */
  label?: ReactNode;
}

export interface SliderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'role'
> {
  /**
   * Current value. A single `number` for one-thumb mode; a `[min, max]` tuple
   * for two-thumb (range) mode. The component type-discriminates internally.
   * Required — Slider is controlled-only.
   */
  value: SliderValue;
  /**
   * Called on every thumb-drag tick (high frequency). For server-side or
   * expensive update logic, prefer `onChangeEnd` or debounce in the consumer.
   * The argument has the same shape as `value`: `number` for single,
   * `[number, number]` for range.
   */
  onChange: (value: SliderValue) => void;
  /**
   * Called once when the user "commits" a value change — at pointerup
   * after a drag, or at blur after keyboard-nav that actually changed
   * the value. Does NOT fire on Tab-in / Tab-out without any value
   * change. Use for committing the value to a server or running an
   * expensive recalculation. Receives the final value with the same
   * shape as `value`.
   */
  onChangeEnd?: (value: SliderValue) => void;
  /** Minimum allowed value (inclusive). Default `0`. */
  min?: number;
  /** Maximum allowed value (inclusive). Default `100`. */
  max?: number;
  /**
   * Step granularity. Default `1`. Use fractional steps (e.g. `0.1`) for
   * zoom / opacity-style controls. Values are snapped to `min + (n * step)`.
   */
  step?: number;
  /**
   * Tick marks. Pass `number[]` for auto-labeled ticks (label = value) or
   * `SliderMark[]` for custom labels (label = ReactNode). Marks render under
   * the track (horizontal) or to the right (vertical).
   */
  marks?: number[] | SliderMark[];
  /**
   * Value bubble on the thumb.
   * - `false` (default) — no bubble.
   * - `true` — show the current value (formatted via `toString()`) on hover /
   *   focus / drag. Auto-hides otherwise.
   * - `(value: number) => ReactNode` — custom formatter. For range mode, the
   *   formatter is called once per thumb.
   */
  label?: boolean | ((value: number) => ReactNode);
  /**
   * Explicit accessible names for the minimum and maximum thumbs in range
   * mode. These win over a root `aria-label` or `aria-labelledby`; use them
   * when the thumbs need domain-specific names such as `['Start date', 'End
   * date']`. When omitted, a root label is suffixed with the localized
   * “minimum” or “maximum” name.
   */
  thumbLabels?: readonly [string, string];
  /**
   * Track + thumb sizing. Defaults to `'md'`.
   * - `sm` — 4px track, 14px thumb.
   * - `md` — 6px track, 18px thumb (default).
   * - `lg` — 8px track, 22px thumb.
   */
  size?: SliderSize;
  /**
   * Fill color tone (the track segment between min and value). Defaults to
   * `'default'` (accent). State-coded `success` / `warning` / `danger` for
   * threshold-style sliders (e.g. disk usage approaching capacity).
   */
  tone?: SliderTone;
  /** Orientation. Defaults to `'horizontal'`. */
  orientation?: SliderOrientation;
  /** Disabled state. Defaults to `false`. */
  disabled?: boolean;
  /**
   * Native form-input name. When set, a hidden `<input>` (or two for range,
   * with `-min`/`-max` suffixes) is rendered with the current value(s) so
   * the slider works inside uncontrolled HTML forms without consumer JS
   * serialization. When the slider is `disabled`, the hidden input(s) are
   * NOT rendered so the form does not submit a stale disabled value.
   */
  name?: string;
}

// CSS-Modules naming note:
// SCSS class names here are kebab-case (`.orientation-horizontal`, `.size-sm`,
// `.tone-danger`) so the TSX can use bracket notation
// `styles[`orientation-${o}`]` for clean orientation × size × tone × state
// dispatch. Two-word non-prop classes (`.markFilled`, `.thumbDragging`) stay
// camelCase. Deviates from the Progress/Title pure-camelCase + record-of-strings
// pattern; the bigger matrix here makes bracket-access more legible.

function normalizeMarks(marks: number[] | SliderMark[] | undefined): SliderMark[] {
  if (!marks || marks.length === 0) return [];
  // For number[] input, auto-label with the value itself. For SliderMark[]
  // input, keep `label` as-passed (may be undefined → no label rendered).
  return marks.map((m) => (typeof m === 'number' ? { value: m, label: m } : m));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function snapToStep(raw: number, min: number, step: number): number {
  if (step <= 0) return raw;
  const stepped = Math.round((raw - min) / step) * step + min;
  // Floating-point: align to step's decimal precision so 0.30000000000000004 → 0.3.
  const decimals = (step.toString().split('.')[1] ?? '').length;
  return decimals > 0 ? Number(stepped.toFixed(decimals)) : stepped;
}

/**
 * Controlled slider primitive supporting single (one-thumb) and range
 * (two-thumb) modes, horizontal and vertical orientations, fractional steps,
 * tick marks, and value bubbles. Custom-painted (not wrapping
 * `<input type="range">`) because range mode requires two thumbs and the
 * native input can't do that.
 *
 * **Controlled-only:** `value` is required and `onChange` must update the
 * consumer's state. Pass a `number` for single mode or `[number, number]`
 * for range — the component branches on `Array.isArray(value)`.
 *
 * @example
 * // Single-thumb with fractional steps (the ImageCrop zoom case):
 * const [zoom, setZoom] = useState(1);
 * <Slider value={zoom} min={1} max={3} step={0.1} onChange={(v) => setZoom(v as number)} aria-label="Zoom" />
 *
 * @example
 * // Range filter — price band, formatted label:
 * const [price, setPrice] = useState<[number, number]>([0, 50000]);
 * <Slider
 *   value={price}
 *   min={0}
 *   max={100000}
 *   step={1000}
 *   onChange={(v) => setPrice(v as [number, number])}
 *   aria-label="Price range"
 *   label={(v) => `$${v.toLocaleString()}`}
 * />
 *
 * @example
 * // Vertical volume control with tick marks:
 * <Slider
 *   value={volume}
 *   orientation="vertical"
 *   marks={[0, 25, 50, 75, 100]}
 *   onChange={(v) => setVolume(v as number)}
 * />
 *
 * @example
 * // Tone-coded threshold (disk usage approaching capacity):
 * <Slider
 *   value={usage}
 *   tone={usage > 90 ? 'danger' : usage > 75 ? 'warning' : 'default'}
 *   onChange={(v) => setUsage(v as number)}
 *   label
 * />
 *
 * @example
 * // Form submission via `name` — renders hidden inputs the form will pick up:
 * <form action="/api/settings" method="post">
 *   <Slider name="brightness" value={brightness} onChange={setB} />
 *   <button type="submit">Save</button>
 * </form>
 *
 * @remarks When NOT to use
 * - For binary state (on/off) — use `<Switch>` or `<Checkbox>`.
 * - For "pick one of a small enumerated set" — use `<RadioGroup>` or `<Select>`.
 * - For continuous color picking — that's a `<ColorPicker>` (not yet shipped).
 * - For server-state-bound expensive updates on every move tick. Use
 *   `onChangeEnd` or debounce.
 *
 * @remarks Anti-patterns
 * - ❌ Raw `<input type="range">` — can't do range mode, doesn't theme cleanly
 *   across browsers, vertical orientation is hacky. Use this.
 * - ❌ Hand-rolling drag math per page. The pointer / keyboard handling is
 *   non-trivial; the primitive owns it.
 * - ❌ Hitting a network endpoint inside `onChange`. The callback fires on
 *   every pointer-move tick — use `onChangeEnd` or debounce.
 * - ❌ `<Slider role="region">` — `role="slider"` is locked on each thumb.
 *   The TypeScript `Omit` prevents the root override.
 * - ❌ Passing `value[0] > value[1]` in range mode. The component clamps but
 *   the inverted tuple is a consumer bug — fix the state shape.
 * - ❌ Leaving range thumbs with identical names. Set the root `aria-label` /
 *   `aria-labelledby` so Slider can add localized minimum/maximum suffixes,
 *   or pass `thumbLabels` for domain-specific names.
 */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  {
    value,
    onChange,
    onChangeEnd,
    min = 0,
    max = 100,
    step = 1,
    marks,
    label = false,
    thumbLabels,
    size = 'md',
    tone = 'default',
    orientation = 'horizontal',
    disabled = false,
    name,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const reactId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const isRange = Array.isArray(value);
  const thumbValues: number[] = isRange ? (value as [number, number]) : [value as number];
  const thumbCount = thumbValues.length;
  const marksArr = useMemo(() => normalizeMarks(marks), [marks]);
  const range = max - min;
  const thumbSuffixes = [t('slider.minimum'), t('slider.maximum')] as const;
  const thumbSuffixIds = [`${reactId}-minimum`, `${reactId}-maximum`] as const;
  const rangeUsesRootLabelledBy = isRange && !thumbLabels && Boolean(ariaLabelledBy);

  // Latest value ref — updated on every render. Read synchronously inside
  // event handlers (e.g. onChangeEnd at pointerup) so they see the post-drag
  // value, not the render-time closure capture. Critical for fast drags where
  // pointermove fires multiple updates between renders.
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  // isDraggingRef: read synchronously inside event handlers (no state batching
  // race between pointerdown setting and pointermove reading).
  // isDragging (state): drives the .thumbDragging className re-render. Both are
  // updated together in setDragging().
  const isDraggingRef = useRef<boolean[]>(new Array(thumbCount).fill(false));
  const [isDragging, setIsDragging] = useState<boolean[]>(() => new Array(thumbCount).fill(false));
  const [isFocused, setIsFocused] = useState<boolean[]>(() => new Array(thumbCount).fill(false));
  const [isHovered, setIsHovered] = useState<boolean[]>(() => new Array(thumbCount).fill(false));

  // Whether the value changed during the current focus session (for any
  // reason: drag OR keyboard nav). Reset to false on focus. Set true on every
  // applyThumbValue call. Read by handleThumbBlur to decide whether to fire
  // onChangeEnd — prevents the "Tab in / Tab out without nav" no-op fire AND
  // the "drag + Tab" double fire.
  const valueChangedThisFocusRef = useRef(false);

  const setFlag = useCallback(
    (setter: typeof setIsFocused, index: number, next: boolean) => {
      setter((prev) => {
        const out = [...prev];
        // Ensure the array length matches thumbCount in case value shape changed.
        while (out.length < thumbCount) out.push(false);
        out[index] = next;
        return out;
      });
    },
    [thumbCount],
  );

  const setDragging = useCallback(
    (index: number, next: boolean) => {
      // Pad the ref array if the value shape changed (range → single transitions).
      while (isDraggingRef.current.length < thumbCount) isDraggingRef.current.push(false);
      isDraggingRef.current[index] = next;
      setIsDragging((prev) => {
        const out = [...prev];
        while (out.length < thumbCount) out.push(false);
        out[index] = next;
        return out;
      });
    },
    [thumbCount],
  );

  // Convert a value (in min..max) to a percentage along the track (0..100).
  const valueToPercent = useCallback(
    (v: number): number => (range === 0 ? 0 : clamp(((v - min) / range) * 100, 0, 100)),
    [min, range],
  );

  // Compute the next value for a given thumb when the user moves the pointer to
  // `clientX` / `clientY`. Returns null if the track has no measured length yet.
  const pointerToValue = useCallback(
    (clientX: number, clientY: number, thumbIndex: number): number | null => {
      const trackEl = trackRef.current;
      if (!trackEl) return null;
      const rect = trackEl.getBoundingClientRect();
      const lengthPx = orientation === 'horizontal' ? rect.width : rect.height;
      if (lengthPx === 0) return null;
      const pointerPos = orientation === 'horizontal' ? clientX - rect.left : rect.bottom - clientY;
      const pct = clamp(pointerPos / lengthPx, 0, 1);
      const raw = min + pct * range;
      const snapped = clamp(snapToStep(raw, min, step), min, max);
      // Range clamp: thumb 0 can't exceed thumb 1; thumb 1 can't go below thumb 0.
      if (isRange) {
        const [v0, v1] = value as [number, number];
        if (thumbIndex === 0) return Math.min(snapped, v1);
        return Math.max(snapped, v0);
      }
      return snapped;
    },
    [isRange, max, min, orientation, range, step, value],
  );

  // Apply a new thumb value and fire onChange with the appropriate shape.
  const applyThumbValue = useCallback(
    (thumbIndex: number, newValue: number) => {
      if (isRange) {
        const tuple = [...(value as [number, number])] as [number, number];
        tuple[thumbIndex] = newValue;
        onChange(tuple);
      } else {
        onChange(newValue);
      }
      valueChangedThisFocusRef.current = true;
    },
    [isRange, onChange, value],
  );

  const handleThumbPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>, thumbIndex: number) => {
      if (disabled) return;
      e.preventDefault();
      // setPointerCapture: future pointermove/up fire on this element even if
      // the pointer leaves it. Wrapped in try/catch because jsdom may not
      // implement setPointerCapture — we still get pointermove on the element
      // in test environments.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // jsdom or pre-PointerEvents browsers — drag still works via pointermove.
      }
      setDragging(thumbIndex, true);
    },
    [disabled, setDragging],
  );

  const handleThumbPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>, thumbIndex: number) => {
      if (disabled || !isDraggingRef.current[thumbIndex]) return;
      const next = pointerToValue(e.clientX, e.clientY, thumbIndex);
      if (next === null) return;
      // Read the LATEST value from the ref (not the closure-captured one) so
      // the duplicate-fire guard works correctly across batched renders.
      const latest = latestValueRef.current;
      const current = Array.isArray(latest) ? latest[thumbIndex] : latest;
      if (next !== current) applyThumbValue(thumbIndex, next);
    },
    [applyThumbValue, disabled, pointerToValue],
  );

  const handleThumbPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>, thumbIndex: number) => {
      if (disabled || !isDraggingRef.current[thumbIndex]) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore — same rationale as pointerdown.
      }
      setDragging(thumbIndex, false);
      // Fire onChangeEnd only if the value actually changed during the drag —
      // a click-without-movement (pointerdown → pointerup, no pointermove)
      // shouldn't be a "commit" event.
      if (valueChangedThisFocusRef.current) {
        onChangeEnd?.(latestValueRef.current);
        valueChangedThisFocusRef.current = false;
      }
    },
    [disabled, onChangeEnd, setDragging],
  );

  const handleThumbKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, thumbIndex: number) => {
      if (disabled) return;
      let delta = 0;
      let absolute: number | null = null;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          delta = -step;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          delta = step;
          break;
        case 'PageDown':
          delta = -step * 10;
          break;
        case 'PageUp':
          delta = step * 10;
          break;
        case 'Home':
          absolute = min;
          break;
        case 'End':
          absolute = max;
          break;
        default:
          return;
      }
      e.preventDefault();
      const current = thumbValues[thumbIndex];
      let next = absolute !== null ? absolute : current + delta;
      next = clamp(snapToStep(next, min, step), min, max);
      if (isRange) {
        const [v0, v1] = value as [number, number];
        if (thumbIndex === 0) next = Math.min(next, v1);
        else next = Math.max(next, v0);
      }
      if (next !== current) applyThumbValue(thumbIndex, next);
    },
    [applyThumbValue, disabled, isRange, max, min, step, thumbValues, value],
  );

  const handleThumbBlur = useCallback(
    (thumbIndex: number) => {
      setFlag(setIsFocused, thumbIndex, false);
      // Only fire onChangeEnd if the value actually changed during this focus
      // session. Pointerup already fires onChangeEnd directly; blur covers the
      // keyboard-nav case (Tab out after Arrow nav). Tab-in / Tab-out without
      // any nav does NOT fire (no change, no fire).
      if (valueChangedThisFocusRef.current) {
        onChangeEnd?.(latestValueRef.current);
        valueChangedThisFocusRef.current = false;
      }
    },
    [onChangeEnd, setFlag],
  );

  // Track click: pick the nearest thumb (by current value distance to the
  // click's projected value) and snap it. Range mode picks by distance; single
  // mode always snaps the one thumb. Click on a thumb itself (descendant) is
  // ignored — the thumb's pointerdown handles its own state.
  const handleTrackPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      // Don't override a thumb's own pointerdown (which bubbles up here).
      if ((e.target as HTMLElement).closest(`.${styles.thumb}`)) return;
      const target = pointerToValue(e.clientX, e.clientY, 0);
      if (target === null) return;
      let nearestIndex = 0;
      if (isRange) {
        const d0 = Math.abs((value as [number, number])[0] - target);
        const d1 = Math.abs((value as [number, number])[1] - target);
        nearestIndex = d1 < d0 ? 1 : 0;
      }
      // Recompute the snap WITH the chosen thumb index so the range-clamp uses
      // the right "other thumb" reference.
      const next = pointerToValue(e.clientX, e.clientY, nearestIndex);
      if (next === null) return;
      applyThumbValue(nearestIndex, next);
      // Optionally: focus the moved thumb so the user can keyboard-nudge from
      // the new position. Querying by selector since we don't keep a thumb ref.
      const thumbEl = e.currentTarget
        .closest(`.${styles.root}`)
        ?.querySelectorAll<HTMLDivElement>(`.${styles.thumb}`)[nearestIndex];
      thumbEl?.focus();
    },
    [applyThumbValue, disabled, isRange, pointerToValue, value],
  );

  // Style helpers — positions in percent of the track length.
  const fillStyle: CSSProperties = useMemo(() => {
    if (isRange) {
      const [v0, v1] = value as [number, number];
      const startPct = valueToPercent(v0);
      const endPct = valueToPercent(v1);
      return orientation === 'horizontal'
        ? { left: `${startPct}%`, width: `${endPct - startPct}%` }
        : { bottom: `${startPct}%`, height: `${endPct - startPct}%` };
    }
    const endPct = valueToPercent(value as number);
    return orientation === 'horizontal'
      ? { left: '0%', width: `${endPct}%` }
      : { bottom: '0%', height: `${endPct}%` };
  }, [isRange, orientation, value, valueToPercent]);

  const thumbStyle = useCallback(
    (v: number): CSSProperties => {
      const pct = valueToPercent(v);
      return orientation === 'horizontal' ? { left: `${pct}%` } : { bottom: `${pct}%` };
    },
    [orientation, valueToPercent],
  );

  const markStyle = useCallback(
    (m: SliderMark): CSSProperties => {
      const pct = valueToPercent(m.value);
      return orientation === 'horizontal' ? { left: `${pct}%` } : { bottom: `${pct}%` };
    },
    [orientation, valueToPercent],
  );

  const isMarkInFill = useCallback(
    (m: SliderMark): boolean => {
      if (isRange) {
        const [v0, v1] = value as [number, number];
        return m.value >= v0 && m.value <= v1;
      }
      return m.value <= (value as number);
    },
    [isRange, value],
  );

  const formatLabel = useCallback(
    (v: number): ReactNode => {
      if (label === true) return String(v);
      if (typeof label === 'function') return label(v);
      return null;
    },
    [label],
  );

  const showLabelFor = useCallback(
    (index: number): boolean => {
      if (label === false) return false;
      return Boolean(isDragging[index] || isFocused[index] || isHovered[index]);
    },
    [isDragging, isFocused, isHovered, label],
  );

  // {...rest} last so consumer overrides win (Pattern A). `role` is Omit'd
  // from rest at the type level so consumers can't override the slider thumb
  // role contract.
  return (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        styles[`orientation-${orientation}`],
        styles[`size-${size}`],
        styles[`tone-${tone}`],
        disabled && styles.disabled,
        className,
      )}
      {...rest}
    >
      <div ref={trackRef} className={styles.track} onPointerDown={handleTrackPointerDown}>
        <div className={styles.fill} style={fillStyle} />
        {marksArr.map((mark) => (
          <span
            key={mark.value}
            className={clsx(styles.mark, isMarkInFill(mark) && styles.markFilled)}
            style={markStyle(mark)}
          >
            {mark.label !== undefined && <span className={styles.markLabel}>{mark.label}</span>}
          </span>
        ))}
      </div>
      {thumbValues.map((thumbValue, index) => (
        <div
          key={index}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={thumbValue}
          aria-valuetext={typeof label === 'function' ? String(label(thumbValue)) : undefined}
          aria-orientation={orientation}
          aria-disabled={disabled || undefined}
          aria-label={
            // Each range thumb needs a distinct accessible name. Explicit
            // tuple labels take precedence; otherwise derive from the root's
            // aria-label + localized minimum/maximum suffix.
            isRange
              ? (thumbLabels?.[index] ??
                (rangeUsesRootLabelledBy || !ariaLabel
                  ? undefined
                  : `${ariaLabel}, ${thumbSuffixes[index]}`))
              : ariaLabel
          }
          aria-labelledby={
            isRange
              ? thumbLabels
                ? undefined
                : rangeUsesRootLabelledBy
                  ? `${ariaLabelledBy} ${thumbSuffixIds[index]}`
                  : undefined
              : ariaLabelledBy
          }
          aria-describedby={
            // Forward the root's aria-describedby to each focusable thumb so a
            // <Field error/description> wrapping a Slider is announced when a
            // thumb has focus. The role-less root intentionally stays unnamed.
            ariaDescribedBy
          }
          className={clsx(styles.thumb, isDragging[index] && styles.thumbDragging)}
          style={thumbStyle(thumbValue)}
          onPointerDown={(e) => handleThumbPointerDown(e, index)}
          onPointerMove={(e) => handleThumbPointerMove(e, index)}
          onPointerUp={(e) => handleThumbPointerUp(e, index)}
          onPointerEnter={() => setFlag(setIsHovered, index, true)}
          onPointerLeave={() => setFlag(setIsHovered, index, false)}
          onFocus={() => {
            setFlag(setIsFocused, index, true);
            valueChangedThisFocusRef.current = false;
          }}
          onBlur={() => handleThumbBlur(index)}
          onKeyDown={(e) => handleThumbKeyDown(e, index)}
        >
          {showLabelFor(index) && <span className={styles.label}>{formatLabel(thumbValue)}</span>}
        </div>
      ))}
      {rangeUsesRootLabelledBy && (
        <>
          {/* Referenced hidden nodes add localized context without rendering text. */}
          <span id={thumbSuffixIds[0]} hidden>
            {thumbSuffixes[0]}
          </span>
          <span id={thumbSuffixIds[1]} hidden>
            {thumbSuffixes[1]}
          </span>
        </>
      )}
      {name &&
        !disabled &&
        (isRange ? (
          <>
            <input type="hidden" name={`${name}-min`} value={(value as [number, number])[0]} />
            <input type="hidden" name={`${name}-max`} value={(value as [number, number])[1]} />
          </>
        ) : (
          <input type="hidden" name={name} value={value as number} />
        ))}
    </div>
  );
});
