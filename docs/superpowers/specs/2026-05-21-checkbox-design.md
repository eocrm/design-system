# Checkbox — design spec

**Date:** 2026-05-21
**Branch:** `feat/checkbox`
**Scope:** New `<Checkbox>` component. Standalone in v1. Will unblock DataTable row-selection (next PR).

## Goal

A native-input-backed checkbox with custom paint — full visual control, full a11y, supports indeterminate state, ergonomic label, form-integratable.

## Why now

DataTable v1 (next PR) needs row-selection checkboxes. The library's `CLAUDE.md` wishlist already flags Checkbox as missing. Shipping it standalone first means DataTable can compose it cleanly instead of inlining a one-off native input.

## Architecture

```tsx
<label>
  <input type="checkbox" class="visually-hidden" /> ← native input owns all a11y
  <span class="box" aria-hidden>
    {' '}
    ← custom-painted box
    {checked && <CheckIcon />}
    {indeterminate && <MinusIcon />}
  </span>
  {label && <span class="labelText">{label}</span>}
</label>
```

- Native `<input type="checkbox">` is visually hidden but stays in tab order and the AT tree — keyboard, screen reader, form submission, autofill, RHF/Zod integration all work for free.
- Custom `<span class="box">` paints the visible affordance.
- The `<label>` wraps everything; clicking the box, the icon, or the text all toggle the input via native label semantics.
- When no `label` prop is passed, only the box renders (still inside the `<label>` element — `aria-label` on the native input drives the accessible name).

## Public API

```ts
export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'checked' | 'defaultChecked'
> {
  /**
   * Box diameter + label type scale. Defaults to `'md'`. Same scale as
   * `<Input>` so a checkbox paired with a labelled input lines up.
   * - `'sm'` — 14px box, font-size-sm label. Dense tables, inline filters.
   * - `'md'` — 16px box, font-size-md label. Default.
   * - `'lg'` — 20px box, font-size-lg label. Hero forms, mobile-friendly.
   */
  size?: CheckboxSize;

  /**
   * Controlled checked state. Pair with `onChange`. Omit (with optional
   * `defaultChecked`) for uncontrolled use.
   */
  checked?: boolean;

  /** Initial checked state for uncontrolled use. Defaults to `false`. */
  defaultChecked?: boolean;

  /**
   * Indeterminate (mixed) visual + a11y state. Independent of `checked` —
   * an indeterminate checkbox is rendered with the muted dash icon and
   * `input.indeterminate = true` so AT announces "mixed". Consumer drives
   * this based on partial selection (e.g., "some of N items selected").
   * When the user clicks an indeterminate checkbox, the native event fires
   * with the next checked state (`true` from current `checked`); the
   * consumer typically responds by clearing indeterminate.
   */
  indeterminate?: boolean;

  /**
   * Optional label rendered next to the box. The whole `<label>` is the
   * click target. Omit for icon-only checkboxes (e.g., a DataTable row
   * selector) — pass `aria-label` instead.
   */
  label?: ReactNode;

  /** Toggles the error visual + sets `aria-invalid="true"`. */
  invalid?: boolean;

  /**
   * Fires on every change. Receives the next checked state AND the
   * native event so consumers can do `event.preventDefault()` etc.
   */
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}
```

Native `<input>` attributes pass through except `size` (shadowed by the component-level `size` prop, same Omit pattern as Input/DatePicker/DRP), `type` (hardcoded `"checkbox"`), and `checked` / `defaultChecked` (re-typed because our `onChange` signature differs from native).

## Visual / tokens

| Visual                               | Token                                                     |
| ------------------------------------ | --------------------------------------------------------- |
| Box size (sm)                        | `--size-checkbox-sm` (NEW: `14px`)                        |
| Box size (md)                        | `--size-checkbox-md` (NEW: `16px`)                        |
| Box size (lg)                        | `--size-checkbox-lg` (NEW: `20px`)                        |
| Check / dash icon size               | 10px (sm) / 12px (md) / 14px (lg), `<Icon size>` literals |
| Label font (sm)                      | `--font-size-sm`                                          |
| Label font (md)                      | `--font-size-md`                                          |
| Label font (lg)                      | `--font-size-lg`                                          |
| Box border (unchecked)               | `--color-border-strong`                                   |
| Box border (hover, unchecked)        | `--color-accent` — **border only**, no fill preview       |
| Box bg (checked / indeterminate)     | `--color-accent`                                          |
| Box border (checked / indeterminate) | `--color-accent`                                          |
| Check / dash icon color              | `--color-accent-fg` (white)                               |
| Box bg (disabled)                    | `--color-bg-subtle`                                       |
| Box border (disabled)                | `--color-border`                                          |
| Box border (invalid)                 | `--color-danger`                                          |
| Focus ring                           | `--ring-accent` (or `--ring-danger` when invalid)         |
| Label gap                            | `--space-2` (all sizes)                                   |
| Box radius                           | `--radius-sm`                                             |

Three new tokens: `--size-checkbox-sm: 14px`, `--size-checkbox-md: 16px`, `--size-checkbox-lg: 20px`. Slot near the other component-specific sizes (`--size-spinner`, `--size-chip`).

## States covered

- **Unchecked, enabled** — empty box with strong border.
- **Checked, enabled** — accent-filled box with white `Check` icon.
- **Indeterminate, enabled** — accent-filled box with white `Minus` icon. Visual takes priority over `checked` (an "indeterminate + checked" combo renders as indeterminate; `checked` is the value, indeterminate is the display).
- **Hover (any enabled)** — border shifts to `--color-accent`. Cursor pointer on the whole `<label>`.
- **Focus-visible** — accent ring around the box (or danger ring if invalid).
- **Disabled** — muted bg + border, cursor not-allowed, `aria-disabled` via native `disabled` attr.
- **Invalid** — danger-color border + danger focus ring. Sets `aria-invalid="true"`.

## A11y

- Native `<input type="checkbox">` handles role, tab order, keyboard (Space toggles), screen-reader announcement.
- `aria-checked` is set by the browser based on the input's `checked` state.
- Indeterminate handled via `input.indeterminate = true` (set in a `useEffect` on the ref since React doesn't expose it as a prop).
- Label is associated via `<label>` wrap — no `for`/`id` plumbing needed.
- For icon-only (no `label` prop), consumer passes `aria-label`. We don't auto-generate one because the visual provides no context.
- Invalid state sets `aria-invalid="true"` on the native input.
- Focus stays on the native input (visually-hidden but `position: absolute; opacity: 0` keeps it tab-focusable). The custom `.box` paints the focus ring via `:has(input:focus-visible)` on the box, OR via a sibling selector — see SCSS section.

## File layout

```
packages/design-system/src/components/Checkbox/
  Checkbox.tsx
  Checkbox.module.scss
  Checkbox.test.tsx
  index.ts
```

Top-level `src/index.ts` re-exports `Checkbox` + `CheckboxProps`.

## Implementation notes

### Indeterminate

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const mergedRef = mergeRefs(ref, inputRef);

useEffect(() => {
  if (inputRef.current) {
    inputRef.current.indeterminate = indeterminate ?? false;
  }
}, [indeterminate]);
```

Use the existing `mergeRefs` helper from `_internal/refs` (used by Tooltip).

### Visually-hidden native input

```scss
.input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Standard `.visually-hidden` recipe. The input is invisible but tab-focusable and click-targetable via the parent `<label>`.

### Focus ring on the box

Sibling selector — `.input:focus-visible + .box`:

```scss
.input:focus-visible + .box {
  box-shadow: 0 0 0 var(--ring-width) var(--ring-accent);
}
.input:focus-visible + .box.invalid {
  box-shadow: 0 0 0 var(--ring-width) var(--ring-danger);
}
```

### Controlled vs uncontrolled

Same pattern as `<Input>`: when `checked` is provided, controlled; otherwise uncontrolled with `defaultChecked`. Internal state uses `useState(defaultChecked ?? false)`.

The `onChange` callback signature is `(checked: boolean, event)` — first arg the next state for ergonomics. Standard React pattern for value-emitting components.

## Tests

- Renders unchecked by default.
- `defaultChecked` initializes uncontrolled state.
- `checked` (controlled) reflects in the DOM input.
- Clicking the label/box toggles checked.
- `onChange` fires with `(nextChecked, event)`.
- `indeterminate` sets `input.indeterminate` on the DOM node AND renders the dash icon.
- `disabled` propagates + blocks click.
- `invalid` sets `aria-invalid="true"` + adds the invalid class.
- `label` prop renders as text + the entire label is click-targetable.
- Without `label`, just the box renders (test by querying for the `.labelText` span — should be absent).
- `aria-label` (when no `label`) is the accessible name.
- `name` + `value` flow through (FormData round-trip).
- `ref` forwards to the native input element.
- `className` is merged on the outer `<label>`, not replaced.
- `size` applies the right class name (sm / md / lg) and defaults to `'md'`.
- Component-level `size` does NOT propagate to the DOM `size` attribute (Omit regression check, matches Input precedent).

## Playground demo

`CheckboxDemo.tsx` with examples:

1. **Default** — `<Checkbox label="I agree" />`
2. **Sizes** — three checkboxes (sm / md / lg) side by side with labels.
3. **Controlled** — checked + onChange with a debug echo.
4. **Indeterminate** — boolean state that flips: 0 selected → unchecked, all selected → checked, partial → indeterminate. Models the "select all" header pattern DataTable will use.
5. **Disabled** — `<Checkbox disabled label="Locked" defaultChecked />` and `<Checkbox disabled label="Locked, unchecked" />`.
6. **Invalid** — paired with `aria-describedby` and a visible error message.
7. **No label** — `<Checkbox aria-label="Select row" />`.
8. **Form integration** — `<Checkbox name="agree" required>` inside a form, log FormData on submit.

## AGENTS.md

Add a `<Checkbox>` section right after `<Input>` (Forms group). Document the API + the indeterminate-is-display-not-value semantic + the icon-only `aria-label` pattern.

## Non-goals

- **Checkbox groups / Fieldset wrapper**. Consumer wraps in `<fieldset>` themselves; we don't ship a `<Checkbox.Group>` yet.
- **Switch / Toggle**. Different component (single binary state with motion). Wishlist entry separate from Checkbox.
- **Tri-state value** — `indeterminate` here is a display flag, not a third boolean. If a use case for a real `'unchecked' | 'checked' | 'partial'` value union emerges, that's a separate prop.
- **Hover fill preview**. Hover only shifts the box border to accent — no fill preview of the eventual checked state. (Less aggressive than some DSes; aligns with Atlassian.)

## Risks / open questions

- **`<label>` wrap creates click target on the entire row** — if the consumer puts the checkbox in a wider flex container, the parent layout may absorb clicks the consumer didn't intend. Standard, well-understood; no mitigation needed.
- **Visually-hidden + focus ring on sibling** — works in all evergreen browsers; relies on `:focus-visible` + `+` adjacent-sibling combinator. Mature.
- **Indeterminate + click semantics** — when the user clicks an indeterminate checkbox, the native event fires with the input's CURRENT `checked` value flipped. If `checked` was `false` and `indeterminate` was `true`, click moves to `checked=true`. Consumer must respond by clearing `indeterminate` (typical "select all" UI: indeterminate → click → check all → indeterminate cleared).
