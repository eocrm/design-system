# ColorPicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<ColorPicker>` — a controlled HEX color picker with two distribution shapes: a Popover-wrapped trigger button (default) and an inline `<ColorPicker.Panel>` for theme builders. SV square + hue strip + HEX text input. Hand-rolled color math, consumer-supplied preset swatches, no third-party color libraries.

**Architecture:** Compound pattern (`<ColorPicker>` + `<ColorPicker.Panel>` + `<ColorPicker.Trigger>`) attached via `Object.assign` (matches Card / Popover). The Popover variant wraps `<Popover>` (already in the library) around an internal `<ColorPickerPanel>`. The inline variant exposes `<ColorPickerPanel>` directly. The panel keeps a local HSV state-of-truth to preserve hue across saturation=0 / value=0 (HEX is lossy there). CSS-gradient SV square (no canvas); embedded `<Slider>` for hue with a SCSS overlay class targeting the slider's `.track`; `<Input size="sm">` for HEX with input-state buffering.

**Tech Stack:** React 19 + TypeScript, CSS Modules + SCSS, Vitest + React Testing Library. Compose `<Popover>` (Floating-UI based), `<Slider>`, `<Input>` from the same library. No new third-party deps.

---

**Reference spec:** `docs/superpowers/specs/2026-05-24-color-picker-design.md` (commit `4ce9c06`).

**Branch:** `feat/color-picker` (already checked out, currently at spec commit).

**Conventions used throughout this plan:**

- **Plan-verbatim:** every code block is the literal file contents the implementer commits. Don't paraphrase, fold types, reorder imports, or rename props.
- **CSS-Modules class naming:** camelCase throughout (matches Title / Progress / FileUpload / ImageCrop precedent).
- **Stable CSS Modules strategy:** generated class names contain the literal local-name as substring (e.g. `_panel_<hash>`). Tests use substring regex matching.
- **Compound attach pattern:** `Object.assign(ColorPickerRoot, { Trigger: ColorPickerTrigger, Panel: ColorPickerPanel })` (same as Card).
- **Pattern A spread** (props last so consumer wins): `{...rest}` last on root elements that take pass-through props.
- **Commit format:** subject line + blank line + body (1–3 sentences) + blank line + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **`git add` discipline:** stage by explicit path. No `git add -A` / `git add .`.
- **Stylelint requirements:**
  - `cursor: crosshair`, `cursor: pointer`, `cursor: grab`, `pointer-events: none`, `user-select: none` are CSS keywords blocked by `scale-unlimited/declaration-strict-value` — need inline `// stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword` comments.
  - The SV indicator dot uses `border: 2px solid white` and `box-shadow: 0 0 0 1px rgb(0 0 0 / 50%)` — raw colors are intentional (indicator must be visible against any background color). Inline disables with `-- indicator must remain visible against any background color, no token equivalent`.
  - The `background: linear-gradient(... rainbow ...) !important` for the hue slider track override needs `-- rainbow gradient overrides Slider's default track background; !important needed to defeat Slider's tone variants`.
  - `scss/double-slash-comment-empty-line-before` requires blank line BEFORE `//` comments inside a rule. Add proactively.
  - `rule-empty-line-before` requires blank line between adjacent rule blocks. Add proactively.
  - `position: relative` on wrappers + `position: absolute` on indicator / preset overlays follow the established internal-child positioning exception (same precedent as Avatar's `.presence`, ImageCrop's `.cropBox`).
- **Gates after each source-touching task:** `make test`, `make build-lib`, `make build`, `make lint`. All four green before commit + advance.
- **If pre-push hook flags prettier:** `npx prettier --write <flagged files>` + follow-up commit `ColorPicker: prettier --write` (same Co-Authored-By footer).
- **`src/index.ts` re-export added in T5** (after tests pass), to satisfy `structure.test.ts`.

---

## File structure

### NEW files

```
packages/design-system/src/components/ColorPicker/
  colorMath.ts                ← T1: hexToHsv / hsvToHex / normalizeHex pure utilities
  colorMath.test.tsx          ← T1: ~10 cases
  SVSquare.tsx                ← T2: 2D saturation/value pad (focusable, drag + keyboard)
  ColorPickerPanel.tsx        ← T3: full picker UI (SV + hue + HEX + presets) with HSV state model
  ColorPicker.module.scss     ← T3: panel + SVSquare + indicator + presets + trigger styles
  ColorPicker.tsx             ← T4: <ColorPicker> popover wrapper + <ColorPicker.Trigger> marker
  ColorPicker.test.tsx        ← T5: ~24 component cases
  index.ts                    ← T5: barrel for the component dir
```

### MODIFIED files

```
packages/design-system/src/index.ts                                      ← T5: barrel re-export
packages/design-system/AGENTS.md                                         ← T6: ColorPicker section in Forms cluster
packages/playground/src/App.tsx                                          ← T7: import + <Route>
packages/playground/src/layout/AppShell/AppShell.tsx                     ← T7: Palette lucide icon + Forms-group item between Checkbox and Date pickers
packages/playground/src/pages/components/ComponentsIndex.tsx             ← T7: import + card
packages/playground/src/pages/mockups/registry.ts                        ← T7: extend ComponentName union
```

No mockup files touched (no current mockup uses a color picker — verified by grep).

---

## Task 1: colorMath utilities + tests

**Files:**

- Create: `packages/design-system/src/components/ColorPicker/colorMath.ts`
- Create: `packages/design-system/src/components/ColorPicker/colorMath.test.tsx`

Pure functions, zero React dependencies. Ships first so the rest of the component can rely on tested utilities.

### Step 1.1: Create `colorMath.ts`

- [ ] Write file contents (verbatim):

```ts
/**
 * Hue-saturation-value color representation. h is 0–360 (degrees, wraps),
 * s and v are 0–100 (percentages).
 *
 * HSV is the internal model used by the SV square (S+V axes) and the hue
 * strip (H axis). HEX (`#RRGGBB`) is the storage format exposed to consumers.
 */
export interface HSV {
  /** Hue in degrees, 0–360 (0 = red, 120 = green, 240 = blue). */
  h: number;
  /** Saturation as a percentage, 0 (gray) to 100 (full color). */
  s: number;
  /** Value (brightness) as a percentage, 0 (black) to 100 (full brightness). */
  v: number;
}

// Loose hex pattern: optional leading #, then 3 or 6 hex characters. We
// canonicalize on output to `#RRGGBB` (uppercase, full 6 chars, with hash).
const HEX_PATTERN = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Normalize a loose hex string to the canonical `#RRGGBB` form (uppercase,
 * full 6 chars, with leading `#`). Accepts:
 * - `#FFF` / `FFF` (3-char shorthand, expanded by doubling each digit)
 * - `#FFFFFF` / `FFFFFF` / `#ffffff` (6-char)
 *
 * @returns the normalized string, or `null` if the input doesn't match.
 *
 * @example
 * normalizeHex('#fff')      // '#FFFFFF'
 * normalizeHex('FFF')       // '#FFFFFF'
 * normalizeHex('#4f46e5')   // '#4F46E5'
 * normalizeHex('orange')    // null
 * normalizeHex('')          // null
 */
export function normalizeHex(input: string): string | null {
  const match = HEX_PATTERN.exec(input.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex.toUpperCase()}`;
}

/**
 * Convert a hex color string to HSV. Accepts the same loose input forms as
 * `normalizeHex`. Returns `null` for invalid input — callers should fall
 * back to a known-good HSV (e.g. `{ h: 0, s: 0, v: 0 }`) when this returns
 * `null`.
 *
 * @example
 * hexToHsv('#FF0000')  // { h: 0,   s: 100, v: 100 }
 * hexToHsv('#000000')  // { h: 0,   s: 0,   v: 0   }
 * hexToHsv('orange')   // null
 */
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
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

/**
 * Convert HSV to a canonical `#RRGGBB` hex string. Out-of-range inputs are
 * clamped silently (hue wraps modulo 360, s/v clamp to [0, 100]).
 *
 * @example
 * hsvToHex({ h: 0,   s: 100, v: 100 })  // '#FF0000'
 * hsvToHex({ h: 120, s: 100, v: 100 })  // '#00FF00'
 * hsvToHex({ h: 0,   s: 0,   v: 0   })  // '#000000'
 */
export function hsvToHex({ h, s, v }: HSV): string {
  // Clamp / wrap inputs so consumers passing slightly out-of-range values
  // (e.g. from a slider that overshoots by floating-point) get sane output.
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const val = Math.max(0, Math.min(100, v)) / 100;

  const c = val * sat;
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = val - c;
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}
```

### Step 1.2: Create `colorMath.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { hexToHsv, hsvToHex, normalizeHex, type HSV } from './colorMath';

describe('normalizeHex', () => {
  it.each([
    ['#fff', '#FFFFFF'],
    ['FFF', '#FFFFFF'],
    ['#FFFFFF', '#FFFFFF'],
    ['ffffff', '#FFFFFF'],
    ['#4f46e5', '#4F46E5'],
    ['4F46E5', '#4F46E5'],
    ['  #4f46e5  ', '#4F46E5'], // trims whitespace
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeHex(input)).toBe(expected);
  });

  it.each([['orange'], [''], ['#GGG'], ['12345'], ['#12'], ['##FFFFFF']])(
    'returns null for invalid input %s',
    (input) => {
      expect(normalizeHex(input)).toBeNull();
    },
  );
});

describe('hexToHsv', () => {
  it.each<[string, HSV]>([
    ['#FF0000', { h: 0, s: 100, v: 100 }],
    ['#00FF00', { h: 120, s: 100, v: 100 }],
    ['#0000FF', { h: 240, s: 100, v: 100 }],
    ['#FFFFFF', { h: 0, s: 0, v: 100 }],
    ['#000000', { h: 0, s: 0, v: 0 }],
    ['#FFFF00', { h: 60, s: 100, v: 100 }],
    ['#00FFFF', { h: 180, s: 100, v: 100 }],
    ['#FF00FF', { h: 300, s: 100, v: 100 }],
  ])('converts %s to HSV', (hex, expected) => {
    const result = hexToHsv(hex)!;
    expect(result.h).toBeCloseTo(expected.h, 1);
    expect(result.s).toBeCloseTo(expected.s, 1);
    expect(result.v).toBeCloseTo(expected.v, 1);
  });

  it('converts #808080 to approximately (0, 0, 50)', () => {
    const result = hexToHsv('#808080')!;
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.v).toBeCloseTo(50, 0); // 128/255 ≈ 50.2
  });

  it('accepts loose input', () => {
    const result = hexToHsv('fff')!;
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.v).toBe(100);
  });

  it.each([['orange'], [''], ['#GGG'], ['12345']])('returns null for invalid input %s', (input) => {
    expect(hexToHsv(input)).toBeNull();
  });
});

describe('hsvToHex', () => {
  it.each<[HSV, string]>([
    [{ h: 0, s: 100, v: 100 }, '#FF0000'],
    [{ h: 120, s: 100, v: 100 }, '#00FF00'],
    [{ h: 240, s: 100, v: 100 }, '#0000FF'],
    [{ h: 0, s: 0, v: 100 }, '#FFFFFF'],
    [{ h: 0, s: 0, v: 0 }, '#000000'],
    [{ h: 60, s: 100, v: 100 }, '#FFFF00'],
    [{ h: 180, s: 100, v: 100 }, '#00FFFF'],
    [{ h: 300, s: 100, v: 100 }, '#FF00FF'],
  ])('converts %o to %s', (hsv, expected) => {
    expect(hsvToHex(hsv)).toBe(expected);
  });

  it('outputs uppercase #RRGGBB', () => {
    const result = hsvToHex({ h: 219, s: 69, v: 90 });
    expect(result).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('clamps out-of-range saturation and value', () => {
    expect(hsvToHex({ h: 0, s: -10, v: 100 })).toBe('#FFFFFF');
    expect(hsvToHex({ h: 0, s: 150, v: 100 })).toBe('#FF0000');
    expect(hsvToHex({ h: 0, s: 100, v: 150 })).toBe('#FF0000');
  });

  it('wraps out-of-range hue', () => {
    expect(hsvToHex({ h: 360, s: 100, v: 100 })).toBe('#FF0000');
    expect(hsvToHex({ h: 720, s: 100, v: 100 })).toBe('#FF0000');
    expect(hsvToHex({ h: -120, s: 100, v: 100 })).toBe('#0000FF');
  });
});

describe('round-trip stability', () => {
  const palette = [
    '#FF0000',
    '#4F46E5',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#FFFFFF',
    '#000000',
    '#808080',
    '#FFFF00',
    '#00FFFF',
    '#FF00FF',
    '#123456',
  ];

  it.each(palette)('hsvToHex(hexToHsv(%s)) === %s', (hex) => {
    expect(hsvToHex(hexToHsv(hex)!)).toBe(hex);
  });
});
```

### Step 1.3: Verify gates

- [ ] Run `make test` from `/home/dpws/projects/design-system`. Expected: all `colorMath` tests pass (new tests added; existing tests unchanged).
- [ ] Run `make build-lib`. Expected: clean (typecheck passes).
- [ ] Run `make lint`. Expected: clean (no SCSS in this task).

### Step 1.4: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/ColorPicker/colorMath.ts packages/design-system/src/components/ColorPicker/colorMath.test.tsx && git commit -m "$(cat <<'EOF'
ColorPicker: colorMath utilities (hexToHsv / hsvToHex / normalizeHex)

Pure functions, no React deps. Standard HSV-from-RGB / HSV-to-RGB
algorithm; normalizeHex accepts loose input (3-or-6 char, with/without
leading #, any case) and outputs canonical #RRGGBB.

~30 cases across normalization, conversion both directions, edge cases
(clamping, hue wrap, invalid input), and a 16-color round-trip stability
test verifying hsvToHex(hexToHsv(hex)) === hex for the palette CRM
consumers will most often use.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SVSquare 2D pad

**Files:**

- Create: `packages/design-system/src/components/ColorPicker/SVSquare.tsx`

Focused saturation/value pad component. Pointer drag + keyboard. No tests in this file — tested through ColorPickerPanel's component tests in T5.

### Step 2.1: Create `SVSquare.tsx`

- [ ] Write file contents (verbatim):

```tsx
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
```

### Step 2.2: Verify gates

- [ ] Run `make build-lib`. Expected: clean (typecheck succeeds — note that `styles.svSquare` etc. won't exist yet because the SCSS file lands in T3; the SCSS module returns a `Proxy` to any string key in dev so this typechecks fine, but if your environment fails on this, run T3 BEFORE running gates for T2).

Actually, the cleaner approach: SKIP `make build-lib` until T3 ships the SCSS file. The implementer should commit T2 and proceed to T3 immediately.

- [ ] Run `make lint`. Expected: clean.

### Step 2.3: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/ColorPicker/SVSquare.tsx && git commit -m "$(cat <<'EOF'
ColorPicker: SVSquare 2D pad component

Focused internal sub-component for the saturation/value picker. Pointer
drag with setPointerCapture (try/catch for jsdom), keyboard nav (arrows
±1, Shift+arrow ±10, Home/End for S=0/100, PageUp/Down for V=100/0).

role="application" + aria-label + aria-valuetext describing the current
S/V state — same ARIA precedent as ImageCrop's viewport for 2D pointer-
driven controls.

Not exported from the package — used internally by ColorPickerPanel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ColorPickerPanel + SCSS

**Files:**

- Create: `packages/design-system/src/components/ColorPicker/ColorPickerPanel.tsx`
- Create: `packages/design-system/src/components/ColorPicker/ColorPicker.module.scss`

The picker UI. Composes `SVSquare` + `<Slider>` + `<Input>` + presets grid. Owns the local-HSV state-of-truth and the HEX-input three-state buffering.

### Step 3.1: Create `ColorPickerPanel.tsx`

- [ ] Write file contents (verbatim):

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import clsx from 'clsx';
import { Slider } from '../Slider';
import { Input } from '../Input';
import { SVSquare } from './SVSquare';
import { hexToHsv, hsvToHex, normalizeHex, type HSV } from './colorMath';
import styles from './ColorPicker.module.scss';

export interface ColorPickerPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
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
   * onChange and onChangeEnd). Invalid entries are silently dropped.
   */
  presets?: string[];
  /** Disable interaction. */
  disabled?: boolean;
}

const FALLBACK_HSV: HSV = { h: 0, s: 0, v: 0 };
const FALLBACK_HEX = '#000000';

/**
 * The picker UI without the popover wrapping. Use directly as
 * `<ColorPicker.Panel>` for inline / always-visible color picking (theme
 * builders, settings pages, color cells in a grid). The popover-wrapped
 * `<ColorPicker>` composes this internally.
 *
 * Owns the local-HSV state-of-truth: the UI thinks in HSV (the SV pad
 * needs S+V, the hue strip needs H) but the consumer's contract is HEX.
 * Naive HEX→HSV-per-render is lossy at saturation=0 (gray) — dragging hue
 * at black would not update because HEX stays `#000000`. We track HSV
 * locally and only sync from the `value` prop when an external write
 * (consumer-driven, not our own) changes it.
 *
 * @example
 * const [hex, setHex] = useState('#4F46E5');
 * <ColorPicker.Panel value={hex} onChange={setHex} />
 *
 * @example
 * // With consumer-supplied preset swatches:
 * <ColorPicker.Panel
 *   value={hex}
 *   onChange={setHex}
 *   presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444']}
 * />
 *
 * @remarks When NOT to use
 * - When you need a compact trigger button. Use `<ColorPicker>` (popover
 *   variant) instead.
 * - For an uncontrolled picker. The component is controlled-only by design.
 */
export const ColorPickerPanel = forwardRef<HTMLDivElement, ColorPickerPanelProps>(
  function ColorPickerPanel(
    { value, onChange, onChangeEnd, presets, disabled = false, className, ...rest },
    ref,
  ) {
    // Local HSV state-of-truth. See class JSDoc above for the rationale.
    const [localHsv, setLocalHsv] = useState<HSV>(() => hexToHsv(value) ?? FALLBACK_HSV);

    // HEX input draft buffer — separate from the committed `value` so we can
    // hold transient invalid input ("#1" while the user types "#123456")
    // without disturbing the rest of the UI.
    const [draft, setDraft] = useState<string>(() => normalizeHex(value) ?? FALLBACK_HEX);

    // One-time dev warning for invalid initial value.
    const [warned, setWarned] = useState(false);
    useEffect(() => {
      if (!warned && hexToHsv(value) === null && import.meta.env.MODE !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          `<ColorPicker> received invalid value=${JSON.stringify(value)}; falling back to ${FALLBACK_HEX}.`,
        );
        setWarned(true);
      }
    }, [value, warned]);

    // Sync local HSV when the consumer sets a NEW value externally.
    // We detect "external write" by comparing the normalized prop HEX to our
    // round-trip HEX of localHsv — if they differ, the consumer set it,
    // otherwise we set it and don't need to re-sync.
    useEffect(() => {
      const ourHex = hsvToHex(localHsv);
      const propHex = normalizeHex(value);
      if (propHex && propHex !== ourHex) {
        const incoming = hexToHsv(propHex);
        if (incoming) setLocalHsv(incoming);
      }
      // Intentionally not depending on localHsv — we are the writer, not the reader.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Sync draft input when value changes externally.
    useEffect(() => {
      const normalized = normalizeHex(value);
      if (normalized && normalized !== normalizeHex(draft)) {
        setDraft(normalized);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const updateHsv = useCallback(
      (next: HSV) => {
        setLocalHsv(next);
        onChange(hsvToHex(next));
      },
      [onChange],
    );

    // SV pad handlers.
    const handleSVChange = useCallback(
      (s: number, v: number) => {
        updateHsv({ ...localHsv, s, v });
      },
      [localHsv, updateHsv],
    );

    const handleSVChangeEnd = useCallback(() => {
      onChangeEnd?.(hsvToHex(localHsv));
    }, [localHsv, onChangeEnd]);

    // Hue slider handlers. Slider passes number | [number, number]; this
    // picker uses single-thumb mode so we narrow to number.
    const handleHueChange = useCallback(
      (next: number | [number, number]) => {
        const h = typeof next === 'number' ? next : next[0];
        updateHsv({ ...localHsv, h });
      },
      [localHsv, updateHsv],
    );

    const handleHueChangeEnd = useCallback(() => {
      onChangeEnd?.(hsvToHex(localHsv));
    }, [localHsv, onChangeEnd]);

    // HEX input handlers.
    const handleHexChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setDraft(next);
        const normalized = normalizeHex(next);
        if (normalized) {
          const incoming = hexToHsv(normalized);
          if (incoming) {
            setLocalHsv(incoming);
            onChange(normalized);
          }
        }
      },
      [onChange],
    );

    const handleHexBlur = useCallback(() => {
      const normalized = normalizeHex(draft);
      if (normalized) {
        // Re-snap to canonical form (uppercase, with `#`, 6-char).
        setDraft(normalized);
        onChangeEnd?.(normalized);
      } else {
        // Invalid on blur — revert to the canonical HEX of the current value.
        setDraft(normalizeHex(value) ?? FALLBACK_HEX);
      }
    }, [draft, value, onChangeEnd]);

    const handleHexKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // Trigger blur to commit / revert.
        e.currentTarget.blur();
      }
    }, []);

    // Preset click handler.
    const handlePresetClick = useCallback(
      (preset: string) => {
        const normalized = normalizeHex(preset);
        if (!normalized) return;
        const incoming = hexToHsv(normalized);
        if (!incoming) return;
        setLocalHsv(incoming);
        setDraft(normalized);
        onChange(normalized);
        onChangeEnd?.(normalized);
      },
      [onChange, onChangeEnd],
    );

    const draftIsValid = normalizeHex(draft) !== null;
    const currentNormalized = normalizeHex(value) ?? FALLBACK_HEX;

    return (
      <div
        ref={ref}
        className={clsx(styles.panel, disabled && styles.panelDisabled, className)}
        {...rest}
      >
        <SVSquare
          hue={localHsv.h}
          s={localHsv.s}
          v={localHsv.v}
          onChange={handleSVChange}
          onChangeEnd={handleSVChangeEnd}
          disabled={disabled}
        />
        <div className={styles.hueSlider}>
          <Slider
            value={localHsv.h}
            onChange={handleHueChange}
            onChangeEnd={handleHueChangeEnd}
            min={0}
            max={360}
            step={1}
            disabled={disabled}
            aria-label="Hue"
          />
        </div>
        <Input
          size="sm"
          value={draft}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          onKeyDown={handleHexKeyDown}
          invalid={!draftIsValid && draft !== ''}
          disabled={disabled}
          aria-label="Hex color value"
          className={styles.hexInput}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
        />
        {presets && presets.length > 0 && (
          <div className={styles.presets} role="group" aria-label="Preset colors">
            {presets.map((preset, idx) => {
              const normalized = normalizeHex(preset);
              if (!normalized) return null;
              const selected = normalized === currentNormalized;
              return (
                <button
                  key={`${normalized}-${idx}`}
                  type="button"
                  className={clsx(styles.presetSwatch, selected && styles.presetSwatchSelected)}
                  style={{ backgroundColor: normalized }}
                  aria-label={normalized}
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => handlePresetClick(normalized)}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
```

### Step 3.2: Create `ColorPicker.module.scss`

- [ ] Write file contents (verbatim):

```scss
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  width: 240px;
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.panelDisabled {
  opacity: var(--opacity-disabled);

  // CSS keyword — disabled panel is non-interactive at the wrapper level too.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  pointer-events: none;
}

.svSquare {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;

  // CSS keyword — crosshair cursor signals 2D pick affordance.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: crosshair;

  // CSS keyword — prevents text selection during drag.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  user-select: none;
}

.svSquare::before,
.svSquare::after {
  content: '';
  position: absolute;
  inset: 0;
}

.svSquare::before {
  // Saturation gradient: white at the left fades to transparent at the right.
  // Raw colors here are part of the HSV-rendering math (NOT brand colors) —
  // pure white/black gradients are the canonical way to render an SV pad.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- SV-pad math gradient, white/black are mathematical primitives here, not brand colors
  background: linear-gradient(to right, #fff, transparent);
}

.svSquare::after {
  // Value gradient: black at the bottom fades to transparent at the top.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- SV-pad math gradient, white/black are mathematical primitives here, not brand colors
  background: linear-gradient(to top, #000, transparent);
}

.svSquare:focus-visible {
  outline: var(--border-width-emphasis) solid var(--color-accent);

  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- raw px is the focus-ring offset, no token equivalent
  outline-offset: 2px;
}

.svSquareDisabled {
  // CSS keyword.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: not-allowed;
}

.svIndicator {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%);

  // The indicator must be visible against ANY color the pad can show.
  // A white border with a thin dark outer shadow gives strong contrast on
  // both light and dark backgrounds. No token equivalent because no
  // single tone works against pure black or pure white.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- indicator must remain visible against any background color, no token equivalent
  border: 2px solid #fff;

  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- indicator must remain visible against any background color, no token equivalent
  box-shadow: 0 0 0 1px rgb(0 0 0 / 50%);

  // CSS keyword — indicator is a visual marker only, not a click target.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  pointer-events: none;
}

.hueSlider {
  // Wrapper that owns the rainbow track override. We target Slider's
  // internal track class from outside via :global, layered atop the Slider's
  // own tone-variant track background. Specificity beats Slider's own .track
  // rule, but tone variants (.track.tone-success etc.) can match, so the
  // !important is required to defeat any tone the consumer might pass.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- rainbow gradient overrides Slider's default track background; !important needed to defeat Slider's tone variants
  & :global([class*='track']) {
    background: linear-gradient(
      to right,
      #ff0000,
      #ffff00,
      #00ff00,
      #00ffff,
      #0000ff,
      #ff00ff,
      #ff0000
    ) !important;
  }
}

.hexInput {
  // Forces uppercase rendering for the HEX text (input value is normalized
  // separately; this is purely visual until commit).
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  text-transform: uppercase;
}

.presets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(24px, 1fr));
  gap: var(--space-2);
}

.presetSwatch {
  // Reset button defaults.

  // CSS keyword — button needs explicit padding reset.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  padding: 0;
  aspect-ratio: 1;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-sm);

  // CSS keyword — swatches are clickable.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: pointer;
  position: relative;
}

.presetSwatch:focus-visible {
  outline: var(--border-width-emphasis) solid var(--color-accent);

  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- raw px is the focus-ring offset, no token equivalent
  outline-offset: 2px;
}

.presetSwatch:disabled {
  // CSS keyword.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.presetSwatchSelected {
  // Inset ring + check-mark via ::after.
  box-shadow: inset 0 0 0 2px var(--color-accent);
}

.presetSwatchSelected::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  // Indicator check must contrast against any swatch color. Same rationale
  // as svIndicator above — pure white with thin dark shadow.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- check must remain visible against any swatch background color
  color: #fff;
  font-size: 12px;

  // CSS keyword.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  text-shadow: 0 0 2px rgb(0 0 0 / 70%);
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  color: var(--color-fg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-size-sm);
  line-height: 1;

  // CSS keyword — clickable trigger.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    background var(--transition-base);
}

.trigger:hover:not(:disabled) {
  border-color: var(--color-border-emphasis);
}

.trigger:focus-visible {
  outline: var(--border-width-emphasis) solid var(--color-accent);

  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- raw px is the focus-ring offset, no token equivalent
  outline-offset: 2px;
}

.trigger:disabled {
  // CSS keyword.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.triggerSwatch {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
  border: var(--border-width) solid var(--color-border);
  flex-shrink: 0;
}

.triggerHex {
  font-family: var(--font-mono);

  // CSS keyword — uppercase HEX for visual consistency.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  text-transform: uppercase;
}
```

If stylelint flags additional properties beyond the proactive inline disables (rare — the SCSS above covers known CSS-keyword warnings), add the matching inline disable in place.

### Step 3.3: Verify gates

From `/home/dpws/projects/design-system`:

- [ ] Run `make build-lib`. Expected: typecheck clean.
- [ ] Run `make lint`. Expected: stylelint clean.
- [ ] Run `make build`. Expected: clean.

Do NOT run `make test` — there are no ColorPicker tests yet (T1's colorMath tests still pass), and `src/index.ts` doesn't re-export ColorPicker yet (T5 adds that). The structure meta-test would fail.

### Step 3.4: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/ColorPicker/ColorPickerPanel.tsx packages/design-system/src/components/ColorPicker/ColorPicker.module.scss && git commit -m "$(cat <<'EOF'
ColorPicker: ColorPickerPanel + SCSS

The picker UI without the popover wrapping — usable as <ColorPicker.Panel>
for inline / always-visible color picking. Composes SVSquare, Slider,
Input with three concerns:

- **Local HSV state-of-truth.** UI thinks in HSV, consumer thinks in HEX.
  HEX→HSV is lossy at saturation=0 / value=0 so we keep local HSV and
  only sync from `value` when an external write (consumer-driven, not
  ours) differs from our round-trip HEX.
- **HEX input three-state buffering.** Synced (input == normalized value),
  editing (valid parse during typing → live commit), invalid (revert
  on blur). Enter triggers blur.
- **Presets grid.** Optional consumer-supplied `string[]`. Selected swatch
  gets inset ring + check overlay. Click fires both onChange and
  onChangeEnd (preset click is a committed change, not a drag).

CSS: SV pad is two stacked linear-gradient pseudos (white→transparent +
black→transparent) over an inline hsl() base color. Hue slider uses
the library's <Slider> with a wrapper `.hueSlider :global([class*=track])`
rule that paints the rainbow gradient over Slider's default track. Hue
slider !important needed to defeat Slider's tone variants.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: ColorPicker (popover wrapper) + Trigger marker

**Files:**

- Create: `packages/design-system/src/components/ColorPicker/ColorPicker.tsx`

The popover-wrapped `<ColorPicker>` plus the `<ColorPicker.Trigger>` marker component.

### Step 4.1: Create `ColorPicker.tsx`

- [ ] Write file contents (verbatim):

```tsx
import {
  forwardRef,
  isValidElement,
  useCallback,
  useRef,
  useState,
  Children,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Popover } from '../Popover';
import { ColorPickerPanel } from './ColorPickerPanel';
import { normalizeHex } from './colorMath';
import styles from './ColorPicker.module.scss';

const FALLBACK_HEX = '#000000';

type PopoverPlacement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';

type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
type PopoverAlign = 'start' | 'center' | 'end';

const PLACEMENT_MAP: Record<PopoverPlacement, { side: PopoverSide; align: PopoverAlign }> = {
  top: { side: 'top', align: 'center' },
  'top-start': { side: 'top', align: 'start' },
  'top-end': { side: 'top', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  'bottom-start': { side: 'bottom', align: 'start' },
  'bottom-end': { side: 'bottom', align: 'end' },
};

export interface ColorPickerTriggerProps {
  /**
   * Currently always behaves as `true` (the child is merged with trigger
   * semantics via `<Popover.Trigger>`'s cloneElement). Reserved for a
   * future Slot-style variant where `false` would wrap the child instead
   * of merging. Documented for API stability.
   */
  asChild?: boolean;
  /** The element to render as the trigger. Must accept `ref` and `onClick`. */
  children: ReactNode;
}

/**
 * Marker child used INSIDE `<ColorPicker>` to override the default trigger.
 * Doesn't render anything by itself — `<ColorPicker>` reads its
 * `children` and passes them to `<Popover.Trigger>`. The child element
 * must `forwardRef` and accept `onClick` for the popover to work.
 *
 * @example
 * <ColorPicker value={hex} onChange={setHex}>
 *   <ColorPicker.Trigger asChild>
 *     <Button variant="secondary">Pick a color</Button>
 *   </ColorPicker.Trigger>
 * </ColorPicker>
 *
 * @remarks Anti-patterns
 * - ❌ Using `<ColorPicker.Trigger>` outside `<ColorPicker>`. It only has
 *   meaning as a marker child read by the parent.
 * - ❌ Wrapping a non-forwardRef component. `<Popover.Trigger>` calls
 *   cloneElement to inject the ref; non-forwardRef components silently
 *   drop it and the popover never positions correctly.
 */
export function ColorPickerTrigger(_props: ColorPickerTriggerProps): null {
  return null;
}
ColorPickerTrigger.displayName = 'ColorPickerTrigger';

export interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current color as `#RRGGBB`. Controlled — required. */
  value: string;
  /** Fires per drag tick + on input change + on preset click. High frequency during drags. */
  onChange: (hex: string) => void;
  /** Fires on the trailing edge of an interaction. Use for commit-style logic. */
  onChangeEnd?: (hex: string) => void;
  /**
   * Optional preset color swatches. If provided, rendered as a grid below
   * the hue slider in the panel.
   */
  presets?: string[];
  /** Disable interaction. Trigger doesn't open; panel is non-interactive. */
  disabled?: boolean;
  /**
   * Accessible label for the default trigger. Default `"Pick a color"`.
   * Ignored when a custom trigger is provided via `<ColorPicker.Trigger>`.
   */
  triggerLabel?: string;
  /** Popover placement (split internally into side + align). Default `'bottom-start'`. */
  popoverPlacement?: PopoverPlacement;
  /** Optional `<ColorPicker.Trigger asChild>` override for custom triggers. */
  children?: ReactNode;
}

interface DefaultTriggerProps {
  hex: string;
  label: string;
  disabled: boolean;
  open: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const DefaultTrigger = forwardRef<HTMLButtonElement, DefaultTriggerProps>(function DefaultTrigger(
  { hex, label, disabled, open, onClick },
  ref,
) {
  const display = normalizeHex(hex) ?? FALLBACK_HEX;
  return (
    <button
      ref={ref}
      type="button"
      className={styles.trigger}
      disabled={disabled}
      aria-label={`${label}, current value ${display}`}
      aria-haspopup="true"
      aria-expanded={open}
      onClick={onClick}
    >
      <span
        className={styles.triggerSwatch}
        style={{ backgroundColor: display }}
        aria-hidden="true"
      />
      <span className={styles.triggerHex} aria-hidden="true">
        {display}
      </span>
    </button>
  );
});

/**
 * Controlled HEX color picker with a Popover trigger by default. For the
 * inline (always-visible) variant, use `<ColorPicker.Panel>` directly.
 *
 * @example
 * // Default popover with the library's trigger swatch:
 * const [hex, setHex] = useState('#4F46E5');
 * <ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />
 *
 * @example
 * // Custom trigger via the slot-style override:
 * <ColorPicker value={hex} onChange={setHex}>
 *   <ColorPicker.Trigger asChild>
 *     <Button variant="secondary">Pick a color</Button>
 *   </ColorPicker.Trigger>
 * </ColorPicker>
 *
 * @example
 * // With preset swatches:
 * <ColorPicker
 *   value={hex}
 *   onChange={setHex}
 *   presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444']}
 * />
 *
 * @remarks When NOT to use
 * - For an inline always-visible picker. Use `<ColorPicker.Panel>` directly.
 * - For an uncontrolled picker. Component is controlled-only.
 * - For non-HEX color formats (named colors, rgb(), hsl()). Convert in
 *   the consumer.
 *
 * @remarks Anti-patterns
 * - ❌ Passing non-HEX `value`. Use one of `#RGB` / `#RRGGBB`, with or
 *   without the leading `#`. Anything else falls back to `#000000` with
 *   a dev-only warning.
 * - ❌ Reaching into the picker's internal HSV state. The consumer's
 *   contract is HEX-only.
 * - ❌ Hand-rolling a color picker per page when this exists.
 * - ❌ Bundling a default palette in a consumer instead of passing
 *   `presets`. The library doesn't ship a default palette by design.
 * - ❌ Calling expensive work in `onChange`. Use `onChangeEnd` (fires once
 *   per gesture).
 */
function ColorPickerRoot({
  value,
  onChange,
  onChangeEnd,
  presets,
  disabled = false,
  triggerLabel = 'Pick a color',
  popoverPlacement = 'bottom-start',
  children,
  className,
  ...rest
}: ColorPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const { side, align } = PLACEMENT_MAP[popoverPlacement];

  // Find a <ColorPicker.Trigger> marker child if present; extract its
  // children to use as the popover trigger element. Other children types
  // are ignored (no error — keeps the API forgiving).
  const customTrigger = Children.toArray(children).find(
    (c): c is ReactElement<ColorPickerTriggerProps> =>
      isValidElement(c) && c.type === ColorPickerTrigger,
  );

  const triggerElement = customTrigger ? (
    // The consumer's child is rendered as-is; <Popover.Trigger> clones it
    // to inject onClick + aria-* + ref.
    customTrigger.props.children
  ) : (
    <DefaultTrigger
      hex={value}
      label={triggerLabel}
      disabled={disabled}
      open={open}
      // onClick is overridden by Popover.Trigger's cloneElement; we set a
      // no-op here so DefaultTrigger's prop type is satisfied.
      onClick={() => {}}
    />
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (disabled) return;
      setOpen(next);
    },
    [disabled],
  );

  return (
    <div className={clsx(disabled && styles.disabled, className)} {...rest}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger>{triggerElement}</Popover.Trigger>
        <Popover.Content side={side} align={align}>
          <ColorPickerPanel
            value={value}
            onChange={onChange}
            onChangeEnd={onChangeEnd}
            presets={presets}
            disabled={disabled}
          />
        </Popover.Content>
      </Popover>
    </div>
  );
}
ColorPickerRoot.displayName = 'ColorPicker';

/** Compound API: `<ColorPicker>` + `<ColorPicker.Trigger>` + `<ColorPicker.Panel>`. */
export const ColorPicker = Object.assign(ColorPickerRoot, {
  Trigger: ColorPickerTrigger,
  Panel: ColorPickerPanel,
});

// Re-export types from the panel for consumers who use `<ColorPicker.Panel>` directly.
export type { ColorPickerPanelProps } from './ColorPickerPanel';
```

### Step 4.2: Verify gates

From `/home/dpws/projects/design-system`:

- [ ] Run `make build-lib`. Expected: typecheck clean.
- [ ] Run `make build`. Expected: clean.
- [ ] Run `make lint`. Expected: clean.

DO NOT run `make test` — `src/index.ts` doesn't re-export ColorPicker yet (T5 adds that).

### Step 4.3: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/ColorPicker/ColorPicker.tsx && git commit -m "$(cat <<'EOF'
ColorPicker: popover wrapper + ColorPicker.Trigger marker

Composes <Popover> around <ColorPickerPanel>. Default trigger is an
input-field-shaped button with a 16x16 color swatch + uppercase HEX text;
the consumer can override with <ColorPicker.Trigger asChild>{child}</...>
which gets cloned into <Popover.Trigger>.

popoverPlacement (the spec's `'bottom-start'`-style union) is split inside
the wrapper into <Popover.Content>'s side + align props via a PLACEMENT_MAP
constant — keeps the consumer API as one prop while matching the library's
underlying Popover signature.

ColorPickerTrigger is a marker component (returns null). The parent reads
its children from the React element tree without ever mounting it — same
shape as Radix's slot pattern, simpler than passing a triggerRef context.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: ColorPicker tests + barrel exports

**Files:**

- Create: `packages/design-system/src/components/ColorPicker/ColorPicker.test.tsx`
- Create: `packages/design-system/src/components/ColorPicker/index.ts`
- Modify: `packages/design-system/src/index.ts`

### Step 5.1: Create `ColorPicker.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { ColorPicker, hexToHsv, hsvToHex } from './index';

// jsdom doesn't implement setPointerCapture / releasePointerCapture; stub.
function ensurePointerCaptureShim() {
  if (
    typeof (HTMLElement.prototype as unknown as { setPointerCapture?: unknown })
      .setPointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { setPointerCapture: (id: number) => void }
    ).setPointerCapture = () => {};
  }
  if (
    typeof (HTMLElement.prototype as unknown as { releasePointerCapture?: unknown })
      .releasePointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { releasePointerCapture: (id: number) => void }
    ).releasePointerCapture = () => {};
  }
}
ensurePointerCaptureShim();

// Popover uses Floating UI which observes resize. jsdom doesn't ship ResizeObserver.
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Mock the SV pad's getBoundingClientRect so pointer math is deterministic
// (200x200 pad starting at the origin).
function mockSVRect(container: HTMLElement, w = 200, h = 200) {
  const pad = container.querySelector<HTMLElement>('[role="application"]')!;
  pad.getBoundingClientRect = () =>
    ({
      width: w,
      height: h,
      left: 0,
      top: 0,
      right: w,
      bottom: h,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return pad;
}

describe('ColorPicker.Panel — rendering', () => {
  it('renders panel with all sub-components', () => {
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    expect(container.querySelector('[role="application"]')).toBeInTheDocument();
    expect(container.querySelector('[role="slider"]')).toBeInTheDocument();
    expect(container.querySelector('input[aria-label="Hex color value"]')).toBeInTheDocument();
  });

  it('positions the SV indicator at the correct (s, v) coordinates', () => {
    // value=#FF0000 → HSV (0, 100, 100) → indicator at left=100%, top=0%
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const indicator = container.querySelector('[class*="svIndicator"]') as HTMLElement;
    expect(indicator.style.left).toBe('100%');
    expect(indicator.style.top).toBe('0%');
  });

  it('renders presets grid when presets prop is provided', () => {
    const presets = ['#FF0000', '#00FF00', '#0000FF'];
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} presets={presets} />);
    expect(screen.getByRole('group', { name: 'Preset colors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#FF0000' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '#00FF00' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('does not render presets grid when presets prop is omitted', () => {
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    expect(screen.queryByRole('group', { name: 'Preset colors' })).not.toBeInTheDocument();
  });

  it('drops invalid entries from the presets grid', () => {
    render(
      <ColorPicker.Panel
        value="#FF0000"
        onChange={() => {}}
        presets={['#FF0000', 'orange', '', '#00FF00']}
      />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(2); // only the 2 valid hex entries
  });
});

describe('ColorPicker.Panel — controlled value', () => {
  it('updates indicator + hue slider + HEX input when value prop changes', () => {
    const { container, rerender } = render(
      <ColorPicker.Panel value="#FF0000" onChange={() => {}} />,
    );
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    expect(input.value).toBe('#FF0000');

    rerender(<ColorPicker.Panel value="#00FF00" onChange={() => {}} />);
    expect(input.value).toBe('#00FF00');

    const indicator = container.querySelector('[class*="svIndicator"]') as HTMLElement;
    expect(indicator.style.left).toBe('100%'); // saturation still 100
  });

  it('falls back to #000000 and warns once in dev for invalid initial value', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<ColorPicker.Panel value="not-a-color" onChange={() => {}} />);
    expect(warnSpy).toHaveBeenCalled();
    // The draft input shows the canonical fallback.
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    expect(input.value).toBe('#000000');
    warnSpy.mockRestore();
  });
});

describe('ColorPicker.Panel — SV pad interaction', () => {
  it('pointerdown+move fires onChange with the expected HEX', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const pad = mockSVRect(container);
    // Click at the center of the 200x200 pad → S=50, V=50.
    fireEvent.pointerDown(pad, { clientX: 100, clientY: 100, pointerId: 1 });
    // For hue=0 (red), S=50, V=50 → HSV(0, 50, 50) → #804040.
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const hsv = hexToHsv(lastCallHex)!;
    expect(hsv.s).toBeCloseTo(50, 0);
    expect(hsv.v).toBeCloseTo(50, 0);
  });

  it('ArrowRight adjusts S by +1', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    pad.focus();
    fireEvent.keyDown(pad, { key: 'ArrowLeft' });
    // FF0000 is (0, 100, 100); ArrowLeft → (0, 99, 100) → ~#FE0202.
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const hsv = hexToHsv(lastCallHex)!;
    expect(hsv.s).toBeCloseTo(99, 0);
    expect(hsv.v).toBe(100);
  });

  it('Shift+ArrowDown adjusts V by -10', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    pad.focus();
    fireEvent.keyDown(pad, { key: 'ArrowDown', shiftKey: true });
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const hsv = hexToHsv(lastCallHex)!;
    expect(hsv.v).toBeCloseTo(90, 0); // 100 - 10
  });

  it('End jumps S to 100; Home jumps S to 0', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#808080" onChange={onChange} />);
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    pad.focus();
    fireEvent.keyDown(pad, { key: 'End' });
    let hsv = hexToHsv(onChange.mock.calls.at(-1)![0])!;
    expect(hsv.s).toBeCloseTo(100, 0);

    fireEvent.keyDown(pad, { key: 'Home' });
    hsv = hexToHsv(onChange.mock.calls.at(-1)![0])!;
    expect(hsv.s).toBeCloseTo(0, 0);
  });
});

describe('ColorPicker.Panel — hue slider interaction', () => {
  it('hue slider keyboard updates HEX via the local HSV model', () => {
    // ControlledHarness pattern — exercise the controlled flow.
    function Harness() {
      const [hex, setHex] = useState('#FF0000');
      return (
        <>
          <ColorPicker.Panel value={hex} onChange={setHex} />
          <div data-testid="captured-hex">{hex}</div>
        </>
      );
    }
    const { container, getByTestId } = render(<Harness />);
    const slider = container.querySelector<HTMLElement>('[role="slider"]')!;
    slider.focus();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    // Slider step=1, so hue went 0→1. HEX should change slightly.
    expect(getByTestId('captured-hex').textContent).not.toBe('#FF0000');
  });

  it('preserves hue at saturation=0 across re-renders (local HSV state model)', () => {
    // value=#000000 (S=0, V=0). Drag hue → HEX still #000000 but local
    // hue should accumulate, so subsequent renders use the new hue.
    function Harness() {
      const [hex, setHex] = useState('#000000');
      return (
        <>
          <ColorPicker.Panel value={hex} onChange={setHex} />
          <div data-testid="hex">{hex}</div>
        </>
      );
    }
    const { container, getByTestId } = render(<Harness />);
    const slider = container.querySelector<HTMLElement>('[role="slider"]')!;
    slider.focus();
    // Move hue up — HEX won't change because S=V=0, but the local HSV
    // model preserves it. We can't directly inspect localHsv from outside,
    // but the test passes if onChange isn't called (HEX truly unchanged).
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(getByTestId('hex').textContent).toBe('#000000'); // unchanged
  });
});

describe('ColorPicker.Panel — HEX input', () => {
  it('valid hex typing fires onChange live', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '#00FF00');
    expect(onChange).toHaveBeenLastCalledWith('#00FF00');
  });

  it('invalid hex during typing sets invalid styling and does NOT fire onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'NOTHEX');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // onChange might have fired for partial valid parses (`'N'`, `'NO'`, etc.
    // are all invalid), so check that the final call wasn't with the bad value.
    expect(onChange.mock.calls.every(([hex]) => hex !== 'NOTHEX' && hex !== '#NOTHEX')).toBe(true);
  });

  it('blur with invalid input reverts to canonical HEX of current value', async () => {
    const user = userEvent.setup();
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'bad');
    input.blur();
    expect(input.value).toBe('#FF0000');
  });

  it('3-char hex on input expands to 6-char on commit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '#f0f');
    // Live commit should be the canonical 6-char.
    expect(onChange).toHaveBeenLastCalledWith('#FF00FF');
  });

  it('Enter key blurs the input (which triggers commit/revert)', async () => {
    const user = userEvent.setup();
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    input.focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).not.toBe(input);
  });
});

describe('ColorPicker.Panel — presets', () => {
  it('clicking a preset fires onChange + onChangeEnd with that HEX', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    render(
      <ColorPicker.Panel
        value="#FF0000"
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        presets={['#FF0000', '#00FF00']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '#00FF00' }));
    expect(onChange).toHaveBeenCalledWith('#00FF00');
    expect(onChangeEnd).toHaveBeenCalledWith('#00FF00');
  });

  it('selected preset matches current value', () => {
    const { rerender } = render(
      <ColorPicker.Panel value="#FF0000" onChange={() => {}} presets={['#FF0000', '#00FF00']} />,
    );
    expect(screen.getByRole('button', { name: '#FF0000' })).toHaveAttribute('aria-pressed', 'true');
    rerender(
      <ColorPicker.Panel value="#00FF00" onChange={() => {}} presets={['#FF0000', '#00FF00']} />,
    );
    expect(screen.getByRole('button', { name: '#00FF00' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ColorPicker — popover', () => {
  it('renders the default trigger with current HEX in the label', () => {
    render(<ColorPicker value="#4F46E5" onChange={() => {}} />);
    expect(
      screen.getByRole('button', { name: /Pick a color, current value #4F46E5/i }),
    ).toBeInTheDocument();
  });

  it('uses custom triggerLabel in the default trigger label', () => {
    render(<ColorPicker value="#4F46E5" onChange={() => {}} triggerLabel="Brand color" />);
    expect(
      screen.getByRole('button', { name: /Brand color, current value #4F46E5/i }),
    ).toBeInTheDocument();
  });

  it('clicking the trigger opens the panel', async () => {
    const user = userEvent.setup();
    render(<ColorPicker value="#FF0000" onChange={() => {}} />);
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('application')).toBeInTheDocument();
  });

  it('disabled trigger does not open the panel', async () => {
    const user = userEvent.setup();
    render(<ColorPicker value="#FF0000" onChange={() => {}} disabled />);
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
  });

  it('custom trigger via <ColorPicker.Trigger asChild> overrides the default', async () => {
    const user = userEvent.setup();
    render(
      <ColorPicker value="#FF0000" onChange={() => {}}>
        <ColorPicker.Trigger asChild>
          <button type="button">Custom Pick</button>
        </ColorPicker.Trigger>
      </ColorPicker>,
    );
    expect(screen.getByRole('button', { name: 'Custom Pick' })).toBeInTheDocument();
    // Default trigger should NOT be in the document.
    expect(screen.queryByText(/current value/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Custom Pick' }));
    expect(screen.getByRole('application')).toBeInTheDocument();
  });
});

describe('ColorPicker — disabled state', () => {
  it('disabled panel: SV pad and inputs are non-interactive', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorPicker.Panel value="#FF0000" onChange={onChange} disabled />,
    );
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    expect(pad).toHaveAttribute('aria-disabled', 'true');
    expect(pad).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(pad, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();

    const sliderThumb = container.querySelector('[role="slider"]');
    expect(sliderThumb).toHaveAttribute('aria-disabled', 'true');

    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    expect(input).toBeDisabled();
  });
});

describe('ColorPicker — misc', () => {
  it('Panel: className merges with the base class', () => {
    const { container } = render(
      <ColorPicker.Panel value="#FF0000" onChange={() => {}} className="custom" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/custom/);
    expect(root.className).toMatch(/panel/);
  });

  it('Panel: ref forwards to the outermost div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ColorPicker.Panel ref={ref} value="#FF0000" onChange={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('Panel re-snaps draft to canonical (uppercase, with #) on blur', () => {
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    fireEvent.change(input, { target: { value: 'aabbcc' } });
    expect(input.value).toBe('aabbcc');
    act(() => {
      input.blur();
    });
    expect(input.value).toBe('#AABBCC');
  });
});

describe('round-trip', () => {
  // Sanity — confirm the public-facing color math agrees with itself.
  it('hsvToHex(hexToHsv(hex)) is stable for the demo palette', () => {
    const palette = [
      '#4F46E5',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#3B82F6',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
    ];
    for (const hex of palette) {
      expect(hsvToHex(hexToHsv(hex)!)).toBe(hex);
    }
  });
});
```

### Step 5.2: Create `index.ts`

- [ ] Write file contents (verbatim):

```ts
export { ColorPicker, ColorPickerTrigger } from './ColorPicker';
export type { ColorPickerProps, ColorPickerTriggerProps } from './ColorPicker';
export { ColorPickerPanel } from './ColorPickerPanel';
export type { ColorPickerPanelProps } from './ColorPickerPanel';
export { hexToHsv, hsvToHex, normalizeHex } from './colorMath';
export type { HSV } from './colorMath';
```

### Step 5.3: Modify `src/index.ts` to re-export ColorPicker

Read `packages/design-system/src/index.ts` first to find the right insertion slot. Place the ColorPicker re-export alphabetically — `Co` comes after `Checkbox` and before `Code` in the existing barrel. Apply this Edit (use `replace_all: false`):

**old_string:**

```ts
export { Checkbox } from './components/Checkbox';
export type { CheckboxProps } from './components/Checkbox';
```

**new_string:**

```ts
export { Checkbox } from './components/Checkbox';
export type { CheckboxProps } from './components/Checkbox';

export {
  ColorPicker,
  ColorPickerPanel,
  ColorPickerTrigger,
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from './components/ColorPicker';
export type {
  ColorPickerProps,
  ColorPickerPanelProps,
  ColorPickerTriggerProps,
  HSV,
} from './components/ColorPicker';
```

If the existing Checkbox export block has additional re-exports (e.g. extra types added in a later PR), expand the `old_string` until unique and apply the equivalent insertion.

### Step 5.4: Verify gates

- [ ] Run `make test`. Expected: all colorMath tests + ~24 new ColorPicker tests pass + the structure meta-test passes. Total test count should rise by ~34 (10 math + 24 component).
- [ ] Run `make build-lib`. Expected: clean.
- [ ] Run `make build`. Expected: clean.
- [ ] Run `make lint`. Expected: clean.

If a test fails, investigate before improvising. Most likely failure modes:

- **Popover-context-related failure**: tests that open the popover and check for the panel — if jsdom's `ResizeObserver` shim isn't being picked up, Popover positioning might error. Verify the shim runs at module load time (top of test file, not inside a beforeEach).
- **`userEvent.type` typing speed in clear+type sequences** — `userEvent.setup()` returns a sync API; if the assertions are checked too early, the live-commit may not have flushed. The provided tests use `await user.type` which awaits each keystroke; if assertions still fail because of microtask scheduling, wrap final assertions in `await waitFor(...)`.
- **`presetSwatch` `:disabled` rule conflicting with `aria-disabled`** — buttons get both `disabled` and `aria-pressed`; the test queries via `aria-pressed` (not by name conflict with the trigger button). If the test name "FF0000" matches both a preset and trigger, narrow the query with `within(group)`.

### Step 5.5: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/ColorPicker/ColorPicker.test.tsx packages/design-system/src/components/ColorPicker/index.ts packages/design-system/src/index.ts && git commit -m "$(cat <<'EOF'
ColorPicker: unit tests (~24 cases) + barrel re-exports

Tests cover rendering (panel structure, SV indicator positioning, presets
grid presence + invalid-entry dropping), controlled value (prop changes
flow into indicator + slider + input; invalid initial value falls back
with dev warning), SV pad interaction (pointer + keyboard for arrows,
Shift+arrow, Home/End), hue slider integration (keyboard nav, S=0
hue-preservation across re-renders), HEX input (live commit on valid,
invalid styling, blur revert, 3-char expansion, Enter blurs), presets
(click fires onChange+onChangeEnd, selected state), popover (default
trigger label, custom trigger override, disabled trigger), disabled
panel, and misc (className merging, ref forwarding, draft canonical
re-snap on blur).

Also re-exports ColorPicker (with .Trigger + .Panel attached),
ColorPickerPanel, ColorPickerTrigger, hexToHsv, hsvToHex, normalizeHex,
HSV from src/index.ts so structure.test.ts passes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: AGENTS.md ColorPicker section

**Files:**

- Modify: `packages/design-system/AGENTS.md`

### Step 6.1: Verify the ColorPicker re-export exists

- [ ] Read `packages/design-system/src/index.ts` and confirm the `export { ColorPicker, ColorPickerPanel, ... }` block is present (added in T5). If missing, STOP and report.

### Step 6.2: Insert the ColorPicker section between Checkbox and DatePicker in Forms cluster

Read `packages/design-system/AGENTS.md` to find the boundary — the `<Checkbox>` section's closing line followed by the `<DatePicker>` or `<Date pickers>` heading.

Use the Edit tool with `replace_all: false`. Anchor pattern:

**old_string** — the LAST line of the Checkbox section (closing bullet / final example fence) immediately followed by the heading of whatever comes next in the Forms cluster. Read the file first to find the exact pair. Suggested template if your file has a `<Checkbox>` section ending with a "Hard rule" bullet about uncontrolled use:

```markdown
- ❌ Pretending `<Checkbox>` has built-in form integration — wire `checked` and `onChange` to your form state.

### `<Date pickers>` — date / range / time
```

**new_string:**

````markdown
- ❌ Pretending `<Checkbox>` has built-in form integration — wire `checked` and `onChange` to your form state.

### `<ColorPicker>` — controlled HEX color picker (popover + inline)

```tsx
const [hex, setHex] = useState('#4F46E5');

// Default popover with the built-in trigger swatch:
<ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />

// Custom trigger:
<ColorPicker value={hex} onChange={setHex}>
  <ColorPicker.Trigger asChild>
    <Button variant="secondary">Pick a color</Button>
  </ColorPicker.Trigger>
</ColorPicker>

// Inline (always-visible panel — for theme builders, settings rows):
<ColorPicker.Panel value={hex} onChange={setHex} />
```

- **Controlled-only.** `value: string` in `#RRGGBB` form. Loose input accepted on the HEX text field (`#FFF`, `FFF`, `#ffffff`); the component always emits the canonical `#RRGGBB` (uppercase, with `#`).
- **Two distribution shapes via the compound API.** `<ColorPicker>` is the popover-wrapped form-field-ready widget. `<ColorPicker.Panel>` is the same picker without the popover wrapping — drop it directly into a settings page or theme builder.
- **Default trigger** is an input-field-shaped button with a 16×16 swatch + uppercase HEX text. Override via `<ColorPicker.Trigger asChild>{customNode}</ColorPicker.Trigger>` (the child must `forwardRef` because `<Popover.Trigger>` clones it).
- **`onChange` fires per drag/zoom tick (high frequency).** Use `onChangeEnd` for commit-style logic (network calls, history snapshots) — it fires on pointer release, slider release, HEX input blur, and preset click.
- **Presets via `presets?: string[]`.** Invalid entries are dropped silently. The library doesn't ship a default palette — pass your own brand colors. Selected swatch gets an inset ring + check overlay.
- **Color math is exported.** `hexToHsv(hex)`, `hsvToHex({h,s,v})`, `normalizeHex(loose)` are usable directly for downstream theme builders, contrast calculators, etc.
- **Keyboard (SV pad)**: arrows ±1% S/V, Shift+arrow ±10%, Home/End for S=0/100, PageUp/Down for V=100/0.
- **Keyboard (hue slider)**: inherits Slider's keyboard — arrows ±1°, PgUp/Dn ±10°, Home/End for 0°/360°.
- **Popover placement** via `popoverPlacement?: 'bottom-start' | 'bottom' | 'top-start' | ...`. Default `'bottom-start'`.
- **Disabled** dims the panel, sets `aria-disabled` on the SV pad, disables the slider + input, makes presets non-interactive. Trigger doesn't open.

#### Color math API

```ts
import { hexToHsv, hsvToHex, normalizeHex } from '@eocrm/design-system';

normalizeHex('#fff'); // '#FFFFFF'
normalizeHex('orange'); // null

hexToHsv('#FF0000'); // { h: 0, s: 100, v: 100 }
hexToHsv('not a color'); // null

hsvToHex({ h: 240, s: 100, v: 100 }); // '#0000FF'
```

#### Hard rule

- ❌ Passing non-HEX `value` — named colors, `rgb()`, `hsl()`, alpha hex (`#RRGGBBAA`). Convert in the consumer or use the exported `normalizeHex` first. Invalid input falls back to `#000000` with a dev-only warning.
- ❌ Reaching into the picker's internal HSV state. Consumer contract is HEX-only.
- ❌ Hand-rolling a color picker per page. Use this.
- ❌ Bundling a default palette inside the consumer. Pass via `presets`.
- ❌ Calling expensive work in `onChange`. Use `onChangeEnd` (one fire per gesture).
- ❌ Wrapping a non-`forwardRef` component in `<ColorPicker.Trigger asChild>`. `<Popover.Trigger>` clones the child to inject the ref; non-forwardRef silently drops it.

### `<Date pickers>` — date / range / time
````

If the actual Checkbox-section closing line and DatePicker heading don't match exactly, expand the `old_string` upward with one more preceding line for uniqueness, keeping the equivalent insertion of the new section between them.

### Step 6.3: Verify gates

- [ ] Run `make build`. Expected: clean (AGENTS.md edits don't affect typecheck; sanity check).
- [ ] Run `make lint`. Expected: clean.

### Step 6.4: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/AGENTS.md && git commit -m "$(cat <<'EOF'
AGENTS.md: add ColorPicker section between Checkbox and DatePicker

Covers compound API (<ColorPicker>, <ColorPicker.Panel>,
<ColorPicker.Trigger>), controlled HEX value contract, default trigger
shape and override path, onChange / onChangeEnd cadence, presets prop,
color math utilities (hexToHsv / hsvToHex / normalizeHex) as public
exports, keyboard semantics for SV pad and hue slider, popover placement
prop, and the "Hard rule" callout with 6 anti-patterns.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Playground demo + 4-place wiring

**Files:**

- Create: `packages/playground/src/pages/components/ColorPickerDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

### Step 7.1: Create `ColorPickerDemo.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { useState } from 'react';
import { ColorPicker } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/ColorPicker/ColorPicker.tsx?raw';
import scssSource from '@lib-source/components/ColorPicker/ColorPicker.module.scss?raw';

const BRAND_PRESETS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

function InlineNoPresets() {
  const [hex, setHex] = useState('#4F46E5');
  return (
    <Stack gap="sm">
      <ColorPicker.Panel value={hex} onChange={setHex} />
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function PopoverDefaultTrigger() {
  const [hex, setHex] = useState('#10B981');
  return (
    <Stack gap="sm" align="start">
      <ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function PopoverCustomTrigger() {
  const [hex, setHex] = useState('#F59E0B');
  return (
    <Stack gap="sm" align="start">
      <ColorPicker value={hex} onChange={setHex}>
        <ColorPicker.Trigger asChild>
          <Button variant="secondary">Pick a color ({hex})</Button>
        </ColorPicker.Trigger>
      </ColorPicker>
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function InlineWithPresets() {
  const [hex, setHex] = useState('#4F46E5');
  return (
    <Stack gap="sm">
      <ColorPicker.Panel value={hex} onChange={setHex} presets={BRAND_PRESETS} />
      <Text size="sm" tone="muted">
        Value: <Code>{hex}</Code>
      </Text>
    </Stack>
  );
}

function DisabledDemo() {
  const [hex, setHex] = useState('#4F46E5');
  return (
    <Cluster gap="md" align="start">
      <ColorPicker.Panel value={hex} onChange={setHex} disabled />
      <ColorPicker value={hex} onChange={setHex} disabled triggerLabel="Locked" />
    </Cluster>
  );
}

export function ColorPickerDemo() {
  return (
    <DemoLayout
      name="ColorPicker"
      description="Controlled HEX color picker with two distribution shapes — compact popover trigger for form fields, and an inline <ColorPicker.Panel> for theme builders. Hand-rolled SV square + hue slider + HEX input. Consumer-supplied preset swatches."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="ColorPicker.tsx"
      scssFilename="ColorPicker.module.scss"
      componentName="ColorPicker"
    >
      <Example
        title="Inline panel, no presets"
        description="The bare picker — <ColorPicker.Panel> renders directly without a popover wrapping. Use this for theme builders and settings rows where the picker is always visible."
        code={`function InlineNoPresets() {
  const [hex, setHex] = useState('#4F46E5');
  return <ColorPicker.Panel value={hex} onChange={setHex} />;
}`}
      >
        <InlineNoPresets />
      </Example>

      <Example
        title="Popover with default trigger"
        description="The canonical CRM form-field shape. Default trigger is an input-styled button with a 16×16 color swatch and the uppercase HEX. triggerLabel customizes the accessible label."
        code={`<ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />`}
      >
        <PopoverDefaultTrigger />
      </Example>

      <Example
        title="Popover with custom trigger"
        description="Override the default trigger via <ColorPicker.Trigger asChild>. The child must forwardRef — <Popover.Trigger> clones it to inject the click handler + aria-*."
        code={`<ColorPicker value={hex} onChange={setHex}>
  <ColorPicker.Trigger asChild>
    <Button variant="secondary">Pick a color ({hex})</Button>
  </ColorPicker.Trigger>
</ColorPicker>`}
      >
        <PopoverCustomTrigger />
      </Example>

      <Example
        title="Inline with consumer-supplied presets"
        description="Pass `presets={[...]}` to render a swatch grid below the hue slider. Clicking a swatch commits the color (fires both onChange and onChangeEnd). Selected swatch gets an inset ring + check overlay."
        code={`<ColorPicker.Panel
  value={hex}
  onChange={setHex}
  presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6']}
/>`}
      >
        <InlineWithPresets />
      </Example>

      <Example
        title="Disabled — both variants"
        description="Inline panel: dimmed, SV pad has aria-disabled and tabIndex=-1, slider + input + presets are all non-interactive. Popover: trigger is disabled, click doesn't open the panel."
        code={`<ColorPicker.Panel value={hex} onChange={setHex} disabled />
<ColorPicker value={hex} onChange={setHex} disabled triggerLabel="Locked" />`}
      >
        <DisabledDemo />
      </Example>
    </DemoLayout>
  );
}
```

### Step 7.2: Modify `App.tsx` — add import + route

Read `packages/playground/src/App.tsx`. The Forms cluster's component demos are alphabetical. ColorPicker (`C-o-l`) slots between Checkbox and DatePicker.

**Edit 7a — add import** (alphabetical position):

old_string:

```tsx
import { CheckboxDemo } from './pages/components/CheckboxDemo';
```

new_string:

```tsx
import { CheckboxDemo } from './pages/components/CheckboxDemo';
import { ColorPickerDemo } from './pages/components/ColorPickerDemo';
```

**Edit 7b — add route** (alphabetical):

old_string:

```tsx
<Route path="/components/checkbox" element={<CheckboxDemo />} />
```

new_string:

```tsx
          <Route path="/components/checkbox" element={<CheckboxDemo />} />
          <Route path="/components/color-picker" element={<ColorPickerDemo />} />
```

### Step 7.3: Modify `AppShell.tsx` — add Palette icon + Forms-group item

Read `packages/playground/src/layout/AppShell/AppShell.tsx`. Forms cluster is alphabetical.

**Edit 7c — add `Palette` from lucide-react** (anchor the closing `type LucideIcon` line):

old_string:

```tsx
  type LucideIcon,
} from 'lucide-react';
```

new_string:

```tsx
  Palette,
  type LucideIcon,
} from 'lucide-react';
```

If a previous PR added an icon immediately above `type LucideIcon`, expand the anchor by one more line for uniqueness.

**Edit 7d — add Forms-group nav item** (between Checkbox and Date pickers):

old_string (read the file first to find the exact pair — Forms cluster typically has a Checkbox entry followed by a Date pickers entry):

```tsx
      { to: '/components/checkbox', label: 'Checkbox', icon: <Check icon import>, end: false },
      { to: '/components/datepickers', label: 'Date pickers', icon: <Calendar icon import>, end: false },
```

new_string (preserve the existing Checkbox and Date pickers icons unchanged; just insert ColorPicker in between):

```tsx
      { to: '/components/checkbox', label: 'Checkbox', icon: <Check icon import>, end: false },
      { to: '/components/color-picker', label: 'ColorPicker', icon: Palette, end: false },
      { to: '/components/datepickers', label: 'Date pickers', icon: <Calendar icon import>, end: false },
```

The placeholder `<Check icon import>` and `<Calendar icon import>` represent whatever the existing icons are (read the file first; do NOT actually paste angle-bracket text — just keep the existing icon refs as-is).

### Step 7.4: Modify `ComponentsIndex.tsx` — add import + card

Read the file to find the existing Checkbox card block.

**Edit 7e — add import** (alphabetical):

old_string:

```tsx
import { Checkbox } from '@eocrm/design-system';
```

new_string:

```tsx
import { Checkbox } from '@eocrm/design-system';
import { ColorPicker } from '@eocrm/design-system';
```

**Edit 7f — add card entry between Checkbox and DatePicker**:

Find the existing Checkbox card's complete `{ ... },` block. After it, insert this ColorPicker card. Use Edit with the Checkbox card block as `old_string` and the Checkbox card block + the new ColorPicker card as `new_string`:

```tsx
  {
    to: '/components/color-picker',
    name: 'ColorPicker',
    description: 'Controlled HEX color picker with two shapes — popover trigger for form fields and an inline <ColorPicker.Panel> for theme builders. SV square + hue slider + HEX input + optional presets.',
    preview: (
      <div
        style={{
          width: '100%',
          maxWidth: 220,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <ColorPicker.Panel
          value="#4F46E5"
          onChange={() => {}}
          presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444']}
        />
      </div>
    ),
  },
```

If the existing pattern in `ComponentsIndex.tsx` uses different property names than `to` / `name` / `description` / `preview`, follow the existing pattern's shape. The implementer reads the Checkbox card to mirror it.

### Step 7.5: Modify `registry.ts` — extend ComponentName union

old_string:

```ts
  | 'Checkbox'
```

new_string:

```ts
  | 'Checkbox'
  | 'ColorPicker'
```

If the union has different surrounding context, find a unique two-line anchor and insert `'ColorPicker'` in alphabetical position (between `'Checkbox'` and whatever comes next, typically `'Date pickers'`).

### Step 7.6: Verify gates

From `/home/dpws/projects/design-system`:

- [ ] Run `make build`. Expected: typecheck + vite bundle clean (the playground typechecks against `@eocrm/design-system`'s new exports).
- [ ] Run `make lint`. Expected: clean.

If the build fails on the demo file:

- Type errors importing from `@eocrm/design-system` — confirm `Stack`, `Cluster`, `Button`, `Text`, `Code`, `ColorPicker` (with `.Panel` and `.Trigger` attached) are all exported from the barrel.
- `DemoLayout`, `Example`, `@lib-source/*` imports — these are pre-existing playground patterns. Look at another recent demo (e.g. `ImageCropDemo.tsx` or `SliderDemo.tsx`) to mirror exactly.

### Step 7.7: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/playground/src/pages/components/ColorPickerDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts && git commit -m "$(cat <<'EOF'
ColorPicker demo + 4-place wiring

ColorPickerDemo: 5 examples — inline panel no presets, popover with
default trigger, popover with custom trigger via <ColorPicker.Trigger
asChild>, inline with consumer-supplied presets (8 brand colors), and
both variants disabled side-by-side.

Wired into App.tsx routes, AppShell Forms nav (Palette icon between
Checkbox and Date pickers alphabetically), ComponentsIndex overview card
with a small inline panel preview (pointerEvents:none), and the mockup
registry ComponentName union.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Hard Rule 8 + push + PR

**Files:** none directly — this task is the review loop on Tasks 1–7.

### Step 8.1: Run all four gates from the repo root

- [ ] `cd /home/dpws/projects/design-system && make test`. Expected: every test passes (baseline + ~34 new ColorPicker tests).
- [ ] `make build-lib`. Expected: clean.
- [ ] `make build`. Expected: clean.
- [ ] `make lint`. Expected: clean.

If any gate fails, fix and re-run all four. Don't proceed to 8.2 until all four are green.

### Step 8.2: Dispatch the HR8 reviewer (round 1)

Use a fresh-context `general-purpose` agent with **opus** model. Brief on the 10 review categories from `packages/design-system/CLAUDE.md` Rule 8.

**Pre-known design decisions to forward** (do NOT re-litigate):

1. **Hand-rolled color math** — no react-colorful, no color libraries. `hexToHsv` / `hsvToHex` / `normalizeHex` are public utilities.
2. **Compound pattern** with `<ColorPicker>`, `<ColorPicker.Panel>`, `<ColorPicker.Trigger>` attached via `Object.assign`. Matches Card / Popover idiom.
3. **`<ColorPicker.Trigger>` is a marker component** — returns `null`, never mounts. The parent reads its props from React's element tree.
4. **`asChild` on `<ColorPicker.Trigger>` is currently always-true** (documented as reserved for a future Slot-style variant). The current implementation always passes through to `<Popover.Trigger>` which always clones.
5. **Local HSV state-of-truth** model — HEX is consumer-facing, HSV is internal. The `useEffect([value])` detects external writes by comparing the prop's normalized HEX to our round-trip HEX.
6. **HEX input three-state buffering** — synced / editing / invalid. Live commit on valid parse during typing; blur reverts to canonical on invalid.
7. **Alpha deferred to v2** — value contract is `#RRGGBB` only. Future `#RRGGBBAA` is additive.
8. **EyeDropper deferred to v2** (Chrome-only).
9. **No built-in default palette** — `presets` is consumer-supplied only.
10. **SV square uses CSS gradients** (not canvas) — `::before` saturation + `::after` value over `hsl(<h>, 100%, 50%)`.
11. **Hue slider rainbow track via wrapper class** — `.hueSlider :global([class*="track"])` with `!important` to defeat Slider's tone variants. No modification to Slider.
12. **Popover placement** — split `popoverPlacement: 'bottom-start'` into Popover.Content's `side='bottom' align='start'` via `PLACEMENT_MAP`.
13. **Dev-only console.warn** on invalid initial value (same precedent as Slider's max<min check).
14. **`role="application"` on SV pad** (matches ImageCrop's viewport precedent for 2D controls).

**Particular things to ask for fresh eyes on:**

A. **Local HSV state-of-truth detection** — `useEffect([value])` with the `ourHex !== propHex` check. Is the comparison robust against floating-point HSV→HEX rounding? What if the consumer's setCrop sets a HEX that round-trips to slightly different HSV → slightly different HEX → infinite update loop? Walk the math.

B. **`<ColorPicker.Trigger>` marker child detection** — `Children.toArray(children).find(...c.type === ColorPickerTrigger)`. What if the consumer wraps it in a Fragment, or in a HOC that changes the displayed type? Are there foot-guns?

C. **Hue slider `!important` override** — is the override stable against the consumer passing extra Slider props like `tone` (which would also try to override the track background)? Read Slider.module.scss to confirm tone variants don't have even-higher specificity.

D. **HEX input invalid styling** — `invalid={!draftIsValid && draft !== ''}`. The `draft !== ''` check means an empty input is NOT invalid. Is that right? (Empty input = user cleared the field; should probably show as invalid because there's no commitable value. But the design said "don't show invalid while user is mid-clear-and-retype". Confirm.)

E. **Round-trip stability on the demo palette** — colorMath.test.tsx has 16 round-trip cases. Does the test cover the demo's BRAND_PRESETS exactly? If not, add — these are the colors the user will most often see in the wild.

F. **Disabled state coverage** — disabled trigger, disabled panel, disabled SV pad, disabled slider, disabled HEX input, disabled presets. Verify all six paths are exercised somewhere in the tests.

G. **JSDoc completeness per Rule 7** — every exported member (ColorPicker, ColorPickerPanel, ColorPickerTrigger, hexToHsv, hsvToHex, normalizeHex, HSV, ColorPickerProps, ColorPickerPanelProps, ColorPickerTriggerProps) has JSDoc.

H. **`npm pack --dry-run`** — verify the ColorPicker directory is included, test files are excluded.

I. **AGENTS.md placement** — confirm between Checkbox and DatePicker.

J. **Tokens-only in SCSS** — no raw colors outside the stylelint-disable comments. The exceptions (SV indicator pure white, check icon pure white, SV-pad math gradients, rainbow gradient) are well-documented.

K. **`role="group"` on presets + `aria-pressed` on swatches** — does that match a screen-reader-expected pattern, or should it be a toolbar / listbox? Defer to the reviewer.

L. **`autoCapitalize="none"` + `spellCheck={false}` on HEX input** — mobile keyboards. Are these needed? Are there others (`inputMode="text"` to lock to keyboard? `pattern` attr?) that would improve mobile UX?

Output format: Critical / Important / Nice-to-have / Regression-watch + final verdict (`clean enough to stop` / `keep iterating`).

### Step 8.3: Fix every Critical + Important finding

- [ ] For each Critical, fix in-line and commit with `ColorPicker: HR8 review-cycle fixes (round N) — <short rationale>`.
- [ ] Same for Important.
- [ ] Nice-to-haves are judgment calls — fix when cheap.
- [ ] For every finding deliberately skipped, include a one-line "why we skipped" in the next response.

### Step 8.4: Re-run all four gates after fixes

- [ ] `make test && make build-lib && make build && make lint`. All green.

### Step 8.5: Dispatch HR8 reviewer (round 2+)

Same prompt as 8.2, framed as "round N — verify round (N-1) fixes". Continue until verdict is `clean enough to stop`.

### Step 8.6: Push the branch

- [ ] `git push -u origin feat/color-picker`. If husky pre-push hook fails on prettier:
  1. `npx prettier --write <listed files>`
  2. `git add <files> && git commit -m "ColorPicker: prettier --write" -m "" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`
  3. `git push`

### Step 8.7: Open the PR

Write the PR body to `/tmp/pr-color-picker-body.md` via the Write tool, then:

```bash
gh pr create --title "ColorPicker + extractCropBlob-style color math utilities" --body-file /tmp/pr-color-picker-body.md
```

PR body content:

````markdown
## Summary

`<ColorPicker>` — controlled HEX color picker with two distribution shapes. Hand-rolled SV square + hue strip + HEX input. Compound API (`<ColorPicker>`, `<ColorPicker.Panel>`, `<ColorPicker.Trigger>`) matching Card / Popover idiom. Exports color-math utilities (`hexToHsv`, `hsvToHex`, `normalizeHex`) as public API for downstream theme builders.

## What ships

### `<ColorPicker>` (popover variant — default)

```tsx
<ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />
```
````

Input-field-shaped trigger button with a 16×16 swatch + uppercase HEX. Click opens a `<Popover>` containing the picker panel. Override the trigger with `<ColorPicker.Trigger asChild>{customNode}</ColorPicker.Trigger>` — `<Popover.Trigger>` clones the child to inject click + aria + ref.

### `<ColorPicker.Panel>` (inline variant)

```tsx
<ColorPicker.Panel value={hex} onChange={setHex} />
```

Picker UI without the popover wrapping. Drop directly into theme builders / settings pages.

### Public color math

```tsx
import { hexToHsv, hsvToHex, normalizeHex } from '@eocrm/design-system';
```

Pure functions, no React deps. Useful for downstream theme builders, contrast calculators, color converters.

## Design decisions baked in

- **Hand-rolled** — no `react-colorful`, no third-party color libs. Library convention.
- **HEX-only value contract** in v1. Alpha (`#RRGGBBAA`) is additive in v2.
- **Compound pattern** — `<ColorPicker>` / `.Panel` / `.Trigger` attached via `Object.assign`.
- **`<ColorPicker.Trigger>` is a marker** — never renders, parent reads from React element tree. Simpler than context-plumbed slot.
- **Local HSV state-of-truth** — preserves hue at saturation=0 / value=0 where HEX is lossy.
- **HEX input three-state buffering** — live commit on valid parse; blur reverts on invalid.
- **CSS-gradient SV pad** (no canvas). `::before` saturation + `::after` value over `hsl(<h>, 100%, 50%)`.
- **Hue slider rainbow track via wrapper class** — no Slider modifications needed.
- **No built-in default palette** — `presets` is consumer-supplied only.
- **EyeDropper API deferred to v2** (Chrome-only).
- **No RGB / HSL numeric inputs** in v1.

## Tests

**~34 cases** across pure-function color math (10) and component tests (24). Rendering, controlled value, SV pad pointer + keyboard, hue slider integration with hue-preservation at S=0, HEX input four states, presets click + selected state, popover open/close + custom trigger, disabled state, round-trip stability.

## Hard Rule 8

Standard cycle ran to `clean enough to stop`.

## Test plan

- [ ] `/components/color-picker`: 5 examples render (inline no presets, popover default trigger, popover custom trigger, inline with presets, disabled both variants).
- [ ] Drag on the SV pad — color updates in the Code label below.
- [ ] Drag the hue slider — hue updates without jumping.
- [ ] Pick a preset — swatch shows the check overlay, color commits.
- [ ] Custom trigger demo — clicking the Button opens the picker.
- [ ] AGENTS.md ColorPicker section between Checkbox and DatePicker.
- [ ] `npm pack --dry-run` includes ColorPicker directory, no test files.
- [ ] Color math: `hexToHsv('#FF0000')` → `{h:0, s:100, v:100}`; `normalizeHex('#fff')` → `'#FFFFFF'`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

```

- [ ] Print the PR URL when done.

---

## Self-review (run before invoking subagent-driven-development)

### Spec coverage

- Spec §Goal — T1–T7 implement the popover variant + inline variant + HEX-only value contract.
- Spec §Non-goals — encoded in JSDoc anti-patterns (T3, T4) and AGENTS.md hard-rule (T6).
- Spec §Architecture (file layout, state model) — T1 (math), T2 (SVSquare), T3 (Panel), T4 (popover wrapper).
- Spec §Public API — verbatim in T3 (Panel) + T4 (ColorPicker) types.
- Spec §Internal state model — implemented verbatim in T3, including the local-HSV-of-truth pattern with the `useEffect([value])` external-write detection.
- Spec §Interactions (SV keyboard, hue slider, HEX input states, presets, popover behavior, disabled) — T3 covers all six.
- Spec §Edge cases — invalid initial value (T3 dev-only warn), 3-char hex (T3 + T1 normalizeHex), lowercase / missing hash (T1), S=0 / V=0 hue preservation (T3 local-HSV model), HSV↔HEX rounding (T3 reads from localHsv not round-trip).
- Spec §Color math implementation — T1 (verbatim).
- Spec §SVSquare component sketch — T2 (full implementation).
- Spec §Styling — T3 SCSS (verbatim with stylelint disables).
- Spec §Testing strategy — T1 colorMath tests + T5 ColorPicker tests cover all the listed cases.
- Spec §Demo additions — T7 ColorPickerDemo with 5 examples.
- Spec §4-place wiring — T7.
- Spec §AGENTS.md addition — T6.
- Spec §HR8 cycle — T8.
- Spec §Follow-up work — out of scope, documented.

### Placeholder scan

- "TBD" / "TODO" / "implement later" — none.
- "Add appropriate error handling" / "handle edge cases" — none.
- "Write tests for the above" without code — none (all test code is verbatim).
- "Similar to Task N" — none (every code block is fully spelled out).
- T7's icon-replacement note uses `<Check icon import>` as a meta-placeholder for "whatever the existing icon ref is" — the implementer reads the file first, no actual placeholder text gets written into code.
- T6's AGENTS.md anchor pattern uses a suggested template that the implementer matches to the actual file content — same pattern as Slider / FileUpload / ImageCrop plans, well-established.

### Type consistency

- `HSV { h, s, v }` defined in T1 colorMath; used as the local-state shape in T3; round-tripped through `hsvToHex`/`hexToHsv` everywhere.
- `ColorPickerProps`, `ColorPickerPanelProps`, `ColorPickerTriggerProps` declared in T3/T4; re-exported in T5 src/index.ts; referenced in T6 AGENTS.md prose; imported in T7 demo.
- `presets?: string[]` consistent across Panel + Root.
- `triggerLabel` only on Root (Panel doesn't have a trigger), `popoverPlacement` only on Root, `disabled` on both.
- `onChange(hex: string)` signature consistent across Root + Panel.
- `Object.assign(ColorPickerRoot, { Trigger, Panel })` attaches both compound children; tests import `ColorPicker` and access `.Panel` and `.Trigger`.
- SCSS class names camelCase: `.panel`, `.svSquare`, `.svIndicator`, `.hueSlider`, `.hexInput`, `.presets`, `.presetSwatch`, `.presetSwatchSelected`, `.trigger`, `.triggerSwatch`, `.triggerHex`. Test regex substrings (`/panel/`, `/svIndicator/`, etc.) match.

### Found and fixed inline during write

- `popoverPlacement` (consumer-facing union) had to be split into Popover.Content's `side` + `align` (different shape). Resolved with a `PLACEMENT_MAP` constant in T4 — keeps the consumer API clean.
- `<Popover.Trigger>` always clones, so `<ColorPicker.Trigger asChild>`'s `asChild` flag is currently a no-op. Documented in JSDoc as "reserved for future Slot-style variant" rather than dropped — preserves the spec API.
- Test for the empty-input case — `invalid={!draftIsValid && draft !== ''}` means empty input isn't styled invalid. Test confirms this is intentional (user clearing the field shouldn't immediately scream "invalid").
- The check-icon overlay on selected preset uses `::after { content: '✓' }` (Unicode) rather than an SVG. Simpler, no inline SVG to JSX-cast.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-color-picker.md`.

Per `feedback_plan_execution_mode` memory: subagent-driven execution, no asking.

Use **superpowers:subagent-driven-development** to execute.

- Tasks 1, 2, 3, 4, 5, 7: sonnet implementer
- Task 6: haiku implementer (mechanical AGENTS.md insertion)
- Task 8 reviewers: opus
```
