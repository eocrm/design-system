# ColorPicker Design Spec

**Status:** approved (brainstorm session 2026-05-24)
**Branch:** `feat/color-picker`
**Author:** Claude Opus 4.7 + dpws

---

## Goal

Ship `<ColorPicker>` for `@eocrm/design-system` — a controlled HEX color picker with two distribution shapes:

- **Popover variant** — compact trigger button that opens a Popover with the picker panel. The default narrative; matches the dominant CRM use case (color fields in forms / settings rows).
- **Inline variant** — the picker panel without the popover wrapping, exposed as `<ColorPicker.Panel>`. For theme builders, settings pages, and other contexts where the picker is always visible.

Hand-rolled per library convention: no `react-colorful`, `react-color`, or any other color-picker dep. Only `@floating-ui/react-dom` (already in use via `<Popover>`).

## Why now

- The CRM has multiple "pick a color for X" requirements pending across the theme settings, label tagging, calendar event tinting, and brand-color form flows. Inline copies of `<input type="color">` are showing up in mockups; landing this component preempts that drift.
- Library doesn't have any 2D pointer-driven control yet beyond ImageCrop's drag-to-pan. ColorPicker's SV square reuses the same drag-math patterns (`setPointerCapture` try/catch, ref-based drag state, clamping to a bounded rect), so it's a natural next step.

## Non-goals (deferred to v2)

- **Alpha channel.** No `#RRGGBBAA`, no alpha slider, no checkered transparency backgrounds. The `value` type stays `string`, which means alpha can be added later without an API break (accept either 6- or 8-char hex).
- **EyeDropper API.** `new EyeDropper().open()` is Chrome-only; defer until cross-browser support catches up.
- **RGB / HSL / HSV text inputs.** Only HEX text input in v1. Power-user numeric inputs are a v2 add.
- **Built-in default palette.** Presets are consumer-supplied only via the `presets?: string[]` prop. No bundled palette (always wrong for some CRM).
- **Color contrast indicator** ("WCAG AA against …").
- **Recently-used colors** with local-storage persistence.
- **Color names** ("red", "transparent"), `rgb()` / `hsl()` string parsing.
- **Hidden `<input type="color">`** for native form submission. CRM consumers use controlled state.

## Architecture

### File layout

```
packages/design-system/src/components/ColorPicker/
  ColorPicker.tsx          ← <ColorPicker> (popover wrapper) + <ColorPicker.Trigger>
  ColorPickerPanel.tsx     ← <ColorPicker.Panel> — the actual picker UI
  SVSquare.tsx             ← saturation/value 2D pad (focusable, drag + keyboard)
  colorMath.ts             ← hexToHsv / hsvToHex / normalizeHex utilities
  ColorPicker.module.scss
  ColorPicker.test.tsx     ← component tests (~20 cases)
  colorMath.test.tsx       ← pure-function tests (~10 cases)
  index.ts
```

Three source files because the SV square (drag math + coordinate conversion) and the color math (pure functions, no React) are each big enough to deserve their own focused file. The panel composes them with the embedded `<Slider>` for hue.

### Internal state model — the subtle part

The user controls value as **HEX**, but the UI thinks in **HSV** (SV square needs S+V, hue strip needs H). Naive approach: convert HEX → HSV on every render. Problem: HSV → HEX is **lossy at low saturation**. If the user drags hue while value=`#000000` (S=0, V=0), the HEX never changes — saturation=0 erases hue from the HEX. Then on the next render, HEX → HSV conversion can't recover the hue the user just dragged.

**Solution: local HSV state-of-truth while user interacts.** The panel maintains `localHsv` as the live source of truth. It syncs FROM the `value` prop on mount and when the prop changes from an external source. The "external source" detection compares the prop's normalized HEX against `hsvToHex(localHsv)` — if they match, the panel did this (skip), otherwise the consumer set a new value externally (update local).

```tsx
const [localHsv, setLocalHsv] = useState(
  () => hexToHsv(value) ?? { h: 0, s: 0, v: 0 },
);

useEffect(() => {
  const ourHex = hsvToHex(localHsv);
  if (ourHex !== normalizeHex(value)) {
    const incoming = hexToHsv(value);
    if (incoming) setLocalHsv(incoming);
  }
}, [value]); // intentionally not depending on localHsv — we are the writer

const updateHsv = (next: HSV) => {
  setLocalHsv(next);
  onChange(hsvToHex(next));
};
```

Same pattern as Slider's `latestValueRef`, generalized to a tuple.

### SV square — CSS gradients, NOT canvas

Background is two stacked linear-gradients (`to right, white→transparent` + `to top, black→transparent`) layered over a solid hue-only color block. The indicator dot is a positioned `<div>` at `left: s%; top: (100-v)%`. No canvas, no per-pixel rendering. Pointer drag uses `setPointerCapture` wrapped in try/catch (jsdom doesn't implement it, same as Slider/ImageCrop).

### Hue strip — embedded Slider with custom track gradient

The library's `<Slider>` with `value={h}`, `min={0}`, `max={360}`, `step={1}`. Track background is overridden via inline style: `style={{ '--track-bg': 'linear-gradient(to right, ...rainbow...)' }}` — the rainbow gradient is inline (token colors don't include hue stops).

### HEX input — `<Input size="sm">` with input-state buffering

Three input states:
1. **Synced** — input text equals normalized HEX of current value. Default.
2. **Editing** — user is typing, text doesn't yet equal a normalized HEX. Show input with normal styling. If text parses to valid HEX *during* typing, commit (so `#4f4` becomes `#44FF44` live).
3. **Invalid** — typed text doesn't parse. Show `invalid` styling. On blur OR Enter with invalid, snap input back to canonical HEX of the current value.

Lowercase input accepted; output always uppercase `#RRGGBB`. Hash optional on input; output always includes `#`.

### Default trigger swatch

A `<button>` shaped like an Input field (matching height, border-radius, --color-border) with a colored swatch on the left and the HEX text after, like `[█] #4F46E5`. Accessible label = `triggerLabel` prop or default `"Pick a color"` — the current HEX is exposed via `aria-describedby` pointing to the rendered text node, so screen readers announce both. The trigger's ARIA matches whatever `<Popover.Trigger>` sets in the library today (likely `aria-haspopup="true"` + `aria-expanded`).

### Custom trigger semantics (`<ColorPicker.Trigger asChild>`)

When a consumer overrides the trigger:
- `triggerLabel` is **ignored** — the consumer's child element owns its accessible label.
- `popoverPlacement` is **still honored** — placement is the popover's concern, not the trigger's.
- `disabled` propagates onto the child via `aria-disabled` and prevents the popover from opening.
- The child must accept `onClick` and `ref` (Slot-style composition, matching the existing Popover.Trigger).

## Public API

```ts
export interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current color as `#RRGGBB`. Controlled — required. */
  value: string;
  /** Fires per drag tick + on input change + on preset click. High frequency during drags. */
  onChange: (hex: string) => void;
  /**
   * Fires on the trailing edge of an interaction — pointer release on the
   * SV pad / hue slider, blur on the HEX input, preset click. Use for
   * commit-style logic (network calls, history snapshots).
   */
  onChangeEnd?: (hex: string) => void;
  /**
   * Optional preset color swatches. If provided, rendered as a grid below
   * the hue slider. Clicking a swatch commits the color (fires both
   * onChange and onChangeEnd). Each entry should be a valid `#RRGGBB`.
   */
  presets?: string[];
  /** Disable interaction. Trigger doesn't open; panel is non-interactive. */
  disabled?: boolean;
  /**
   * Accessible label for the default trigger. Default `"Pick a color"`.
   * When set, the trigger announces `"<triggerLabel>, current value <hex>"`.
   */
  triggerLabel?: string;
  /** Popover placement. Default `'bottom-start'`. */
  popoverPlacement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
  /** Optional `<ColorPicker.Trigger asChild>` override for custom triggers. */
  children?: ReactNode;
}

export interface ColorPickerPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string;
  onChange: (hex: string) => void;
  onChangeEnd?: (hex: string) => void;
  presets?: string[];
  disabled?: boolean;
}

export interface ColorPickerTriggerProps {
  /** When true, merge trigger semantics onto the child element. */
  asChild?: boolean;
  children: ReactNode;
}
```

**Re-exported color utilities** (public — useful for downstream theme builders that need their own conversions):

```ts
export function hexToHsv(hex: string): { h: number; s: number; v: number } | null;
export function hsvToHex(hsv: { h: number; s: number; v: number }): string;
export function normalizeHex(input: string): string | null;
```

## Interactions

### SV square keyboard

- Tab to focus.
- `ArrowLeft` / `ArrowRight` — saturation ±1%.
- `ArrowUp` / `ArrowDown` — value ±1%.
- `Shift+arrow` — ±10% step.
- `Home` — S=0, V unchanged.
- `End` — S=100, V unchanged.
- `PageUp` / `PageDown` — V=100 / V=0.

`role="application"` + `aria-label="Saturation and brightness"` + `aria-valuetext="saturation X percent, brightness Y percent"` (same role precedent as ImageCrop's viewport — 2D pointer-driven control without a standard ARIA pattern).

### Hue slider

Inherits Slider's built-in keyboard. Slider's `onChange` per-tick is piped into `updateHsv({ ...localHsv, h: next })`. Slider's `onChangeEnd` → our `onChangeEnd`.

### HEX input

Commit triggers:
- Valid parse during typing → live commit (panel updates immediately).
- Blur with valid text → commit normalized form.
- Blur with invalid text → revert to canonical HEX.
- `Enter` with valid → commit + blur. With invalid → revert + blur.

### Presets

Grid of `<button>` swatches (CSS `grid-template-columns: repeat(auto-fill, minmax(24px, 1fr))`). Each button:
- `aria-label="<HEX>"`.
- Click → `updateHsv(hexToHsv(preset))` AND `onChangeEnd(preset)` (preset click is a "committed" change, not a drag-in-progress).
- Selected state when the swatch's HEX matches current value: focus ring + small check icon overlay.

### Popover behavior

- Default placement `bottom-start`.
- Closes on: outside click, Escape, focus moving outside.
- No focus trap (settings widget, not a modal).
- First focus on open → SV square.
- No explicit "Done" / "Cancel" buttons (changes commit live; consumer reads `value`).

### Disabled state

- Trigger: `aria-disabled`, no popover opens, dimmed via `--opacity-disabled`.
- Panel: SV pad `pointer-events: none`, indicator dot dimmed; Slider gets `disabled`; HEX input gets `disabled`; presets `aria-disabled`.
- Whole panel `opacity: var(--opacity-disabled)`.

## Edge cases

| Case | Behavior |
| --- | --- |
| Invalid initial `value` (e.g., `""`, `"orange"`) | `hexToHsv` returns `null`, fall back to `#000000`, emit dev-only `console.warn` once like Slider does. |
| 3-char hex (`#F00`) | `normalizeHex` expands to `#FF0000`. Accepted on input, output always 6-char. |
| Lowercase hex | Accepted on input, output always uppercase. |
| Missing hash (`FF00FF`) | Accepted on input, output always with `#`. |
| Saturation=0 hue preservation | Handled by local HSV state model (above). |
| Value=0 hue preservation | Same. Drag hue while at black: HEX stays `#000000`, local `h` updates; raising V recovers the hue. |
| HSV ↔ HEX rounding drift | Math uses floats; HEX uses `Math.round` per channel. Indicator dot reads from `localHsv` (not round-tripped HEX), so single-pixel rounding never flickers the dot. |

## Color math implementation

```ts
// colorMath.ts — pure functions, no React

export interface HSV { h: number; s: number; v: number; }

const HEX_PATTERN = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function normalizeHex(input: string): string | null {
  const match = HEX_PATTERN.exec(input.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  return `#${hex.toUpperCase()}`;
}

export function hexToHsv(input: string): HSV | null {
  const normalized = normalizeHex(input);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const sf = s / 100;
  const vf = v / 100;
  const c = vf * sf;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; }
  else if (hp < 2) { r1 = x; g1 = c; }
  else if (hp < 3) { g1 = c; b1 = x; }
  else if (hp < 4) { g1 = x; b1 = c; }
  else if (hp < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const m = vf - c;
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}
```

## SVSquare component (sketch)

```tsx
interface SVSquareProps {
  hue: number;        // 0..360 (drives the background hue layer)
  s: number;          // 0..100
  v: number;          // 0..100
  onChange: (s: number, v: number) => void;
  onChangeEnd?: () => void;
  disabled?: boolean;
}

export const SVSquare = forwardRef<HTMLDivElement, SVSquareProps>(function SVSquare(
  { hue, s, v, onChange, onChangeEnd, disabled },
  ref,
) {
  const padRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const commitFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextS = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const nextV = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
    onChange(nextS, nextV);
  };

  // pointerdown / pointermove / pointerup, with setPointerCapture wrapped in try/catch
  // keyboard handler with the documented ±1% / ±10% / Home/End / PageUp/PageDown semantics

  return (
    <div
      ref={(node) => {
        padRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="application"
      aria-label="Saturation and brightness"
      aria-valuetext={`saturation ${Math.round(s)} percent, brightness ${Math.round(v)} percent`}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={styles.svSquare}
      style={{
        backgroundColor: `hsl(${hue}, 100%, 50%)`,
        // backgroundImage stacked in SCSS via the gradient layers
      }}
      onPointerDown={...}
      onPointerMove={...}
      onPointerUp={...}
      onKeyDown={...}
    >
      <div
        className={styles.svIndicator}
        style={{ left: `${s}%`, top: `${100 - v}%` }}
      />
    </div>
  );
});
```

## Styling

`packages/design-system/src/components/ColorPicker/ColorPicker.module.scss` — token-only colors / spacing / radii.

Key classes:
- `.panel` — root panel container, `display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3); width: 240px;`. The fixed 240px width is intentional for the popover so layout doesn't jump.
- `.svSquare` — `position: relative; aspect-ratio: 1; border-radius: var(--radius-md); overflow: hidden; cursor: crosshair;`. Background: stacked linear-gradients applied via `::before` / `::after` pseudos to keep the inline `style` simple (`backgroundColor` only).
- `.svIndicator` — `position: absolute; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px rgb(0 0 0 / 50%); transform: translate(-50%, -50%); pointer-events: none;`. The white ring + dark outer shadow keeps the indicator visible on any color background.
- `.hueSlider` — wrapper to override the Slider's track via `--track-bg` custom property.
- `.hexInput` — wrapper around `<Input size="sm">`, no special styling.
- `.presets` — `display: grid; grid-template-columns: repeat(auto-fill, minmax(24px, 1fr)); gap: var(--space-2);`.
- `.presetSwatch` — `width: 100%; aspect-ratio: 1; border-radius: var(--radius-sm); border: var(--border-width) solid var(--color-border); cursor: pointer;`. Selected state adds a check icon overlay + focus ring.
- `.trigger` — input-field-shaped button: `display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg);`. Has a `.triggerSwatch` child (16×16, rounded) and trailing HEX text.
- `.disabled` — applied to root, sets `opacity: var(--opacity-disabled)` and `pointer-events: none` on interactive children.

Standard stylelint considerations:
- `cursor: crosshair` / `cursor: pointer` / `pointer-events: none` need inline `// stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword` comments.
- The white indicator dot and the 0.5-alpha shadow are raw colors; needs an inline disable explaining "indicator must be visible against any color, can't use token".
- The rainbow gradient inline style is inline `style={{ background: ... }}` (not in SCSS) — bypasses stylelint.

## Testing strategy

### `colorMath.test.tsx` (~10 cases, pure functions)

```ts
describe('hexToHsv / hsvToHex', () => {
  it.each([
    ['#FF0000', { h: 0, s: 100, v: 100 }],
    ['#00FF00', { h: 120, s: 100, v: 100 }],
    ['#0000FF', { h: 240, s: 100, v: 100 }],
    ['#FFFFFF', { h: 0, s: 0, v: 100 }],
    ['#000000', { h: 0, s: 0, v: 0 }],
    ['#808080', { h: 0, s: 0, v: ~50 }],  // approx — use toBeCloseTo
  ])('hexToHsv(%s) → %o', (hex, expected) => { ... });

  it('hexToHsv returns null for invalid input', () => {
    for (const bad of ['orange', '', '#GGG', '12345', '#12']) {
      expect(hexToHsv(bad)).toBeNull();
    }
  });

  it('hsvToHex outputs uppercase #RRGGBB', () => { ... });

  it('normalizeHex accepts loose input', () => {
    expect(normalizeHex('#fff')).toBe('#FFFFFF');
    expect(normalizeHex('FFF')).toBe('#FFFFFF');
    expect(normalizeHex('ffffff')).toBe('#FFFFFF');
    expect(normalizeHex('#FFFFFF')).toBe('#FFFFFF');
  });

  it('roundtrip stability', () => {
    const palette = ['#FF0000', '#4F46E5', '#10B981', '#F59E0B', /* ... 16+ values */];
    for (const hex of palette) {
      expect(hsvToHex(hexToHsv(hex)!)).toBe(hex);
    }
  });
});
```

### `ColorPicker.test.tsx` (~20 cases)

Grouped:

- **Rendering** (5 cases): Panel renders with default value; popover trigger renders current HEX in label; custom trigger via `<ColorPicker.Trigger asChild>` renders override; SV indicator positions correctly for given S/V; hue slider thumb at correct H.
- **Controlled value** (3 cases): changing `value` prop updates indicator + hue + HEX input; saturation=0 preserves local hue across re-renders; setting invalid `value` falls back to `#000000` and warns once in dev.
- **SV square interaction** (4 cases): pointerdown+move fires `onChange` with expected HEX (mocked rect math); arrow keys ±1% S/V; Shift+arrow ±10%; Home/End jump to S=0/100.
- **Hue slider interaction** (1 case): Slider onChange propagates and updates HEX.
- **HEX input** (3 cases): typing valid hex fires `onChange` live; typing invalid sets `invalid` styling, no `onChange`; blur with invalid resets to canonical.
- **Presets** (2 cases): clicking a preset fires `onChange` + `onChangeEnd`; selected preset matches current value (check icon visible).
- **Popover** (3 cases): trigger click opens panel; outside click closes; disabled trigger doesn't open.
- **Disabled** (1 case): SV pad non-interactive, slider disabled, input disabled, presets aria-disabled.
- **Misc** (2 cases): `className` merges with base class on root; `ref` forwards to outermost div.

Total: ~24 component tests + ~10 math tests = **~34 tests**.

### Test mocking patterns

- `setPointerCapture` shim (already in test files for Popover/ImageCrop).
- `ResizeObserver` shim (Popover uses Floating UI).
- Mock `getBoundingClientRect` on the SV pad to return a known rect for deterministic pointer math.

## Demo additions

`packages/playground/src/pages/components/ColorPickerDemo.tsx` with 5 examples:

1. **Inline panel, no presets** — `<ColorPicker.Panel value={hex} onChange={setHex} />` with live HEX text below.
2. **Popover with default trigger** — the canonical CRM form-field shape.
3. **Popover with custom trigger** — `<ColorPicker.Trigger asChild>` wrapping a `<Button>`.
4. **Inline with presets** — `presets={CRM_BRAND_COLORS}` (a handful of typical brand colors as the array, e.g. `['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6']`).
5. **Disabled** — inline + popover side-by-side, both disabled.

## 4-place wiring

- **`App.tsx`** — `<Route path="/components/color-picker" element={<ColorPickerDemo />} />` inserted alphabetically.
- **`AppShell.tsx`** — Forms cluster, between **Checkbox** (`C-h-e`) and **Date pickers** (`D`). Lucide icon: `Palette`.
- **`ComponentsIndex.tsx`** — card with a small inline `<ColorPicker.Panel>` preview, `pointerEvents: 'none'`.
- **`registry.ts`** — extend `ComponentName` union with `'ColorPicker'`.

## AGENTS.md addition

New section in Forms cluster, after Checkbox, before DatePicker. Covers:
- Compound API (`<ColorPicker>`, `<ColorPicker.Panel>`, `<ColorPicker.Trigger>`).
- Controlled `value: string` (`#RRGGBB`).
- onChange (per-tick) vs onChangeEnd (commit).
- `presets` for consumer-supplied swatches.
- Color math utilities (`hexToHsv`, `hsvToHex`, `normalizeHex`) as public exports.
- Hard-rule anti-patterns:
  - ❌ Passing non-HEX values (named colors, `rgb()`, alpha hex).
  - ❌ Exposing internal HSV state as a prop (the consumer's contract is HEX-only).
  - ❌ Hand-rolling a color picker per page when this exists.
  - ❌ Bundling a default palette inside the consumer; pass via `presets`.
  - ❌ Calling `extractCropBlob`-style heavy work in `onChange` — use `onChangeEnd`.

## Hard Rule 8 — review cycle

Standard cycle. Particular things to flag for the reviewer:
- HSV state-of-truth model and the `useEffect` external-write detection (subtle; easy to break).
- `role="application"` on SV square — verify the ARIA story holds.
- Hue=0 / saturation=0 / value=0 edge cases (the local-state pattern handles them; verify with the test that drags hue at black).
- Color math: roundtrip stability across the test palette.
- `npm pack --dry-run` includes the new files, excludes test files.

## Follow-up work (out of scope)

- Alpha support (`#RRGGBBAA`) — additive, non-breaking API extension.
- EyeDropper API button with feature detection.
- RGB / HSL numeric inputs for power users.
- Color contrast hint ("AA against #FFFFFF: pass").
- Recently-used colors with localStorage.
- Crop-friendly named-color parsing (`"red"`, `"transparent"`).
- Built-in CRM brand palette as an exported `BRAND_COLORS` constant (defer until we know the actual brand colors).
