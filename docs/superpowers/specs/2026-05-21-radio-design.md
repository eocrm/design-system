# Radio + RadioGroup — design spec

**Date:** 2026-05-21
**Branch:** `feat/radio`
**Scope:** Two new components — `<Radio>` (single button) and `<RadioGroup>` (group wrapper with `<fieldset>/<legend>` semantics, context-driven state).

## Goal

A native-input-backed radio with custom paint, plus a group wrapper that handles the common case (one-of-many selection with a label, controlled or uncontrolled). Same visual + a11y discipline as `<Checkbox>` — native input visually hidden, painted ring + dot.

## Why ship both

Radios are inherently a group concept — a single radio in isolation has no semantic meaning (you need at least two for "one of these"). Native HTML expresses the group through a shared `name` attribute + arrow-key navigation; getting full a11y also requires wrapping the group in `<fieldset><legend>`. Forcing consumers to plumb `name` + manage state across siblings + write the fieldset themselves is the wrong default.

The `<Radio>` primitive is still useful standalone (e.g., a single radio embedded inside a row of mixed controls). `<RadioGroup>` handles the common case of "render a list of mutually-exclusive options."

## Architecture

Two components, one folder. RadioGroup propagates state via a small context (`RadioGroupContext`); individual `<Radio>` reads context and falls back to its own props if outside a group. Pattern matches `<Avatar>` + `<AvatarGroup>` precedent.

### `<Radio>` shape

```tsx
<label class="radio size-md">
  <input type="radio" class="visually-hidden" /> ← native input owns all a11y
  <span class="ring" aria-hidden>
    {' '}
    ← painted outer ring
    <span class="dot" /> ← inner dot (only when checked)
  </span>
  {label && <span class="labelText">{label}</span>}
</label>
```

- Native `<input type='radio'>` visually hidden but stays in tab order + AT tree — keyboard, screen reader, browser arrow-key navigation between radios sharing a `name`, form submission all work for free.
- Custom `<span class="ring">` paints the visible circle; nested `<span class="dot">` paints the inner dot only when checked.
- `<label>` wraps everything; clicking the ring, the dot, or the text all toggle via native label semantics.

### `<RadioGroup>` shape

```tsx
<fieldset class="radioGroup orientation-vertical">
  {label && <legend>{label}</legend>}
  <RadioGroupContext.Provider value={{ name, value, onChange, size, disabled, invalid, required }}>
    {children}
  </RadioGroupContext.Provider>
</fieldset>
```

- `<fieldset>` + `<legend>` is the standard a11y semantics for a group of related form controls.
- Context provides defaults to descendant `<Radio>` children. Each child computes `checked = group.value === child.value`.

## Public API

### `Radio`

```ts
export type RadioSize = 'sm' | 'md' | 'lg';

export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'checked' | 'defaultChecked' | 'onChange'
> {
  /** The value submitted when this radio is selected. */
  value: string;

  /**
   * Box diameter + label type scale. Same scale as `<Checkbox>` (and `<Input>`).
   * Defaults to `'md'`. Inside a `<RadioGroup>`, the group's `size` overrides.
   */
  size?: RadioSize;

  /**
   * Controlled checked state. Inside `<RadioGroup>`, this is computed from
   * the group's `value` and shouldn't be set per-child.
   */
  checked?: boolean;

  /** Initial checked state for uncontrolled standalone use. */
  defaultChecked?: boolean;

  /**
   * Optional label rendered next to the ring. The whole `<label>` is the
   * click target. Omit for icon-only radios + pass `aria-label`.
   */
  label?: ReactNode;

  /** Toggles the error visual + `aria-invalid='true'`. Group's `invalid` overrides. */
  invalid?: boolean;

  /**
   * Fires when the radio is selected (`onChange(value, event)`). Inside a
   * group, the group's `onChange` is called by the wrapping context — the
   * per-radio handler still runs first if set.
   */
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
}
```

`Omit` drops `size`, `type`, `checked`, `defaultChecked`, `onChange` — same precedent as `<Checkbox>`.

### `RadioGroup`

```ts
export type RadioGroupOrientation = 'vertical' | 'horizontal';

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  /** Form `name` shared by all radio children. Required for form submission. */
  name: string;

  /** Controlled selected value. Pair with `onChange`. */
  value?: string;

  /** Initial selected value for uncontrolled use. */
  defaultValue?: string;

  /**
   * Fires when the user selects a different radio. Receives the new value
   * AND the native event.
   */
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;

  /** Optional group label rendered as `<legend>`. */
  label?: ReactNode;

  /** Default `size` for child radios. Per-child `size` still wins. Defaults to `'md'`. */
  size?: RadioSize;

  /** Layout direction. `'vertical'` (default — `Stack`) / `'horizontal'` (`Cluster`-like). */
  orientation?: RadioGroupOrientation;

  /** Disable all radios in the group. Per-child `disabled` still wins. */
  disabled?: boolean;

  /** Apply the invalid visual to all radios + set `aria-invalid` on the fieldset. */
  invalid?: boolean;

  /** Mark all radios as required (HTML form validation). */
  required?: boolean;

  children: ReactNode;
}
```

## Visual / tokens

Three new tokens, aliased over `--size-checkbox-*` so radio + checkbox visually line up next to each other:

```scss
--size-radio-sm: var(--size-checkbox-sm); // 14px
--size-radio-md: var(--size-checkbox-md); // 16px
--size-radio-lg: var(--size-checkbox-lg); // 20px
```

| Visual                             | Token                                     |
| ---------------------------------- | ----------------------------------------- |
| Ring diameter (sm / md / lg)       | `--size-radio-{sm,md,lg}`                 |
| Dot diameter                       | ~40% of ring (calc(...) inline; or token) |
| Ring border (unchecked)            | `--color-border-strong`                   |
| Ring border (hover, unchecked)     | `--color-accent` — **border only**        |
| Ring border (checked)              | `--color-accent`                          |
| Ring background (always)           | `--color-bg`                              |
| Dot color (checked)                | `--color-accent`                          |
| Ring background (disabled)         | `--color-bg-subtle`                       |
| Ring border (disabled)             | `--color-border`                          |
| Dot color (disabled)               | `--color-fg-disabled`                     |
| Ring border (invalid)              | `--color-danger`                          |
| Dot color (invalid)                | `--color-danger`                          |
| Focus ring                         | `--ring-accent` (or `--ring-danger`)      |
| Label gap                          | `--space-2` (all sizes)                   |
| Group `<legend>` font              | `--font-size-md` semibold                 |
| Group orientation gap (vertical)   | `--space-2`                               |
| Group orientation gap (horizontal) | `--space-4`                               |

Three new tokens. No raw values in component SCSS.

## States

- **Unchecked / enabled** — empty ring, strong border.
- **Checked / enabled** — accent border + filled inner accent dot.
- **Hover / unchecked** — border-only shift to accent (matches Checkbox restraint).
- **Focus-visible** — accent ring shadow around the ring.
- **Disabled** — muted bg + border, cursor not-allowed.
- **Invalid** — danger border + danger dot (when checked) + danger focus ring.

Distinct from Checkbox: there's no indeterminate state. Radios are always one-of-many.

## A11y

- Native `<input type='radio'>` provides role, tab order, keyboard (Space toggles), arrow-key navigation between radios sharing a `name`, and form submission.
- Inside `<RadioGroup>`, the `<fieldset>` + `<legend>` semantics group the radios for AT (single label announced for the whole group).
- `aria-invalid` set on the fieldset when group `invalid={true}`; also on each radio's native input.
- For standalone single radios without a group, consumer must pass `aria-label` when no `label` prop is given.
- `required` on each radio (native) means the form won't submit until one in the group is checked.

## File layout

```
packages/design-system/src/components/Radio/
  Radio.tsx
  Radio.module.scss
  Radio.test.tsx
  RadioGroup.tsx
  RadioGroup.module.scss
  RadioGroup.test.tsx
  RadioGroupContext.tsx
  index.ts
```

Top-level `src/index.ts` re-exports `Radio`, `RadioGroup`, `RadioProps`, `RadioGroupProps`, `RadioSize`, `RadioGroupOrientation`.

## Behavior notes

### Controlled vs uncontrolled

- **Standalone `<Radio>`**: same pattern as Checkbox. `checked` / `onChange` for controlled; `defaultChecked` for uncontrolled.
- **`<RadioGroup>`**: group-level controlled via `value` / `onChange`; uncontrolled via `defaultValue`. Internal `useState(defaultValue)` tracks selected value when uncontrolled.

### Child-radio props inside RadioGroup

When a `<Radio>` renders inside `<RadioGroup>`:

- `name` ← group's `name` (consumer doesn't set per-radio).
- `checked` ← `group.value === radio.value`.
- `onChange` ← composes: per-radio `onChange?.(value, event)` runs first, then group's `onChange?.(value, event)`.
- `size`, `disabled`, `invalid`, `required` ← group default if per-radio prop unset.

If a `<Radio>` is rendered standalone (no group), all those props come from its own props directly.

### Layout

- `<RadioGroup orientation="vertical">` (default) — `display: flex; flex-direction: column; gap: --space-2;`.
- `<RadioGroup orientation="horizontal">` — `display: flex; flex-direction: row; gap: --space-4; flex-wrap: wrap;`.

The `<fieldset>` itself has default browser borders/padding — we reset those (`border: 0; padding: 0; margin: 0; min-width: 0;`) to behave like a clean container.

## Tests

### `Radio.test.tsx`

- Renders unchecked by default.
- `defaultChecked` initializes uncontrolled state.
- `checked` (controlled) reflects in the DOM input.
- Clicking label/ring fires `onChange(value, event)` with the correct args.
- `disabled` propagates + blocks click (including label-text click).
- `invalid` sets `aria-invalid='true'` + adds the invalid class.
- `label` prop renders next to the ring; without `label`, just the ring.
- `aria-label` (when no `label`) is the accessible name.
- `size` applies sm/md/lg class names; defaults to `'md'`.
- Component-level `size` does NOT propagate to the DOM `size` attribute (Omit regression check).
- `ref` forwards to the native input.
- `className` is merged on the outer `<label>`, not replaced.

### `RadioGroup.test.tsx`

- Renders a `<fieldset>` with optional `<legend>` when `label` is set.
- `name` propagates to children via context (assert via DOM `input[name]`).
- `value` (controlled) marks the matching child as `checked`.
- `defaultValue` initializes uncontrolled.
- `onChange(value, event)` fires with the new value when the user clicks a child.
- Per-child `onChange` (when set) fires BEFORE group `onChange`.
- `size` propagates as the default (per-child explicit wins).
- `disabled` disables all children (per-child explicit `disabled={false}` still wins).
- `invalid` applies the invalid class to all children + sets `aria-invalid` on fieldset.
- `orientation` applies the right class.
- `forwardRef` to the `<fieldset>`.
- `className` merge.

## Playground demo

`RadioDemo.tsx`:

1. **Default — standalone Radios** sharing a `name` (no group).
2. **Sizes** — sm/md/lg in a Stack.
3. **RadioGroup with label** — `<RadioGroup name="size" label="T-shirt size" defaultValue="md">` with 3 child Radios.
4. **Controlled RadioGroup** — value + onChange echoed to a debug `<code>`.
5. **Horizontal orientation** — same group, `orientation="horizontal"`.
6. **Disabled** — group-disabled + per-child disabled mixed.
7. **Invalid** — group-invalid with an error message below.
8. **Form integration** — RadioGroup inside a form; `FormData.get(name)` returns the selected value on submit.

## AGENTS.md

Add `<Radio>` + `<RadioGroup>` sections right after `<Checkbox>`.

## Non-goals

- **Card-style radio** (each option in a styled box) — separate component or modifier in a future PR.
- **Searchable / virtualized radio list** — use `<Select>` for 10+ options.
- **Indeterminate state** — radios don't have one (the API would be nonsensical).
- **Multi-row RadioGroup with custom layout** — consumer uses standalone `<Radio>` siblings if they need anything beyond `vertical | horizontal`.

## Risks / open questions

- **Standalone Radio without a group** — works (`name` + `value` + `checked`/`onChange` consumer-driven), but the consumer also needs the proper `<fieldset>` themselves for AT. Documented in JSDoc; not enforced.
- **`required` + uncontrolled RadioGroup** — `defaultValue` + `required` works; if `defaultValue` is unset and `required` is true, form submission fails until the user picks one (native browser validation). No special handling needed.
- **Per-radio `checked` overriding group state** — if a consumer explicitly sets `checked` on a `<Radio>` inside `<RadioGroup>`, their prop wins (per Avatar/AvatarGroup precedent). This breaks the group's controlled invariant but is consistent with our composition pattern. Document as "don't do this."
- **Same `value` on two radios in one group** — that's the consumer's bug (clicking either would emit the same `onChange`). We don't validate this in dev mode for v1; can add a `console.warn` later.
