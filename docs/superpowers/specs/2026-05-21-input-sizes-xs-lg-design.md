# Input field sizes — `xs` + `lg` across all field controls

**Date:** 2026-05-21
**Branch:** `feat/input-sizes-xs-lg`
**Scope:** `Input`, `Select`, `DatePicker`, `DateRangePicker`. Inline calendar variants intentionally excluded (they're grids, not fields).

## Goal

Bring the four field-style components onto a consistent four-step size scale (`xs | sm | md | lg`) matching the one `Button` already uses. `md` stays the default — adding the prop introduces no behavior change for existing consumers.

## Why

- Dense CRM screens (filter rows, inline-edit tables) need a 20px-tall field that visually pairs with `Button size="xs"`.
- Marketing-style and mobile-friendly screens want a roomier 40px `lg` for hero search / primary form fields.
- Today's `Select` already exposes `sm | md | lg`. `Input`, `DatePicker`, `DateRangePicker` ship a single hard-coded 32px height. The asymmetry is the bug; aligning all four on the same union is the fix.

## Non-goals

- Inline calendar variants (`InlineDatePicker`, `InlineDateRangePicker`) — their density is a separate `cellSize`-style question and not coupled to field height.
- Future controls (`Textarea`, `Checkbox`, `Radio`, `Switch`) — they'll opt in when shipped.
- Auto-sized "responsive" fields. Consumer picks one size per field; no media-query magic.
- Library-wide token rename. The existing `--size-{xs,sm,md,lg}` and `--font-size-{xs,sm,md,lg}` tokens are reused as-is.

## The shared size scale

| Step | Height            | Font                  | Inline-button slot | Icon |
| ---- | ----------------- | --------------------- | ------------------ | ---- |
| `xs` | `--size-xs` 20px  | `--font-size-xs` 11px | 16×16              | 12px |
| `sm` | `--size-sm` 24px  | `--font-size-sm` 12px | 20×20              | 14px |
| `md` | `--size-md` 32px  | `--font-size-md` 14px | 20×20              | 14px |
| `lg` | `--size-lg` 40px  | `--font-size-lg` 16px | 24×24              | 16px |

The inline-button slot column applies to DatePicker / DateRangePicker (clear ✕ + open-calendar buttons). At `xs` the slot shrinks to 16×16 so the 12px icon stays centered with breathing room; at `lg` it bumps to 24×24 so the icon doesn't look orphaned. `sm` and `md` deliberately share 20×20 — that's where the current 32px field already sits and there's no UX win in scaling each step independently.

These four targets are CSS custom-property reuses, not new tokens. Nothing gets added to `tokens.scss`.

### Why these exact icon-slot dimensions

At `xs` (20px row), padding is `0 var(--space-2)` (8px) → inner row height is 20px. A 16×16 button at the right edge of a 20px row reads as a flush trailing affordance; 20×20 would touch the border. At `lg` (40px row, padding `0 var(--space-3)` = 12px), 20×20 is too small relative to the row — 24×24 reads correctly. The slot sizes here are the result of paint-time intuition, not arbitrary scaling math; if a reviewer prefers different exact numbers, change them.

## Per-component changes

### `<Input>`

**TSX:**

```ts
export type InputSize = 'xs' | 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Toggles the error visual + sets `aria-invalid="true"`. */
  invalid?: boolean;
  /**
   * Field height + type scale. Defaults to `'md'`.
   * - `xs` (20px / 11px) — dense filter rows, inline table edits.
   * - `sm` (24px / 12px) — toolbars, secondary forms.
   * - `md` (32px / 14px) — default form fields.
   * - `lg` (40px / 16px) — hero search, mobile-friendly forms.
   */
  size?: InputSize;
}
```

`Omit<…, 'size'>` is necessary because the native HTML `<input>` has its own `size` attribute (visible-character count) typed as `number`. Our string-union prop shadows it. The native attribute is rarely used and consumers who genuinely need it can pass `style={{ width: '…' }}` or wrap in a sized parent — matches what `<Input>` already documents about width.

**SCSS:** the existing base `.input` block keeps its non-size-dependent rules (border, color, transitions, placeholder). The hard-coded `height: var(--size-md)`, `padding: 0 var(--space-3)`, `font-size: var(--font-size-md)` move into a `.size-md` modifier. Add `.size-xs`, `.size-sm`, `.size-lg` siblings.

```scss
.size-xs {
  height: var(--size-xs);
  padding: 0 var(--space-2);
  font-size: var(--font-size-xs);
}
.size-sm {
  height: var(--size-sm);
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
}
.size-md {
  height: var(--size-md);
  padding: 0 var(--space-3);
  font-size: var(--font-size-md);
}
.size-lg {
  height: var(--size-lg);
  padding: 0 var(--space-3);
  font-size: var(--font-size-lg);
}
```

Component composes: `clsx(styles.input, styles[`size-${size}`], invalid && styles.invalid, className)`.

### `<Select>`

**TSX:** extend the existing union and update the JSDoc to list `xs`.

```ts
export type SelectSize = 'xs' | 'sm' | 'md' | 'lg';
```

**SCSS:** add a `.size-xs .trigger` block that mirrors the existing `.size-sm` / `.size-md` / `.size-lg` siblings already in `Select.module.scss`:

```scss
.size-xs .trigger {
  min-height: var(--size-xs);
  font-size: var(--font-size-xs);

  &:not(.triggerChips) {
    padding: 0 var(--space-2);
  }
}
```

Chip-bearing triggers (multi-select with `triggerDisplay='chips'`) at `xs` — the chips are already sized off `--size-chip` (18px) which doesn't fit inside a 20px row. Decision: `xs` + chips falls back to a higher effective height; the chip wrap rule (Y-padding `--space-1`) means the row will visually grow past 20px when a chip is present. Documented as "xs is for single-select Select; multi+chips at xs visually behaves like sm because the chip floor wins." We don't try to make 18px chips fit in 20px; that's a YAGNI fight.

### `<DatePicker>`

**TSX:**

```ts
export type DatePickerSize = 'xs' | 'sm' | 'md' | 'lg';

export interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'size'
> {
  // … existing props …
  /** Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`. */
  size?: DatePickerSize;
}
```

The popover content (month grid) is **not** affected by `size`. Cells stay `--size-datepicker-cell`; chevrons stay their existing size. Only the trigger row changes.

**SCSS:** add size modifier classes that target the wrapper, the inner input, AND the clear/open buttons:

```scss
.size-xs {
  padding: 0 var(--space-1);

  .input {
    height: var(--size-xs);
    font-size: var(--font-size-xs);
  }
  .clearButton,
  .openButton {
    width: 16px;
    height: 16px;
  }
}

.size-sm { /* 24px row, 20×20 buttons, sm font */ }
.size-md { /* 32px row, 20×20 buttons, md font — the current defaults */ }
.size-lg { /* 40px row, 24×24 buttons, lg font */ }
```

Component composes `clsx(styles.wrapper, styles[`size-${size}`], invalid && styles.invalid, disabled && styles.disabled, className)`.

**Lucide icon sizes**: the `<CalendarIcon />` and `<X />` inside the buttons receive `size={ICON_SIZE_FOR[size]}` where the lookup is `{ xs: 12, sm: 14, md: 14, lg: 16 }`.

### `<DateRangePicker>`

Same shape as DatePicker — `size` prop, SCSS modifiers, icon-size lookup. Popover (two month grids side-by-side) does NOT scale with the trigger size.

## Test surface

Each component picks up tests that mirror the existing `'applies the variant and size class names'` style.

- **Input**: new test `'applies size class names for xs / sm / md / lg'`. Also a regression test `'native size attr is omitted from rendered DOM'` to confirm the Omit works (i.e., passing `size="md"` does NOT propagate as the HTML `size` attribute, which would otherwise truncate visible character width).
- **Select**: extend the existing size test to include `xs` and assert the trigger gets `min-height: var(--size-xs)` via class application (not computed style).
- **DatePicker** + **DateRangePicker**: new tests `'applies size class names for xs / sm / md / lg'` and `'size xs scales the clear and open buttons'` (assert classnames; visual proof lives in the playground demo).

## Playground demos

Each of the four demos gains one new "Sizes" `<Example>` block showing all four variants in a `Stack gap="sm"`. The existing "Default" example continues to render at `md`. The Select demo's existing sizes example extends to include `xs` (4 items, not 3).

## AGENTS.md

Each component's section in `packages/design-system/AGENTS.md` is updated:

- The `<Input>` section grows a bullet listing the four sizes.
- The `<Select>` section already lists `sm | md | lg`; replace with `xs | sm | md | lg`.
- The `<DatePicker>` and `<DateRangePicker>` sections gain a "Sizes: xs / sm / md / lg (default md)" bullet.

## Risks / open questions

- **`xs` row height (20px) vs WCAG 2.5.5 Level AAA (24×24 minimum target size)**: same trade-off `Button size="xs"` already documented. This codebase is desktop-first; the `xs` JSDoc on each component lists the touch-target caveat verbatim.
- **DatePicker `xs` row + two-button slot (clear + open) + chevron-free input**: the two 16×16 buttons consume 32px of the row width. On narrow columns (e.g., a `<200px` filter dropdown) the typed-date placeholder ("01/02/2000" at 11px) is borderline. Accept it as a documented limitation; consumers picking `xs` on a narrow column should hide the clear button or use `<Select>` instead.
- **Select `xs` + multi-chips**: as noted, chip floor wins at 18px → the row visually grows past 20px. Documented, not fought.
- **Existing consumers**: no behavior change. Default `'md'` matches every current implicit hard-coded `--size-md`.
- **Spread-order discipline**: `Omit<…, 'size'>` is a hard requirement on Input and DatePicker / DateRangePicker. If anyone removes the Omit in a future refactor, the component's `size` prop silently propagates as the native HTML `size` attribute and breaks layouts. Spread comment in each file should call this out explicitly.

## Out of scope

- Inline calendar variants. They have no field row to size.
- Visual rhythm enforcement. Mixing sizes on one screen is the consumer's job.
- Token additions. The existing scale is sufficient.
- README components-table update (already pre-existing gap; not part of this change).
