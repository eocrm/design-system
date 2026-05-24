# Slider — design spec

**Date:** 2026-05-24
**Branch:** `feat/image-crop` (Slider ships first as a pre-req for ImageCrop's zoom UI — see "Why now")
**Scope:** Add `<Slider>` to `@eocrm/design-system` — a controlled, custom-painted slider primitive supporting single-thumb AND range (two-thumb) modes, horizontal AND vertical orientations, tick marks, value labels, and tone-coded fills.

## Goal

Give the library a real slider primitive so consumers stop reaching for raw `<input type="range">` (which can't do range mode or vertical orientation, and doesn't theme cleanly) and stop hand-rolling drag math per-page. The component is also the pre-req for `<ImageCrop>` (next PR) which needs a zoom slider.

## Why now

`<ImageCrop>` (next session) needs a zoom slider for its zoom-in/zoom-out control. Per the brainstorm, ImageCrop is hand-rolled and ships with zoom — so we need `<Slider>` first.

Other near-term real consumers already on the wishlist:

- Volume / opacity controls in any future media-edit UI
- Threshold sliders for "show items with priority > N" filters
- Range filters in the contacts/deals list pages (date-range numeric brushing, price range)
- Disk-usage threshold sliders in admin settings

## Non-goals (v1)

- **No uncontrolled mode.** `value` is required; consumer always owns the state. Matches FileUpload, Progress, every other controlled primitive shipped this quarter.
- **No vertical RTL.** Vertical sliders are LTR-only.
- **No `track="inverted"` mode.** MUI/Mantine support filling from the max-end. Too niche for current consumers.
- **No `disableSwap` opt-out for range.** Range thumbs always clamp so `value[0] ≤ value[1]`. The "thumbs can cross" UX is confusing and no consumer is asking for it.
- **No `discrete` / `restricted` mode** (snap thumbs to mark values only). Marks are visual ticks; `step` does the snapping.
- **No `valueLabelDisplay: 'on' | 'auto' | 'off'`** prop. Just `label: boolean | formatter`. Auto-shows on hover/focus/drag, auto-hides otherwise.
- **No imperative API.** No `sliderRef.current.setValue(...)` etc.
- **No `marks="auto"` mode** that generates ticks at step boundaries. Consumer passes the array explicitly.
- **No `track={false}` (hide track) mode.** The track is the visual that makes the thumb position legible.
- **No `slots` or render-prop API.** Thumb, track, mark, and label rendering are all owned by the component.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- Existing tokens: `--color-accent`, `--color-success`, `--color-warning`, `--color-danger`, `--color-bg-muted`, `--color-bg`, `--color-fg`, `--color-fg-muted`, `--color-border`, `--font-size-xs`, `--font-size-sm`, `--font-weight-medium`, `--radius-full`, `--radius-sm`, `--space-1`, `--space-2`, `--shadow-sm`, `--transition-base`, `--opacity-disabled`.

No new tokens needed.

### File layout

```
packages/design-system/src/components/Slider/
  Slider.tsx               ← root component (forwardRef, drag math, pointer + keyboard handlers, render tree)
  Slider.module.scss       ← .root + .horizontal/.vertical + .track + .fill + .thumb + .label + .mark + .disabled
  Slider.test.tsx          ← ~30 cases (single + range + vertical + keyboard + ARIA)
  index.ts                 ← exports Slider + types

packages/design-system/src/index.ts                                ← MODIFY: re-exports
packages/design-system/AGENTS.md                                   ← MODIFY: add Slider section under Forms (after FileUpload)

packages/playground/src/pages/components/SliderDemo.tsx            ← NEW
packages/playground/src/App.tsx                                    ← MODIFY: add route
packages/playground/src/layout/AppShell/AppShell.tsx               ← MODIFY: add to Forms group (between Select and Switch alphabetically)
packages/playground/src/pages/components/ComponentsIndex.tsx       ← MODIFY: add card
packages/playground/src/pages/mockups/registry.ts                  ← MODIFY: extend ComponentName union with 'Slider'
```

### Composition examples

```tsx
// Single-thumb, fractional steps (the ImageCrop zoom case):
<Slider value={zoom} min={1} max={3} step={0.1} onChange={setZoom} aria-label="Zoom" />

// Range filter (deals priced between $A and $B):
<Slider value={[price[0], price[1]]} min={0} max={100000} step={1000} onChange={setPrice} label={(v) => `$${v.toLocaleString()}`} />

// Vertical with marks (custom volume control):
<Slider value={volume} orientation="vertical" marks={[0, 25, 50, 75, 100]} onChange={setVolume} />

// Tone-coded threshold:
<Slider value={diskUsage} tone={diskUsage > 90 ? 'danger' : diskUsage > 75 ? 'warning' : 'default'} />
```

## Public API

### Types

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Track height + thumb size. */
export type SliderSize = 'sm' | 'md' | 'lg';

/** Fill color tone (track between min and value). */
export type SliderTone = 'default' | 'success' | 'warning' | 'danger';

/** Layout direction. */
export type SliderOrientation = 'horizontal' | 'vertical';

/** Either a single number (single-thumb) or a [min, max] tuple (range mode). */
export type SliderValue = number | [number, number];

/** Tick-mark configuration. Either an array of values (auto-labeled with the value) or full SliderMark objects with custom labels. */
export interface SliderMark {
  value: number;
  label?: ReactNode;
}

export interface SliderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'role'> {
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
   * Called once when the user releases the thumb (pointerup / blur after
   * keyboard nav). Use for committing the value to a server or running an
   * expensive recalculation. Receives the final value with the same shape
   * as `value`.
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
   * - `true` — show the current value (formatted via toString) on hover /
   *   focus / drag. Auto-hides otherwise.
   * - `(value: number) => ReactNode` — custom formatter. For range mode,
   *   the formatter is called once per thumb.
   */
  label?: boolean | ((value: number) => ReactNode);
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
   * Native form-input name. When set, a hidden `<input>` (or two for range)
   * is rendered with the current value(s) so the slider works inside
   * uncontrolled HTML forms without consumer JS serialization.
   */
  name?: string;
}
```

### Render shape (pseudo-code)

The following sketches the JSX shape and the locally-derived variables the component computes. Variable bindings (`thumbValues`, `fillStyle`, `thumbStyle`, `markStyle`, `marksArr`, `formatLabel`, `isDragging`, `isFocused`, `isHovered`, `isMarkInFill`) are documented in the bullet list after the snippet — they're not magic; they're straightforward derivations the implementer fills in.

```tsx
// Locally computed in the component body:
//   isRange = Array.isArray(value)
//   thumbValues = isRange ? value : [value]
//   marksArr = normalize(marks)  // number[] | SliderMark[] → SliderMark[]
//   fillStyle = computed inline-style positioning the fill segment
//   thumbStyle(v) = computed inline-style positioning a thumb at percent ((v-min)/(max-min))*100
//   markStyle(m) = same shape as thumbStyle, positions a mark
//   isMarkInFill(m) = whether mark.value lies inside the current fill range
//   formatLabel(v) = label === true ? String(v) : label === false ? null : label(v)
//   showLabelFor(i) = isDragging[i] || isFocused[i] || isHovered[i]
//   handleThumbPointerDown / handleThumbKeyDown — see "Drag math" + "Keyboard" sections

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
  <div ref={trackRef} className={styles.track}>
    <div className={styles.fill} style={fillStyle} />
    {marksArr.map((mark) => (
      <span
        key={mark.value}
        className={clsx(styles.mark, isMarkInFill(mark) && styles.markFilled)}
        style={markStyle(mark)}
      >
        {mark.label && <span className={styles.markLabel}>{mark.label}</span>}
      </span>
    ))}
  </div>
  {/* For single mode: 1 thumb; for range: 2 thumbs */}
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
      className={clsx(styles.thumb, isDragging[index] && styles.thumbDragging)}
      style={thumbStyle(thumbValue)}
      onPointerDown={(e) => handleThumbPointerDown(e, index)}
      onKeyDown={(e) => handleThumbKeyDown(e, index)}
      onPointerEnter={() => setHovered(index, true)}
      onPointerLeave={() => setHovered(index, false)}
      onFocus={() => setFocused(index, true)}
      onBlur={() => setFocused(index, false)}
    >
      {label !== false && showLabelFor(index) && (
        <span className={styles.label}>{formatLabel(thumbValue)}</span>
      )}
    </div>
  ))}
  {name && (isRange
    ? <>
        <input type="hidden" name={`${name}-min`} value={(value as [number, number])[0]} />
        <input type="hidden" name={`${name}-max`} value={(value as [number, number])[1]} />
      </>
    : <input type="hidden" name={name} value={value as number} />
  )}
</div>
```

Internal state (only what changes after the initial render):

- `isDragging: boolean[]` — one entry per thumb. Set to `true` on pointerdown, `false` on pointerup.
- `isFocused: boolean[]` — set on focus/blur. Drives label visibility.
- `isHovered: boolean[]` — set on pointerenter/leave. Drives label visibility.
- `trackRef: RefObject<HTMLDivElement>` — for `getBoundingClientRect()` math.
- The actual value lives in the controlled `value` prop; no internal value state.

The hidden `<input>`(s) at the end let the slider work inside `<form action=...>` without JS serialization. Range mode renders TWO hidden inputs with `${name}-min` and `${name}-max` so the consumer can pick them off the form data.

### Drag math

When the user pointer-downs on a thumb:

1. `pointerId` captured via `event.currentTarget.setPointerCapture(event.pointerId)` — guarantees future move/up events fire on the thumb element even if the pointer moves off it.
2. Compute `trackRect = trackRef.current.getBoundingClientRect()`.
3. Track `offset = pointer position - thumb position` so the thumb doesn't jump on grab.
4. On every `pointermove`:
   - Project pointer position onto the track axis: `pointerPos = orientation === 'horizontal' ? clientX - trackRect.left : trackRect.bottom - clientY` (vertical inverts).
   - Compute percent: `pct = clamp(0, 1, pointerPos / trackLength)`.
   - Compute raw value: `rawValue = min + pct * (max - min)`.
   - Snap to step: `snappedValue = Math.round((rawValue - min) / step) * step + min`.
   - In range mode, clamp to not cross the other thumb: `thumbIndex === 0 ? Math.min(snappedValue, value[1]) : Math.max(snappedValue, value[0])`.
   - Fire `onChange` with the new value (full tuple for range, scalar for single).
5. On `pointerup`:
   - Release pointer capture.
   - Fire `onChangeEnd` with the current value.

When the user keydowns on a thumb:

- `ArrowLeft` / `ArrowDown` (horizontal-left / vertical-down): `value -= step`.
- `ArrowRight` / `ArrowUp` (horizontal-right / vertical-up): `value += step`.
- `Home`: `value = min`.
- `End`: `value = max`.
- `PageDown`: `value -= step * 10`.
- `PageUp`: `value += step * 10`.

All keyboard nudges respect range-mode clamping. `onChange` fires immediately. `onChangeEnd` fires on `blur` (not on every keystroke).

Clicking on the track (NOT on a thumb) snaps the nearest thumb to the click position. In range mode, "nearest" is by distance to each thumb's current position.

## Styling — `Slider.module.scss`

```scss
.root {
  position: relative;
  display: flex;
  align-items: center;
  user-select: none;
}

.orientation-horizontal {
  width: 100%;
  // Reserve vertical space for the marks (below the track) + the label bubble (above).
  // Component-internal sizing for an unfixed-height row.
  min-height: 32px;
}

.orientation-vertical {
  flex-direction: column;
  // 200px is a reasonable default vertical track length; consumer can override via style.
  height: 200px;
  min-width: 32px;
}

.track {
  position: relative;
  background: var(--color-bg-muted);
  border-radius: var(--radius-full);
  overflow: visible;
}

.orientation-horizontal .track {
  width: 100%;
  height: 6px;
}

.orientation-vertical .track {
  height: 100%;
  width: 6px;
}

.size-sm.orientation-horizontal .track {
  height: 4px;
}

.size-lg.orientation-horizontal .track {
  height: 8px;
}

.size-sm.orientation-vertical .track {
  width: 4px;
}

.size-lg.orientation-vertical .track {
  width: 8px;
}

.fill {
  position: absolute;
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.orientation-horizontal .fill {
  top: 0;
  bottom: 0;
}

.orientation-vertical .fill {
  left: 0;
  right: 0;
}

.tone-default .fill {
  background: var(--color-accent);
}
.tone-success .fill {
  background: var(--color-success);
}
.tone-warning .fill {
  background: var(--color-warning);
}
.tone-danger .fill {
  background: var(--color-danger);
}

.thumb {
  position: absolute;
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: grab;
  transition: box-shadow var(--transition-base);
}

.orientation-horizontal .thumb {
  top: 50%;
  transform: translate(-50%, -50%);
}

.orientation-vertical .thumb {
  left: 50%;
  transform: translate(-50%, 50%);
}

.size-sm .thumb {
  width: 14px;
  height: 14px;
}

.size-md .thumb {
  width: 18px;
  height: 18px;
}

.size-lg .thumb {
  width: 22px;
  height: 22px;
}

.thumb:hover,
.thumb:focus-visible {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  outline: none;
}

.thumbDragging {
  cursor: grabbing;
  box-shadow: var(--shadow-md);
}

.label {
  position: absolute;
  background: var(--color-fg);
  color: var(--color-bg);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  pointer-events: none;
}

.orientation-horizontal .label {
  bottom: calc(100% + var(--space-2));
  left: 50%;
  transform: translateX(-50%);
}

.orientation-vertical .label {
  left: calc(100% + var(--space-2));
  top: 50%;
  transform: translateY(-50%);
}

.mark {
  position: absolute;
  width: 2px;
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.markFilled {
  background: var(--color-accent);
}

.tone-success .markFilled {
  background: var(--color-success);
}
.tone-warning .markFilled {
  background: var(--color-warning);
}
.tone-danger .markFilled {
  background: var(--color-danger);
}

.orientation-horizontal .mark {
  top: 50%;
  transform: translate(-50%, -50%);
}

.orientation-vertical .mark {
  left: 50%;
  transform: translate(-50%, 50%);
  width: 8px;
  height: 2px;
}

.markLabel {
  position: absolute;
  font-size: var(--font-size-xs);
  color: var(--color-fg-muted);
  white-space: nowrap;
  pointer-events: none;
}

.orientation-horizontal .markLabel {
  top: calc(100% + var(--space-1));
  left: 50%;
  transform: translateX(-50%);
}

.orientation-vertical .markLabel {
  left: calc(100% + var(--space-1));
  top: 50%;
  transform: translateY(-50%);
}

.disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
  pointer-events: none;
}
```

**Rule 4 check:**

- `.root` uses `position: relative` to anchor the absolutely-positioned `.fill`, `.thumb`, `.mark`, and label. Internal-child positioning for the centered-content pattern (same exception as Avatar's `.presence` and CircularProgress's centered label). Documented inline.
- `.orientation-horizontal width: 100%` — intrinsic, not layout-at-boundary.
- `.orientation-vertical height: 200px` — default vertical length; consumer overrides via `style={{ height }}`. Internal-child sizing; OK.
- `.min-height: 32px` (horizontal) / `.min-width: 32px` (vertical) — reserves space for mark labels and the value bubble.
- `.thumb width/height` — internal child sizing for the thumb visual.
- All values are tokens. No `margin`, no `top/left/right/bottom` except for internal-child positioning, no `flex: 1/grow/self`.

## ARIA + behavior reference

| Concern               | Behavior                                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thumb role**        | `role="slider"` on each thumb. `tabIndex=0` (or `-1` when disabled). `aria-valuemin/max/now` per thumb. `aria-orientation` from prop. `aria-disabled` when disabled.                                                                                              |
| **Range mode ARIA**   | TWO `<div role="slider">` elements, one per thumb. Each has its own `aria-valuenow`. Consumers wanting accessible labels per thumb can pass `aria-label` to the root via spread, which we use as a base — but ideally the consumer also passes `aria-label`s through prop slots (deferred). For v1, the root's `aria-label` covers both thumbs (the SR will announce the slider name plus the current values). |
| **Value text**        | `aria-valuetext` set when `label` is a function (formatted output). When `label` is `true`, the raw number is used (no `aria-valuetext` override). When `label` is `false`, `aria-valuetext` is unset (SR announces the raw `aria-valuenow`).                              |
| **Track click**       | Click on the track (not a thumb) snaps the nearest thumb to the click position and focuses it. Range mode: distance to thumb determines which thumb moves.                                                                                                  |
| **Disabled**          | `aria-disabled` on each thumb; `tabIndex=-1`; pointer-events: none on the root via `.disabled`; hidden inputs receive `disabled`.                                                                                                                                |
| **Reduced motion**    | `@media (prefers-reduced-motion: reduce)` disables the `transition` on `.thumb` box-shadow. Drag movement itself is direct (no transition during drag); only the focus/hover transitions are affected.                                                          |
| **Pointer capture**   | `setPointerCapture` on pointerdown ensures pointermove/up still fire on the thumb even when the pointer leaves the element. Released on pointerup.                                                                                                              |
| **Keyboard nudge**    | ArrowLeft/Down: -step. ArrowRight/Up: +step. Home: min. End: max. PageDown: -10×step. PageUp: +10×step. `onChange` per key, `onChangeEnd` on blur.                                                                                                              |
| **Range thumb swap**  | Thumbs clamp so `value[0] ≤ value[1]` always. A drag that would cross gets clamped to the other thumb's value. Keyboard nav same.                                                                                                                               |

## Testing

`Slider.test.tsx` (~37 cases):

### Rendering / structure

1. Renders with `role="slider"` for single value
2. Renders TWO `role="slider"` elements for range value `[min, max]`
3. Default tone applies `tone-default` class to the fill
4. Each tone applies its matching class (parameterized: default/success/warning/danger)
5. Each size applies its matching class (parameterized: sm/md/lg)
6. Default orientation is `'horizontal'`
7. `orientation="vertical"` applies the vertical class
8. `className` from props merges (does not replace) base class
9. `ref` is forwarded to the outermost div
10. Spreads native HTML attributes (`id`, `data-testid`, `aria-label`)

### Value / fill positioning

11. Single-mode `value={50}` (min=0, max=100): thumb positioned at 50%, fill from 0–50%
12. Range-mode `value={[20, 80]}`: two thumbs at 20% and 80%, fill spans 20–80%
13. Fractional step (min=0, max=1, step=0.1, value=0.3): thumb at 30% (verified via inline style)

### ARIA

14. Single mode: thumb has `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-orientation`
15. Range mode: both thumbs have correct `aria-valuenow` values
16. `aria-disabled="true"` on thumbs when `disabled`
17. `aria-orientation="vertical"` when vertical
18. `label={(v) => '${v}%'}` formats the `aria-valuetext`

### Keyboard

19. Arrow Right on focused thumb increments by step, fires `onChange` with new value
20. Arrow Left decrements by step
21. Home sets value to min
22. End sets value to max
23. PageUp adds 10×step
24. PageDown subtracts 10×step
25. Range thumb keyboard: left thumb can't cross right thumb (clamp)
26. Blur fires `onChangeEnd` once with the current value

### Pointer / drag (jsdom-friendly: simulate via pointer events, verify state via onChange callback fires)

27. PointerDown on track (not thumb) snaps the (only / nearest) thumb to click position
28. PointerDown + PointerMove on thumb fires `onChange` per move; PointerUp fires `onChangeEnd`
29. Range mode: pointer-dragging thumb 0 past thumb 1's position clamps to thumb 1's value (no swap)
30. Disabled: PointerDown does nothing (no `onChange`, no `onChangeEnd`)

### Marks + label

31. `marks={[0, 50, 100]}` renders 3 mark elements
32. `marks` with values within the fill range get `.markFilled` class
33. `label={true}` shows the value bubble on focused thumb
34. `label={(v) => '${v} GB'}` renders the formatted text in the bubble
35. `label={false}` (default) does NOT render a label element

### Hidden form input

36. `name="zoom"` single mode renders `<input type="hidden" name="zoom" value={50}>`
37. `name="price"` range mode renders TWO hidden inputs (`price-min` and `price-max`)


## Demo additions

`SliderDemo.tsx` — ~8 examples:

1. **Basic single** — controlled state with default props.
2. **Range** — controlled tuple, formatted label `${v.toLocaleString()}`.
3. **Sizes** — sm / md / lg stacked.
4. **Tones** — default / success / warning / danger with the same value to show the fill color.
5. **Marks** — `marks={[0, 25, 50, 75, 100]}` with auto-labels.
6. **Vertical** — single-thumb vertical slider, 200px tall.
7. **Fractional step** — min=1, max=3, step=0.1 (the ImageCrop zoom case).
8. **Disabled** — grayed thumb + track.

## AGENTS.md update

Add a `<Slider>` section in `packages/design-system/AGENTS.md` placed within the **Forms** cluster — after the `<FileUpload>` section (which lives between RadioGroup and Card per the FileUpload spec). The Forms cluster order then becomes: Input → Textarea → PasswordInput → PasswordStrengthMeter → Checkbox → Switch → Radio → RadioGroup → FileUpload → **Slider**.

Section contents:

- API table (value, onChange, onChangeEnd, min, max, step, marks, label, size, tone, orientation, disabled, name).
- The `SliderValue`, `SliderMark`, and tone/size/orientation type unions.
- Three canonical snippets: single (zoom for ImageCrop), range (price filter), vertical (volume).
- "Hard rule" callout:
  - ❌ Raw `<input type="range">` — use `<Slider>`. Range mode and vertical orientation aren't possible with the native input.
  - ❌ Hand-rolling drag math per page. Use the primitive.
  - ❌ Updating server state in `onChange` (fires on every pointer-move tick). Use `onChangeEnd` or debounce.

## Self-imposed constraints / decisions baked in

- **Controlled-only.** `value` is required. No `defaultValue`. Consumer owns state.
- **Discriminated union on `value`** instead of separate `<Slider>` + `<RangeSlider>` components. One component, type-switched.
- **Custom paint for ALL modes** (range mode forces it; single mode follows for consistency). Manual ARIA throughout.
- **`role="slider"` is locked** via `Omit<HTMLAttributes, 'role'>` on the props interface. Each thumb's role is the component's contract.
- **Pointer events (not mouse + touch separately).** Unified across mouse / pen / touch.
- **`setPointerCapture` on every thumb pointerdown** so drag works even when the pointer leaves the element.
- **`onChange` fires every move; `onChangeEnd` fires on release.** Consumer's responsibility to debounce expensive updates.
- **Sizes are fixed scales** (sm 4/14, md 6/18, lg 8/22 in px). No `size="custom"` escape hatch.
- **Default min/max/step is 0/100/1.** Matches `<input type="range">` convention.
- **Track click moves the nearest thumb** to the click position; range mode picks by distance.

## Hard Rule 8

Standard cycle: gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None — all design-space questions from the brainstorm were resolved during the API draft. The pre-implementation open questions in the brainstorm output (label placement on vertical, mark labels positioning, onChange vs onChangeEnd) are answered in the spec body above.

## Follow-up tasks (not part of this PR)

1. **Update AGENTS.md / library docs that mention TanStack Table as a dep of DataTable.** Per the brainstorm: DataTable IS consumed by the CRM, but it's hand-rolled — NOT a TanStack wrapper. Any reference to TanStack in the library docs needs correction. Separate small docs-only PR.
2. **Brainstorm + spec + plan + execute `<ImageCrop>`** in the next session. Settled decisions to carry forward: hand-roll on canvas, zoom IS in v1 (uses this Slider), rotation deferred, multi-touch deferred.
