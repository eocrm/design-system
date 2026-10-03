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

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `invalid` | `boolean` | no | false | Marks each thumb `aria-invalid` for Field / SettingRow composition. |
| `required` | `boolean` | no | — | Consumed for Field / SettingRow composition (they render the visible required marker). `role="slider"` does not support `aria-required` and a slider always has a value, so nothing is forwarded. |
| `value` | `SliderValue` | yes | — | Current value. A single `number` for one-thumb mode; a `[min, max]` tuple for two-thumb (range) mode. The component type-discriminates internally. Required — Slider is controlled-only. |
| `onChange` | `(value: SliderValue) => void` | yes | — | Called on every thumb-drag tick (high frequency). For server-side or expensive update logic, prefer `onChangeEnd` or debounce in the consumer. The argument has the same shape as `value`: `number` for single, `[number, number]` for range. |
| `onChangeEnd` | `((value: SliderValue) => void)` | no | — | Called once when the user "commits" a value change — at pointerup after a drag, or at blur after keyboard-nav that actually changed the value. Does NOT fire on Tab-in / Tab-out without any value change. Use for committing the value to a server or running an expensive recalculation. Receives the final value with the same shape as `value`. |
| `min` | `number` | no | — | Minimum allowed value (inclusive). Default `0`. |
| `max` | `number` | no | — | Maximum allowed value (inclusive). Default `100`. |
| `step` | `number` | no | — | Step granularity. Default `1`. Use fractional steps (e.g. `0.1`) for zoom / opacity-style controls. Values are snapped to `min + (n * step)`. |
| `marks` | `number[] \| SliderMark[]` | no | — | Tick marks. Pass `number[]` for auto-labeled ticks (label = value) or `SliderMark[]` for custom labels (label = ReactNode). Marks render under the track (horizontal) or to the right (vertical). |
| `label` | `boolean \| ((value: number) => ReactNode)` | no | — | Value bubble on the thumb. - `false` (default) — no bubble. - `true` — show the current value (formatted via `toString()`) on hover / focus / drag. Auto-hides otherwise. - `(value: number) => ReactNode` — custom formatter. For range mode, the formatter is called once per thumb. |
| `thumbLabels` | `readonly [string, string]` | no | — | Explicit accessible names for the minimum and maximum thumbs in range mode. These win over a root `aria-label` or `aria-labelledby`; use them when the thumbs need domain-specific names such as `['Start date', 'End date']`. When an entry is omitted OR empty — an empty string is not an explicit name — that thumb falls back to a root label suffixed with the localized “minimum” or “maximum” name. The two entries are resolved independently, so `['', 'End date']` names only the maximum thumb. |
| `size` | `SliderSize` | no | — | Track + thumb sizing. Defaults to `'md'`. - `sm` — 4px track, 14px thumb. - `md` — 6px track, 18px thumb (default). - `lg` — 8px track, 22px thumb. |
| `tone` | `SliderTone` | no | — | Fill color tone (the track segment between min and value). Defaults to `'default'` (accent). State-coded `success` / `warning` / `danger` for threshold-style sliders (e.g. disk usage approaching capacity). |
| `orientation` | `SliderOrientation` | no | — | Orientation. Defaults to `'horizontal'`. |
| `disabled` | `boolean` | no | — | Disabled state. Defaults to `false`. |
| `name` | `string` | no | — | Native form-input name. When set, a hidden `<input>` (or two for range, with `-min`/`-max` suffixes) is rendered with the current value(s) so the slider works inside uncontrolled HTML forms without consumer JS serialization. When the slider is `disabled`, the hidden input(s) are NOT rendered so the form does not submit a stale disabled value. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

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

Custom-painted rather than wrapping `<input type="range">`, because range mode needs two thumbs.

```tsx
// Tone-coded threshold (disk usage approaching capacity):
<Slider
  value={usage}
  tone={usage > 90 ? 'danger' : usage > 75 ? 'warning' : 'default'}
  onChange={(v) => setUsage(v as number)}
  label
/>

// Form submission via `name` — renders hidden inputs the form picks up:
<form action="/api/settings" method="post">
  <Slider name="brightness" value={brightness} onChange={setB} />
  <button type="submit">Save</button>
</form>
```

**When NOT to use**

- Binary state: use `<Switch>` or `<Checkbox>`.
- Pick one of a small enumerated set: use `<RadioGroup>` or `<Select>`.
- Continuous colour picking: that is a colour picker (not yet shipped).
- Server-bound expensive updates on every move tick: use `onChangeEnd` or debounce.
