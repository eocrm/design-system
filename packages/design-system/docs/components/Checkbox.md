# `<Checkbox>` — checkbox with native input + custom paint

```tsx
<Checkbox label="I agree" />
<Checkbox checked={agreed} onChange={setAgreed} label="Subscribe" />
<Checkbox indeterminate checked={allSelected} onChange={selectAll} aria-label="Select all" />

// "Select all" pattern
<Checkbox
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  onChange={(next) => (next ? selectAll() : selectNone())}
  aria-label="Select all rows"
/>

// Icon-only (no visible label)
<Checkbox aria-label="Select row" checked={isSelected} onChange={setIsSelected} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | no | Box diameter + label type scale. Defaults to `'md'`. - `'sm'` — 14px box, font-size-sm label. Dense tables, inline filters. - `'md'` — 16px box, font-size-md label. Default. - `'lg'` — 20px box, font-size-lg label. Hero forms, mobile-friendly. Note: shadows the native HTML `<input size>` attribute (which on checkboxes is meaningless anyway). |
| `checked` | `boolean` | no | Controlled checked state. Pair with `onChange`. Omit (with optional `defaultChecked`) for uncontrolled use. |
| `defaultChecked` | `boolean` | no | Initial checked state for uncontrolled use. Defaults to `false`. |
| `indeterminate` | `boolean` | no | Indeterminate (mixed) visual + a11y state. Independent of `checked` — the box paints with a dash icon and `input.indeterminate = true` so AT announces "mixed". Consumer drives this based on partial selection (e.g., a "select all" header where some-but-not-all rows are selected). When the user clicks an indeterminate checkbox, the native change event fires with the next `checked` value (`true` if it was `false`). The consumer typically responds by clearing `indeterminate`. |
| `label` | `ReactNode` | no | Optional label rendered next to the box. The whole `<label>` is the click target. Omit for icon-only checkboxes (e.g., a DataTable row selector) — pass `aria-label` instead. |
| `invalid` | `boolean` | no | Toggles the error visual + sets `aria-invalid="true"`. Pair with a visible error message and `aria-describedby`. |
| `color` | `PaletteColor` | no | Optional palette color for the checked / indeterminate fill. When set, the filled state uses the palette color's fg token instead of `--color-accent`. Use to color-tag checkbox groups (per-team, per-status, per-category). Default unchanged (accent blue). The focus ring, hover border, and unchecked state remain accent-colored regardless of `color` — only the checked / indeterminate fill is affected. |
| `onChange` | `((checked: boolean, event: ChangeEvent<HTMLInputElement, Element>) => void)` | no | Fires on every change. Receives the next checked state AND the native event so consumers can do `event.preventDefault()`, read modifier keys, etc. |
| …native | | | plus native `<input>` attributes |

<!-- props:end -->

- Native `<input type='checkbox'>` is visually hidden but stays in tab order + AT tree — keyboard, screen reader, form submission, RHF/Zod, autofill all work for free.
- Native HTML attrs flow through (`name`, `value`, `required`, `form`, `autoFocus`, etc.). `FormData.getAll(name)` returns the array of checked values for same-`name` checkboxes.
- forwardRef points at the native `<input>` so consumers can `.focus()` or programmatically set `.indeterminate`.

- The native input owns all a11y (keyboard, screen reader, form submission); the custom paint owns the look. States: checked / unchecked / indeterminate / disabled / invalid.

#### When NOT to use

- ❌ A single binary on/off setting that applies immediately → `Switch`.
- ❌ One-of-many choice from a fixed set → `Radio`.
- ❌ Multi-select from a long list → `<Select multi>`.

#### Anti-patterns

- ❌ Treating `indeterminate` as a third value. It is a display flag; `checked` is still the underlying boolean.
- ❌ Wrapping the checkbox in your own `<label>`. It is already wrapped; an outer `<label>` nests two and breaks the click contract.
- ❌ Omitting `label` AND `aria-label`. Screen readers announce just "checkbox" with no context.
