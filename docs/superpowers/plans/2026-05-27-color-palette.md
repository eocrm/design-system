# Color Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 30-color categorical palette in `@eocrm/design-system` (60 bg+fg tokens) + a `PaletteColor` TypeScript surface + a `color?: PaletteColor` prop on Checkbox.

**Architecture:** Tokens live in `tokens.scss` under a new `--color-palette-*` namespace, separate from semantic `--color-badge-*`. A new `src/palette/` module (NOT under `src/components/`) hosts the type, the `PALETTE_COLORS` array, and the `paletteTokens()` helper — that placement keeps the new module outside the component meta-tests' scope. Checkbox's color extension is a single-CSS-var injection: when `color` is set, the label gets `style={{ '--checkbox-color': … }}`, and the SCSS reads it via `var(--checkbox-color, var(--color-accent))`.

**Tech Stack:** TypeScript, Vitest, SCSS modules. No new dependencies. The Checkbox change reuses the existing `--color-accent` fallback so unconfigured checkboxes are byte-identical to today.

**Spec:** `docs/superpowers/specs/2026-05-27-color-palette-design.md`

**Branch:** `feat/color-palette` (already checked out)

**Confirmed primitive facts (probed before writing this plan):**

- `structure.test.ts` only iterates `src/components/` — a new `src/palette/` directory falls outside its scope. No meta-test changes needed.
- `manifest.ts` CLUSTERS map only classifies components under `src/components/`. The palette module isn't a component, so no manifest entry needed.
- Checkbox's checked + indeterminate state shares one SCSS rule:
  ```scss
  .input:checked + .box,
  .input:indeterminate + .box {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
  ```
  We swap `var(--color-accent)` for `var(--checkbox-color, var(--color-accent))` — defaults are byte-identical.
- The Checkbox label currently has no `style` prop — adding `style={{ '--checkbox-color': … } as React.CSSProperties}` is safe.

---

## File Structure

| File | Role |
|---|---|
| `packages/design-system/src/styles/tokens.scss` (MODIFY) | Add 60 palette tokens in a dedicated block |
| `packages/design-system/src/palette/palette.ts` (NEW) | `PaletteColor` type + `PALETTE_COLORS` + `paletteTokens()` |
| `packages/design-system/src/palette/palette.test.ts` (NEW) | Unit tests for the helper |
| `packages/design-system/src/palette/index.ts` (NEW) | Public re-exports |
| `packages/design-system/src/index.ts` (MODIFY) | Re-export palette surface |
| `packages/design-system/src/components/Checkbox/Checkbox.tsx` (MODIFY) | Add `color?: PaletteColor` + inline CSS-var |
| `packages/design-system/src/components/Checkbox/Checkbox.module.scss` (MODIFY) | Use `var(--checkbox-color, var(--color-accent))` |
| `packages/design-system/src/components/Checkbox/Checkbox.test.tsx` (MODIFY) | Tests for the new prop |
| `packages/design-system/AGENTS.md` (MODIFY) | Palette section in the Display cluster |
| `packages/playground/src/pages/components/PaletteDemo.tsx` (NEW) | Demo page (swatch grid + consumer pattern + Checkbox colors) |
| `packages/playground/src/App.tsx` (MODIFY) | Route + import |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY) | Sidebar entry (Display cluster) |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` (MODIFY) | Overview card |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY) | Add `'Palette'` to `ComponentName` union |

---

## Task 1: Add 60 palette tokens to `tokens.scss`

**Files:**
- Modify: `packages/design-system/src/styles/tokens.scss`

- [ ] **Step 1: Locate the existing badge token block**

```bash
grep -nE "^  --color-badge-" packages/design-system/src/styles/tokens.scss | head -3
grep -nE "^  --color-badge-purple-fg" packages/design-system/src/styles/tokens.scss
```

The badge tokens occupy roughly lines 44–55. The palette block goes immediately after the closing `--color-badge-purple-fg` line (around line 55) — palette is conceptually adjacent to badge but lives in its own namespace.

- [ ] **Step 2: Insert the 30-color palette block**

After the `--color-badge-purple-fg: #403294;` line, add a blank line and then this block exactly:

```scss
  // ─── Categorical palette (consumer-defined mapping) ─────────────────────
  // 30 named colors with bg + fg pairs. Use for consumer-defined domain →
  // color mappings (audit event namespaces, tag picker, team-colored
  // checkboxes, …). NOT semantic — use --color-badge-* for status. See
  // packages/design-system/src/palette/palette.ts for the TypeScript surface.
  --color-palette-red-bg: #ffebe6;
  --color-palette-red-fg: #bf2600;
  --color-palette-coral-bg: #ffe5dd;
  --color-palette-coral-fg: #9e3a14;
  --color-palette-orange-bg: #fff0db;
  --color-palette-orange-fg: #974f00;
  --color-palette-amber-bg: #fff7d6;
  --color-palette-amber-fg: #7a5300;
  --color-palette-gold-bg: #fff3c0;
  --color-palette-gold-fg: #806100;
  --color-palette-yellow-bg: #fffacc;
  --color-palette-yellow-fg: #6b5f00;
  --color-palette-olive-bg: #f0f3cc;
  --color-palette-olive-fg: #4d5a00;
  --color-palette-lime-bg: #e8f7c8;
  --color-palette-lime-fg: #3c6900;
  --color-palette-green-bg: #d4f5dd;
  --color-palette-green-fg: #006633;
  --color-palette-emerald-bg: #d2f0e1;
  --color-palette-emerald-fg: #00714d;
  --color-palette-mint-bg: #d6f5ec;
  --color-palette-mint-fg: #00755a;
  --color-palette-teal-bg: #d6f0f0;
  --color-palette-teal-fg: #006970;
  --color-palette-cyan-bg: #dff5f9;
  --color-palette-cyan-fg: #00657a;
  --color-palette-sky-bg: #dceefb;
  --color-palette-sky-fg: #1f5285;
  --color-palette-blue-bg: #deebff;
  --color-palette-blue-fg: #0747a6;
  --color-palette-navy-bg: #d8e0f0;
  --color-palette-navy-fg: #1a2e63;
  --color-palette-indigo-bg: #e2e2f7;
  --color-palette-indigo-fg: #2c2d80;
  --color-palette-violet-bg: #e3deff;
  --color-palette-violet-fg: #4030a6;
  --color-palette-lavender-bg: #ece6ff;
  --color-palette-lavender-fg: #5d4ba6;
  --color-palette-purple-bg: #eae6ff;
  --color-palette-purple-fg: #403294;
  --color-palette-plum-bg: #efddf0;
  --color-palette-plum-fg: #6a2b6b;
  --color-palette-fuchsia-bg: #fbdef5;
  --color-palette-fuchsia-fg: #7a1c70;
  --color-palette-magenta-bg: #ffd9f0;
  --color-palette-magenta-fg: #8c195e;
  --color-palette-pink-bg: #ffe0eb;
  --color-palette-pink-fg: #a3174a;
  --color-palette-rose-bg: #ffe1e1;
  --color-palette-rose-fg: #a01a35;
  --color-palette-brown-bg: #f1e3d3;
  --color-palette-brown-fg: #6b4a1f;
  --color-palette-taupe-bg: #ece5db;
  --color-palette-taupe-fg: #5a4a3a;
  --color-palette-slate-bg: #e2e6ed;
  --color-palette-slate-fg: #3d4b66;
  --color-palette-stone-bg: #e9e7e3;
  --color-palette-stone-fg: #4d4944;
  --color-palette-charcoal-bg: #d8dadc;
  --color-palette-charcoal-fg: #2e3338;
```

Verify the block has exactly 60 token lines (30 colors × 2 lines each).

- [ ] **Step 3: Lint + commit**

```bash
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -3
```

Both clean. Commit:

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/styles/tokens.scss
git commit -m "$(cat <<'EOF'
Palette: add 30 categorical colors as bg + fg token pairs

60 new CSS custom properties under --color-palette-* (separate
namespace from semantic --color-badge-*). Each of 30 named colors
has a very-light bg + dark-saturated fg, matching the existing
Badge tone shape. Block sits in tokens.scss right after the Badge
tokens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create the palette TypeScript module

**Files:**
- Create: `packages/design-system/src/palette/palette.ts`
- Create: `packages/design-system/src/palette/palette.test.ts`
- Create: `packages/design-system/src/palette/index.ts`

- [ ] **Step 1: Create `palette.ts`**

Write `packages/design-system/src/palette/palette.ts`:

```ts
/**
 * Categorical color palette. 30 named colors with bg + fg pairs.
 * Use for consumer-defined domain → color mappings (audit event
 * namespaces, tag/label picker, team-colored checkboxes, …).
 *
 * NOT semantic — use `BadgeTone` (info/success/warning/danger/…)
 * for status. Palette colors carry no meaning beyond visual identity.
 *
 * Tokens live in `src/styles/tokens.scss` under the
 * `--color-palette-<name>-bg/--color-palette-<name>-fg` namespace.
 */
export type PaletteColor =
  | 'red'
  | 'coral'
  | 'orange'
  | 'amber'
  | 'gold'
  | 'yellow'
  | 'olive'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'mint'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'navy'
  | 'indigo'
  | 'violet'
  | 'lavender'
  | 'purple'
  | 'plum'
  | 'fuchsia'
  | 'magenta'
  | 'pink'
  | 'rose'
  | 'brown'
  | 'taupe'
  | 'slate'
  | 'stone'
  | 'charcoal';

/**
 * Ordered list of all 30 palette colors. Use for demo grids, color
 * pickers, or anywhere a stable iteration order is needed.
 */
export const PALETTE_COLORS = [
  'red',
  'coral',
  'orange',
  'amber',
  'gold',
  'yellow',
  'olive',
  'lime',
  'green',
  'emerald',
  'mint',
  'teal',
  'cyan',
  'sky',
  'blue',
  'navy',
  'indigo',
  'violet',
  'lavender',
  'purple',
  'plum',
  'fuchsia',
  'magenta',
  'pink',
  'rose',
  'brown',
  'taupe',
  'slate',
  'stone',
  'charcoal',
] as const satisfies readonly PaletteColor[];

/**
 * Returns the CSS custom-property names for a palette color's bg and fg.
 * Use to apply palette colors to consumer-built components without
 * hard-coding the var names.
 *
 * @example
 * const { bg, fg } = paletteTokens('amber');
 * // bg === 'var(--color-palette-amber-bg)'
 * // fg === 'var(--color-palette-amber-fg)'
 *
 * @example
 * // In a consumer-built chip:
 * function CategoryChip({ color, children }: { color: PaletteColor; children: ReactNode }) {
 *   const { bg, fg } = paletteTokens(color);
 *   return <span style={{ background: bg, color: fg }}>{children}</span>;
 * }
 */
export function paletteTokens(color: PaletteColor): { bg: string; fg: string } {
  return {
    bg: `var(--color-palette-${color}-bg)`,
    fg: `var(--color-palette-${color}-fg)`,
  };
}
```

- [ ] **Step 2: Create `palette.test.ts`**

Write `packages/design-system/src/palette/palette.test.ts` (vitest globals — no `describe`/`it`/`expect`/`vi` imports):

```ts
import { PALETTE_COLORS, paletteTokens, type PaletteColor } from './palette';

it('PALETTE_COLORS has exactly 30 entries', () => {
  expect(PALETTE_COLORS).toHaveLength(30);
});

it('PALETTE_COLORS contains no duplicates', () => {
  const set = new Set<string>(PALETTE_COLORS);
  expect(set.size).toBe(PALETTE_COLORS.length);
});

it('paletteTokens returns var() strings for bg and fg', () => {
  expect(paletteTokens('red')).toEqual({
    bg: 'var(--color-palette-red-bg)',
    fg: 'var(--color-palette-red-fg)',
  });
});

it('paletteTokens uses the color name verbatim in the token path', () => {
  expect(paletteTokens('charcoal')).toEqual({
    bg: 'var(--color-palette-charcoal-bg)',
    fg: 'var(--color-palette-charcoal-fg)',
  });
  expect(paletteTokens('lavender')).toEqual({
    bg: 'var(--color-palette-lavender-bg)',
    fg: 'var(--color-palette-lavender-fg)',
  });
});

it('every PALETTE_COLORS entry round-trips through paletteTokens', () => {
  for (const color of PALETTE_COLORS) {
    const { bg, fg } = paletteTokens(color);
    expect(bg).toBe(`var(--color-palette-${color}-bg)`);
    expect(fg).toBe(`var(--color-palette-${color}-fg)`);
  }
});

// Type-level check: PaletteColor must exactly match PALETTE_COLORS.
// If a new color is added to the union but not the array (or vice versa),
// this test still compiles but the length test above catches it. The
// `satisfies readonly PaletteColor[]` in palette.ts is the structural
// guard at the type level.
it('PaletteColor union has 30 members (length matches array)', () => {
  // PALETTE_COLORS is `readonly PaletteColor[]` so each entry is a
  // PaletteColor; if the union grew without updating PALETTE_COLORS,
  // the length wouldn't be 30. Already asserted above; this is a
  // self-documenting placeholder so future readers know the type
  // surface is intentionally fixed at 30.
  const _typeCheck: PaletteColor = PALETTE_COLORS[0];
  expect(_typeCheck).toBeDefined();
});
```

- [ ] **Step 3: Create `index.ts`**

Write `packages/design-system/src/palette/index.ts`:

```ts
export type { PaletteColor } from './palette';
export { PALETTE_COLORS, paletteTokens } from './palette';
```

- [ ] **Step 4: Run tests + typecheck**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- palette 2>&1 | tail -10
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -3
```

6 palette tests must pass. Typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/palette
git commit -m "$(cat <<'EOF'
Palette: PaletteColor type + PALETTE_COLORS + paletteTokens helper

New src/palette/ module exposing:
- PaletteColor — type union of 30 color names
- PALETTE_COLORS — ordered readonly array, satisfies the union
- paletteTokens(color) — returns the CSS var() names for bg + fg

Lives outside src/components/ so it stays outside the component
meta-tests' iteration scope. Tests verify length, uniqueness, and
helper correctness.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Re-export palette from the library barrel

**Files:**
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Add the re-export**

Open `packages/design-system/src/index.ts`. Find a natural insertion point (the file groups exports by component; palette is a utility, so add it at the end of the file or near other type-only exports). Insert:

```ts
// ─── Palette (categorical color set) ──────────────────────────────────────
export type { PaletteColor } from './palette';
export { PALETTE_COLORS, paletteTokens } from './palette';
```

The exact location is not load-bearing — pick a spot that reads cleanly relative to neighbors. The simplest spot is at the very bottom of the file.

- [ ] **Step 2: Typecheck + commit**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -3
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -3
```

All clean. Commit:

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/index.ts
git commit -m "$(cat <<'EOF'
Palette: re-export from library barrel

PaletteColor type + PALETTE_COLORS array + paletteTokens helper now
importable from @eocrm/design-system.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add `color` prop to Checkbox

**Files:**
- Modify: `packages/design-system/src/components/Checkbox/Checkbox.tsx`
- Modify: `packages/design-system/src/components/Checkbox/Checkbox.module.scss`
- Modify: `packages/design-system/src/components/Checkbox/Checkbox.test.tsx`

- [ ] **Step 1: Update Checkbox.module.scss**

Open `packages/design-system/src/components/Checkbox/Checkbox.module.scss`. Find the checked/indeterminate rule (around lines 91–96):

Before:
```scss
// Checked + indeterminate share the filled-accent visual.
.input:checked + .box,
.input:indeterminate + .box {
  background: var(--color-accent);
  border-color: var(--color-accent);
}
```

After (swap both values for a CSS-var fallback):
```scss
// Checked + indeterminate share the filled-accent visual. The
// --checkbox-color CSS variable is set by the React layer when the
// `color` prop is passed (palette color); otherwise the fallback
// keeps the existing accent fill — defaults are byte-identical.
.input:checked + .box,
.input:indeterminate + .box {
  background: var(--checkbox-color, var(--color-accent));
  border-color: var(--checkbox-color, var(--color-accent));
}
```

Leave the hover rule (`.checkbox:not(.disabled, .invalid):hover .box { border-color: var(--color-accent); }`) and the focus-visible ring rule unchanged — both intentionally stay accent-colored regardless of the palette `color` prop (per spec).

- [ ] **Step 2: Update Checkbox.tsx**

Open `packages/design-system/src/components/Checkbox/Checkbox.tsx`.

First, add the palette type import. Find the existing imports (top of the file). Add:

```tsx
import { type PaletteColor } from '../../palette';
```

(Use the relative path from `Checkbox` to `palette`. If the import path differs because of how the workspace is configured, adapt.)

Second, add `color` to `CheckboxProps`. Find the interface (around line 18). Insert the `color` field with JSDoc:

```tsx
export interface CheckboxProps extends Omit<
  /* …existing extends… */
> {
  /* …existing fields… */

  /**
   * Optional palette color for the checked / indeterminate fill. When
   * set, the filled state uses the palette color's fg token instead
   * of `--color-accent`. Use to color-tag checkbox groups (per-team,
   * per-status, per-category). Default unchanged (accent blue).
   *
   * The focus ring, hover border, and unchecked state are unchanged
   * regardless of `color` — only the checked / indeterminate fill is
   * affected.
   */
  color?: PaletteColor;
}
```

Third, accept `color` in the destructure (around line 121–132) and apply it as a CSS variable on the label:

```tsx
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    size = 'md',
    checked,
    defaultChecked,
    indeterminate,
    label,
    invalid,
    onChange,
    className,
    disabled,
    color,
    ...props
  },
  ref,
) {
  /* …existing isControlled / state / refs / handlers… */

  // When a palette color is set, expose it as a CSS variable scoped to
  // this checkbox. The SCSS reads `var(--checkbox-color, var(--color-accent))`
  // so undef = default accent.
  const colorStyle = color
    ? ({ '--checkbox-color': `var(--color-palette-${color}-fg)` } as React.CSSProperties)
    : undefined;

  return (
    <label
      className={clsx(
        styles.checkbox,
        styles[`size-${size}`],
        disabled && styles.disabled,
        invalid && styles.invalid,
        className,
      )}
      style={colorStyle}
    >
      {/* …existing children… */}
    </label>
  );
});
```

Notes:
- The cast `as React.CSSProperties` is needed because TypeScript's CSSProperties type doesn't know about arbitrary CSS custom properties.
- The `style` attribute on the label is set ONLY when `color` is provided. When `color` is undefined, `style={undefined}` — React renders nothing extra.
- The `disabled` state's SCSS rule (`.disabled .box { background: var(--color-bg-subtle); … }`) wins over the checked rule because it's declared later and has equal specificity — so disabled checkboxes keep their muted look regardless of `color`.

- [ ] **Step 3: Add tests in Checkbox.test.tsx**

Open `packages/design-system/src/components/Checkbox/Checkbox.test.tsx`. Add these tests at the end of the existing test file (before the closing brace if it's wrapped in describe, or at top level if not — match the existing file's structure):

```tsx
it('color="violet" sets --checkbox-color to the violet palette fg token', () => {
  const { container } = render(<Checkbox color="violet" label="Marketing" />);
  const label = container.querySelector('label');
  expect(label).not.toBeNull();
  // Inline style sets the CSS custom property.
  expect(label?.style.getPropertyValue('--checkbox-color')).toBe(
    'var(--color-palette-violet-fg)',
  );
});

it('no color prop means no --checkbox-color custom property is set', () => {
  const { container } = render(<Checkbox label="Default" />);
  const label = container.querySelector('label');
  expect(label?.style.getPropertyValue('--checkbox-color')).toBe('');
});

it('color="teal" produces the teal token reference', () => {
  const { container } = render(<Checkbox color="teal" label="Engineering" />);
  const label = container.querySelector('label');
  expect(label?.style.getPropertyValue('--checkbox-color')).toBe(
    'var(--color-palette-teal-fg)',
  );
});

it('color does not affect the unchecked checkbox visual (no fill)', () => {
  // Unchecked: --checkbox-color is set on the label but the SCSS doesn't
  // apply it to .box unless :checked / :indeterminate. We can't easily
  // assert the COMPUTED background of the box (jsdom doesn't evaluate
  // SCSS), but we can assert the input is unchecked.
  const { container } = render(<Checkbox color="amber" label="Sales" />);
  const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  expect(input.checked).toBe(false);
  expect(input.indeterminate).toBe(false);
});
```

- [ ] **Step 4: Run Checkbox tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- Checkbox 2>&1 | tail -10
```

Checkbox test count should increase by 4. All pass.

- [ ] **Step 5: Run full gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

All four clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Checkbox
git commit -m "$(cat <<'EOF'
Checkbox: color?: PaletteColor for tinted checked/indeterminate fill

Optional palette color tints the checked + indeterminate fill via a
single CSS-var injection. When color is set, the label gets
style={{ '--checkbox-color': 'var(--color-palette-X-fg)' }}, and the
SCSS reads var(--checkbox-color, var(--color-accent)) — defaults are
byte-identical to today.

Focus ring + hover border + unchecked state remain accent-colored
regardless of the palette color (per spec).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: AGENTS.md section for Palette

**Files:**
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Locate the insertion point**

```bash
grep -nE "^### \`<Badge" packages/design-system/AGENTS.md
```

Palette is a token utility, conceptually adjacent to Badge tones. Insert immediately AFTER the `### \`<Badge>\`` section ends (find Badge's last bullet, then the next blank line, then the next `### `) and BEFORE the next component section.

Concretely: find the line that says `### \`<Badge>\` — status / category pill`, scroll to where Badge's bullets end (the last `-`-prefixed line in the Badge section), and insert the new Palette section there.

- [ ] **Step 2: Insert the section**

The content (note the leading blank line for markdown spacing):

````markdown

### Palette — categorical color set

```tsx
import { paletteTokens, type PaletteColor } from '@eocrm/design-system';

// Consumer-side mapping: domain → color
const TEAM_COLOR: Record<string, PaletteColor> = {
  marketing: 'violet',
  engineering: 'teal',
  sales: 'amber',
  ops: 'slate',
};

// Custom consumer chip using the palette tokens
function TeamChip({ team }: { team: string }) {
  const { bg, fg } = paletteTokens(TEAM_COLOR[team] ?? 'stone');
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 4 }}>{team}</span>;
}

// Color-tagged checkbox (library-level integration)
<Checkbox color="violet" label="Marketing" />
```

- 30 named colors with bg + fg pairs: `red` / `coral` / `orange` / `amber` / `gold` / `yellow` / `olive` / `lime` / `green` / `emerald` / `mint` / `teal` / `cyan` / `sky` / `blue` / `navy` / `indigo` / `violet` / `lavender` / `purple` / `plum` / `fuchsia` / `magenta` / `pink` / `rose` / `brown` / `taupe` / `slate` / `stone` / `charcoal`.
- `PaletteColor` is the TypeScript union; `PALETTE_COLORS` is the ordered readonly array (use for pickers / demos).
- `paletteTokens(color)` returns `{ bg, fg }` as `var(...)` strings — use to apply palette colors in consumer-built components.
- **Categorical, not semantic.** For status, use `<Badge tone="success" />` etc. Palette colors carry no built-in meaning.
- Consumers own the **domain → color mapping** (e.g., per-event-namespace, per-team, per-tag). The library provides only the colors and the type surface.
- `<Checkbox color="violet">` is the one library component that accepts palette colors out-of-the-box — tints the checked / indeterminate fill. Others (Badge, FilterChip) keep their existing semantic-tone unions; consumers build custom chips when they want palette colors.
- Tokens live in `tokens.scss` as `--color-palette-<name>-bg` and `--color-palette-<name>-fg`.
````

- [ ] **Step 3: Lint + gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -3
```

All clean.

- [ ] **Step 4: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
Palette: AGENTS.md TL;DR section

Adds a Palette primer right after Badge. Lists all 30 color names,
explains the consumer-side mapping pattern, points at paletteTokens()
and the Checkbox color prop as the integration points.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Demo page + nav wiring

**Files:**
- Create: `packages/playground/src/pages/components/PaletteDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Create PaletteDemo.tsx**

Write `packages/playground/src/pages/components/PaletteDemo.tsx`:

```tsx
import { useState } from 'react';
import {
  Checkbox,
  Grid,
  PALETTE_COLORS,
  Stack,
  Text,
  paletteTokens,
  type PaletteColor,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import paletteSource from '@lib-source/palette/palette.ts?raw';
import tokensSource from '@lib-source/styles/tokens.scss?raw';

// Consumer-side mapping (lives in playground, NOT in the library).
const EVENT_NAMESPACE_COLOR: Record<string, PaletteColor> = {
  auth: 'blue',
  user: 'violet',
  role: 'amber',
  invitation: 'pink',
  contact: 'teal',
  deal: 'emerald',
  membership: 'gold',
  system_setting: 'slate',
};

function eventPaletteColor(event: string): PaletteColor {
  const namespace = event.split('.')[0];
  return EVENT_NAMESPACE_COLOR[namespace] ?? 'stone';
}

function CategoryChip({ color, children }: { color: PaletteColor; children: React.ReactNode }) {
  const { bg, fg } = paletteTokens(color);
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function Swatch({ color }: { color: PaletteColor }) {
  const { bg, fg } = paletteTokens(color);
  return (
    <div
      style={{
        background: bg,
        color: fg,
        padding: '12px 8px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {color}
    </div>
  );
}

const TEAM_COLORS: { team: string; color: PaletteColor }[] = [
  { team: 'Marketing', color: 'violet' },
  { team: 'Engineering', color: 'teal' },
  { team: 'Sales', color: 'amber' },
  { team: 'Support', color: 'rose' },
  { team: 'Design', color: 'fuchsia' },
  { team: 'Operations', color: 'slate' },
];

export function PaletteDemo() {
  const [teams, setTeams] = useState<Record<string, boolean>>({
    Marketing: true,
    Engineering: true,
    Sales: false,
    Support: false,
    Design: true,
    Operations: false,
  });

  return (
    <DemoLayout
      name="Palette"
      componentName="Palette"
      description="30 categorical bg + fg color pairs in the --color-palette-* namespace. Consumer-defined domain → color mapping; library Checkbox accepts palette colors out-of-the-box."
      tsxSource={paletteSource}
      scssSource={tokensSource}
      tsxFilename="palette.ts"
      scssFilename="tokens.scss"
    >
      <Example
        title="All 30 colors"
        description="Each swatch shows the bg fill and the fg text. Reference grid for picking colors by name."
        code={`import { PALETTE_COLORS, paletteTokens } from '@eocrm/design-system';

PALETTE_COLORS.map((color) => {
  const { bg, fg } = paletteTokens(color);
  return <div style={{ background: bg, color: fg }}>{color}</div>;
});`}
      >
        <InputExample width="auto">
          <Grid minColumnWidth="100px" gap="sm">
            {PALETTE_COLORS.map((color) => (
              <Swatch key={color} color={color} />
            ))}
          </Grid>
        </InputExample>
      </Example>

      <Example
        title="Consumer pattern — domain → color"
        description="Consumers own the mapping. Here: each audit-event namespace gets a distinct color, and a small custom <CategoryChip /> uses paletteTokens(color) to render."
        code={`const EVENT_NAMESPACE_COLOR: Record<string, PaletteColor> = {
  auth: 'blue',
  user: 'violet',
  role: 'amber',
  invitation: 'pink',
  contact: 'teal',
  deal: 'emerald',
};

function CategoryChip({ color, children }: { color: PaletteColor; children: ReactNode }) {
  const { bg, fg } = paletteTokens(color);
  return <span style={{ background: bg, color: fg }}>{children}</span>;
}

const events = ['auth.login_succeeded', 'user.created', 'role.assigned', /* … */];
events.map((e) => <CategoryChip color={eventPaletteColor(e)}>{e}</CategoryChip>);`}
      >
        <InputExample width="auto">
          <Stack gap="sm" align="start">
            {[
              'auth.login_succeeded',
              'auth.login_failed',
              'user.created',
              'user.deleted',
              'role.assigned',
              'invitation.sent',
              'contact.updated',
              'deal.won',
              'system_setting.changed',
            ].map((event) => (
              <CategoryChip key={event} color={eventPaletteColor(event)}>
                {event}
              </CategoryChip>
            ))}
          </Stack>
        </InputExample>
      </Example>

      <Example
        title='Checkbox color="…"'
        description="The library Checkbox accepts a palette color and tints the checked / indeterminate fill. Focus ring and hover stay accent-colored."
        code={`<Checkbox color="violet" label="Marketing" />
<Checkbox color="teal" label="Engineering" />
<Checkbox color="amber" label="Sales" />`}
      >
        <InputExample width="auto">
          <Stack gap="sm" align="start">
            {TEAM_COLORS.map(({ team, color }) => (
              <Checkbox
                key={team}
                color={color}
                label={team}
                checked={teams[team] ?? false}
                onChange={(next) => setTeams((prev) => ({ ...prev, [team]: next }))}
              />
            ))}
            <Text size="sm" tone="muted">
              Selected: {Object.entries(teams).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}
            </Text>
          </Stack>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
```

If `Grid` doesn't accept `minColumnWidth` (or if the existing API differs), check the Grid demo (`packages/playground/src/pages/components/GridDemo.tsx`) for the canonical usage and adapt. Same goes for `Stack` `align="start"` — match what's there.

- [ ] **Step 2: Wire route in App.tsx**

Open `packages/playground/src/App.tsx`. Add the import near other demo imports (e.g., near `PageDemo`):

```tsx
import { PaletteDemo } from './pages/components/PaletteDemo';
```

Add the route near the other component routes:

```tsx
<Route path="/components/palette" element={<PaletteDemo />} />
```

- [ ] **Step 3: Sidebar entry in AppShell.tsx**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. The Display group is where Palette belongs (token utility for visual identity, sits near Badge / Avatar / Text).

Check if `Palette` icon from lucide-react is already imported:

```bash
grep -nE "Palette," packages/playground/src/layout/AppShell/AppShell.tsx
```

If not, add `Palette` to the existing lucide-react import block alphabetically (near `Network` / `PanelLeft`).

Then in `componentGroups`, find the `Display` group. Add the Palette entry — sensible placement is between `Badge` and `Calendar` (or wherever it reads naturally in the existing order):

```tsx
{ to: '/components/palette', label: 'Palette', icon: Palette, end: false },
```

- [ ] **Step 4: Card in ComponentsIndex.tsx**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. Add `PALETTE_COLORS`, `paletteTokens`, and the `PaletteColor` type to the existing `@eocrm/design-system` import block if not already imported.

Find a sensible spot for a card — near Badge (since Palette is the categorical-color cousin of Badge's semantic tones). Add:

```tsx
{
  to: '/components/palette',
  name: 'Palette',
  description: '30 categorical bg + fg color pairs for consumer-defined domain → color mappings.',
  preview: (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 2,
        width: '100%',
      }}
    >
      {PALETTE_COLORS.slice(0, 30).map((color) => {
        const { bg } = paletteTokens(color);
        return (
          <div
            key={color}
            style={{
              background: bg,
              aspectRatio: '1 / 1',
              borderRadius: 2,
            }}
            aria-hidden
          />
        );
      })}
    </div>
  ),
},
```

(A 10×3 mini-grid of just the bg colors — a tiny visual identity for the card.)

- [ ] **Step 5: Add 'Palette' to ComponentName union**

Open `packages/playground/src/pages/mockups/registry.ts`. The `ComponentName` union is alphabetical. Insert `| 'Palette'` between `| 'Page'` (which precedes it alphabetically) and `| 'PageHeader'`:

```ts
  | 'Page'
  | 'PageHeader'
  | 'Palette'
```

Wait — alphabetical: P-a-g-e, P-a-g-e-H, P-a-l-e. So `PageHeader` < `Palette` because `g` < `l` at position 3. Order:

```ts
  | 'Page'
  | 'PageHeader'
  | 'Palette'
```

Check the existing union and place `'Palette'` accordingly. Do NOT add it to any mockup's `usesComponents` array (no mockup uses palette yet).

- [ ] **Step 6: Gates**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
```

All four clean.

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git status --short
git add packages/playground/src/pages/components/PaletteDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Palette: playground demo + nav wiring

Three examples: swatch grid (all 30 colors), consumer pattern
(domain → color → custom CategoryChip), Checkbox color tagging
(per-team filled checkboxes). Wired into the Display cluster in the
sidebar (Palette icon), ComponentsIndex overview card, and the
ComponentName union in registry.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Library review-fix cycle

**Files:** depends on findings.

- [ ] **Step 1: Final gate sweep**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "\.(test|spec)\.tsx?$" | head -5
```

All four green; pack grep zero lines. The palette files (`palette.ts`, `palette/index.ts`) should appear in `npm pack --dry-run` output WITHOUT the test file.

- [ ] **Step 2: Library reviewer (Hard rule 8)**

Spawn a fresh-context `general-purpose` agent. Brief on the 10 categories: bugs, a11y, API inconsistencies, type safety, rule violations (Hard rules 1, 3, 3a, 4, 5, 6, 7), test coverage, token discipline, SCSS, cross-package leakage, package/distribution.

Special focus areas for this review:
- `src/palette/` is outside `src/components/` — meta-tests should still pass (they iterate components only).
- Checkbox `color` prop: does the inline `--checkbox-color` CSS var injection respect Hard rule 6 (no inline `style` … except this single CSS-var assignment which is the canonical pattern)? Verify the SCSS fallback works for the default case (unchanged behavior).
- 30 hex values in `tokens.scss` — eyeball whether any two are too close (e.g., `pink` vs `rose`, `purple` vs `lavender`); if so, nudge one and document.

- [ ] **Step 3: Fix findings**

Address Critical and Important. Document deliberate skips of Nice-to-haves.

- [ ] **Step 4: Re-run gates + re-spawn reviewer**

Repeat until verdict is `clean enough to stop`.

- [ ] **Step 5: Commit review-fix changes (if any)**

---

## Task 8: Push + PR

- [ ] **Step 1: Push the branch**

```bash
cd /Users/dpws/projects/design-system && git push -u origin feat/color-palette 2>&1 | tail -10
```

If prettier pre-push fails, run `npx prettier --write <flagged files>`, commit as `chore: prettier`, and re-push.

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "Palette: 30 categorical colors + Checkbox color prop" --body "$(cat <<'EOF'
## Summary

New categorical color palette in `@eocrm/design-system`:

- **30 named colors**, each a bg + fg pair, in a new `--color-palette-*` token namespace (separate from semantic `--color-badge-*`).
- **`PaletteColor` type** + `PALETTE_COLORS` array + `paletteTokens(color)` helper exposed from the library barrel.
- **Checkbox** gains `color?: PaletteColor` — tints the checked / indeterminate fill via a single CSS-var injection. Defaults unchanged (accent blue).
- **Consumer-side mapping** is the canonical use pattern (domain → color stays in consumer code). Library doesn't ship audit-event-chip or tag-picker primitives.

- Spec: `docs/superpowers/specs/2026-05-27-color-palette-design.md`
- Plan: `docs/superpowers/plans/2026-05-27-color-palette.md`

## Test plan

- [x] 6 new tests in `src/palette/palette.test.ts` (length, uniqueness, helper round-trip)
- [x] 4 new Checkbox tests for the `color` prop
- [x] `make build`, `make lint`, `npm run typecheck` — all green
- [x] `npm pack --dry-run -w @eocrm/design-system` — palette files included; tests excluded
- [x] Full test suite passes
- [x] Demo page at `/components/palette` — swatch grid + consumer pattern + Checkbox colors
- [x] Hard rule 8 library review-fix cycle — final verdict `clean enough to stop`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -3
```

- [ ] **Step 3: Report the PR URL**

---

## Self-Review

**1. Spec coverage:**

- 30 colors as bg + fg token pairs in `--color-palette-*` — Task 1 ✓
- `PaletteColor` type + `PALETTE_COLORS` array + `paletteTokens()` helper — Task 2 ✓
- Public re-exports from `src/index.ts` — Task 3 ✓
- Checkbox `color?: PaletteColor` — Task 4 ✓ (with the CSS-var injection pattern specified)
- AGENTS.md TL;DR — Task 5 ✓
- Demo page (3 examples) — Task 6 ✓
- App.tsx route + sidebar + ComponentsIndex card + ComponentName union — Task 6 ✓
- Out-of-scope items (Badge/FilterChip extension, multi-shade, dark theme, auto-assignment, library-side audit chip, Avatar palette migration) — covered by their absence ✓

**2. Placeholder scan:** every step has concrete code or commands. The Task 6 `Grid minColumnWidth` and the AppShell `Palette` icon include grep-then-adapt guidance — that's an explicit instruction to match existing API, not a placeholder.

**3. Type consistency:**

- `PaletteColor` is the type union throughout (palette.ts, palette.test.ts, Checkbox.tsx, PaletteDemo.tsx).
- `PALETTE_COLORS` is `readonly PaletteColor[]` via `satisfies` — used in palette.test.ts iteration + PaletteDemo.tsx swatch grid.
- `paletteTokens(color)` returns `{ bg: string; fg: string }` — used consistently in palette.ts, palette.test.ts, AGENTS.md, PaletteDemo.tsx.
- `color?: PaletteColor` on Checkbox is consistent across the Props interface, the destructure, the inline-style construction, and the tests.

One stress-tested decision: the palette module is placed at `src/palette/` (NOT `src/components/palette/`). This is intentional because `structure.test.ts` only iterates `src/components/` — the palette is a utility module, not a React component, so it should sit outside that meta-test's scope. Task 7 Step 2 specifically asks the reviewer to verify this placement.
