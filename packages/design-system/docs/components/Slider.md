# `<Slider>` — controlled slider (single + range, horizontal + vertical)

```tsx
<Slider value={zoom} min={1} max={3} step={0.1} onChange={(v) => setZoom(v as number)} aria-label="Zoom" />

<Slider
  value={price}                                   // tuple → range mode
  min={0} max={100000} step={1000}
  label={(v) => `$${v.toLocaleString()}`}
  onChange={(v) => setPrice(v as [number, number])}
  aria-label="Price range"
/>

<Slider
  value={volume}
  orientation="vertical"
  marks={[0, 25, 50, 75, 100]}
  onChange={(v) => setVolume(v as number)}
/>
```

- **Controlled-only.** Always pass `value` + `onChange`. No `defaultValue`. Same architecture as FileUpload, Progress, and the rest of the controlled primitives.
- **`value: number | [number, number]`** — discriminated union. `number` for single-thumb; tuple for range (two-thumb). `onChange` mirrors the shape.
- **Range thumb names:** every range thumb must have a distinct accessible name. A root `aria-label="Price range"` produces “Price range, minimum” and “Price range, maximum” (localized); a root `aria-labelledby` is preserved and gets an appended localized suffix. Use `thumbLabels={['Lowest price', 'Highest price']}` when the names are domain-specific — explicit tuple labels win.
- **`onChange` fires per pointer-move tick (high frequency).** Debounce in the consumer OR use `onChangeEnd` (fires at pointerup, or at blur when the value actually changed) for server-state / expensive logic.
- `min`/`max`/`step` default to `0`/`100`/`1`. Fractional `step` (e.g. `0.1`) is the canonical way to do zoom/opacity controls.
- `size`: `sm` (4px track / 14px thumb) / `md` (6/18, default) / `lg` (8/22).
- `tone`: `default` (accent) / `success` / `warning` / `danger`. Use `warning`/`danger` for threshold-style sliders (disk usage, alert level).
- `orientation`: `horizontal` (default) / `vertical`. Vertical defaults to 200px tall; override via `style={{ height }}`.
- `marks`: `number[]` (auto-labeled) OR `SliderMark[]` (`{ value, label }`) for custom labels.
- `label`: `false` (default) / `true` (show `{value}` bubble on hover/focus/drag) / `(v) => ReactNode` (custom formatter; also sets `aria-valuetext`).
- `name`: when set, renders hidden `<input>`(s) so the slider works inside `<form action=...>`. Range mode emits TWO inputs with `-min` / `-max` suffixes. **Hidden inputs are NOT rendered when the slider is `disabled`** — prevents the form from submitting a stale disabled value (`disabled` is a no-op on `<input type="hidden">` per HTML spec).
- `disabled`: thumbs become non-interactive (`tabIndex=-1`, `aria-disabled`, `pointer-events: none` + `cursor: not-allowed` on each thumb).

#### Keyboard

- Arrow Left/Down: `-step`. Arrow Right/Up: `+step`.
- Page Down/Up: `-10×step` / `+10×step`.
- Home / End: jump to `min` / `max`.
- All keys respect range-mode clamping (`value[0] ≤ value[1]`). `onChange` per key. `onChangeEnd` fires on blur ONLY if the value actually changed during the focus session — Tab-in / Tab-out without any nav does NOT fire.

#### Hard rule

- ❌ Raw `<input type="range">` — can't do range mode, doesn't theme cleanly across browsers. Use `<Slider>`.
- ❌ Hand-rolling drag math per page. The pointer / keyboard handling is non-trivial; the primitive owns it.
- ❌ Hitting a network endpoint inside `onChange` — fires on every pointer-move tick. Use `onChangeEnd` or debounce.
- ❌ `<Slider role="region">` — `role="slider"` is locked on each thumb. The TypeScript `Omit` prevents the root override.
- ❌ Passing `value[0] > value[1]` in range mode. The component clamps but the inverted tuple is a consumer bug — fix the state shape.
