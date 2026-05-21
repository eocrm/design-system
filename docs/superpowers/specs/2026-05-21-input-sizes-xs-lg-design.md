# Input field sizes — `sm` + `lg` across all field controls

**Date:** 2026-05-21
**Branch:** `feat/input-sizes-xs-lg` (branch name retained for continuity even though `xs` was dropped before implementation)
**Scope:** `Input`, `Select`, `DatePicker`, `DateRangePicker`. Inline calendar variants intentionally excluded (they're grids, not fields).

## Goal

Bring the four field-style components onto a consistent three-step size scale (`sm | md | lg`) matching what `<Select>` already uses. `md` stays the default — adding the prop introduces no behavior change for existing consumers.

## Why

- Dense CRM screens (toolbars, secondary forms) want a 24px-tall field that visually pairs with `Button size="sm"`.
- Marketing-style and mobile-friendly screens want a roomier 40px `lg` for hero search / primary form fields.
- Today's `Select` already exposes `sm | md | lg`. `Input`, `DatePicker`, `DateRangePicker` ship a single hard-coded 32px height. The asymmetry is the bug; aligning all four on the same union is the fix.
- `xs` (20px) was considered and explicitly dropped — the AA touch-target risk and the icon-clipping work on DatePicker/DRP outweigh its narrow density use case. If a future CRM screen genuinely needs 20px field rows, add `xs` as a follow-up extension of the same prop.

## Non-goals

- Inline calendar variants (`InlineDatePicker`, `InlineDateRangePicker`) — their density is a separate `cellSize`-style question and not coupled to field height.
- Future controls (`Textarea`, `Checkbox`, `Radio`, `Switch`) — they'll opt in when shipped.
- Auto-sized "responsive" fields. Consumer picks one size per field; no media-query magic.
- Library-wide token rename. The existing `--size-{sm,md,lg}` and `--font-size-{sm,md,lg}` tokens are reused as-is.
- An `xs` (20px) variant. Out of scope per the explicit dropdown above.

## The shared size scale

| Step | Height           | Font                  | Inline-button slot | Icon |
| ---- | ---------------- | --------------------- | ------------------ | ---- |
| `sm` | `--size-sm` 24px | `--font-size-sm` 12px | 20×20              | 14px |
| `md` | `--size-md` 32px | `--font-size-md` 14px | 20×20              | 14px |
| `lg` | `--size-lg` 40px | `--font-size-lg` 16px | 24×24              | 16px |

The inline-button slot column applies to DatePicker / DateRangePicker (clear ✕ + open-calendar buttons). `sm` and `md` deliberately share 20×20 — that's where the current 32px field already sits and there's no UX win in scaling each step independently when only two pixels separate them. At `lg` the slot bumps to 24×24 so the icon doesn't look orphaned next to a 16px font.

These three targets are CSS custom-property reuses, not new tokens. Nothing gets added to `tokens.scss`.

### Why these exact icon-slot dimensions at `lg`

At `lg` (40px row, padding `0 var(--space-3)` = 12px), 20×20 buttons read as too small relative to the row — 24×24 reads correctly. The slot sizes here are the result of paint-time intuition, not arbitrary scaling math; if a reviewer prefers different exact numbers, change them.

## Per-component changes

### `<Input>`

**TSX:**

```ts
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Toggles the error visual + sets `aria-invalid="true"`. */
  invalid?: boolean;
  /**
   * Field height + type scale. Defaults to `'md'`.
   * - `sm` (24px / 12px) — toolbars, secondary forms.
   * - `md` (32px / 14px) — default form fields.
   * - `lg` (40px / 16px) — hero search, mobile-friendly forms.
   */
  size?: InputSize;
}
```

`Omit<…, 'size'>` is necessary because the native HTML `<input>` has its own `size` attribute (visible-character count) typed as `number`. Our string-union prop shadows it. The native attribute is rarely used and consumers who genuinely need it can pass `style={{ width: '…' }}` or wrap in a sized parent — matches what `<Input>` already documents about width.

**SCSS:** the existing base `.input` block keeps its non-size-dependent rules (border, color, transitions, placeholder). The hard-coded `height: var(--size-md)`, `padding: 0 var(--space-3)`, `font-size: var(--font-size-md)` move into a `.size-md` modifier. Add `.size-sm` and `.size-lg` siblings.

```scss
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

**No code changes required.** Select already exposes `sm | md | lg` with the right SCSS modifiers and JSDoc. The unified scale described in this spec matches Select's existing API exactly. The Select section here exists only so the AGENTS.md sweep and the playground "Sizes" example sweep cover all four components consistently.

### `<DatePicker>`

**TSX:**

```ts
export type DatePickerSize = 'sm' | 'md' | 'lg';

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
.size-sm {
  /* 24px row, 20×20 buttons, sm font */
}
.size-md {
  /* 32px row, 20×20 buttons, md font — the current defaults */
}
.size-lg {
  /* 40px row, 24×24 buttons, lg font */
}
```

Component composes `clsx(styles.wrapper, styles[`size-${size}`], invalid && styles.invalid, disabled && styles.disabled, className)`.

**Lucide icon sizes**: the `<CalendarIcon />` and `<X />` inside the buttons receive `size={ICON_SIZE_FOR[size]}` where the lookup is `{ sm: 14, md: 14, lg: 16 }`.

### `<DateRangePicker>`

Same shape as DatePicker — `size` prop, SCSS modifiers, icon-size lookup. Popover (two month grids side-by-side) does NOT scale with the trigger size.

## Test surface

Each component picks up tests that mirror the existing `'applies the variant and size class names'` style.

- **Input**: new test `'applies size class names for sm / md / lg'`. Also a regression test `'native size attr is omitted from rendered DOM'` to confirm the Omit works (i.e., passing `size="md"` does NOT propagate as the HTML `size` attribute, which would otherwise truncate visible character width).
- **Select**: no new tests — the size scale is unchanged.
- **DatePicker** + **DateRangePicker**: new tests `'applies size class names for sm / md / lg'` and `'size lg scales the clear and open buttons'` (assert classnames; visual proof lives in the playground demo).

## Playground demos

The Input, DatePicker, and DateRangePicker demos each gain one new "Sizes" `<Example>` block showing all three variants in a `Stack gap="sm"`. The existing "Default" example continues to render at `md`. The Select demo's existing sizes example needs no changes.

## AGENTS.md

- The `<Input>` section gains a "Sizes: sm / md / lg (default md)" bullet.
- The `<Select>` section is unchanged (it already documents the three sizes).
- The `<DatePicker>` and `<DateRangePicker>` sections gain a "Sizes: sm / md / lg (default md)" bullet.

## Risks / open questions

- **Existing consumers**: no behavior change. Default `'md'` matches every current implicit hard-coded `--size-md`.
- **Spread-order discipline**: `Omit<…, 'size'>` is a hard requirement on Input and DatePicker / DateRangePicker. If anyone removes the Omit in a future refactor, the component's `size` prop silently propagates as the native HTML `size` attribute and breaks layouts. Spread comment in each file should call this out explicitly.
- **DatePicker / DRP `lg`**: scaling the inline clear / open buttons from 20×20 to 24×24 nudges the visual balance away from the existing `md` look. Consumers who mix `lg` and `md` fields on one screen should keep an eye on the vertical rhythm — but that's true of any size mix and not specific to this change.

## Out of scope

- Inline calendar variants. They have no field row to size.
- Visual rhythm enforcement. Mixing sizes on one screen is the consumer's job.
- Token additions. The existing scale is sufficient.
- README components-table update (already pre-existing gap; not part of this change).
