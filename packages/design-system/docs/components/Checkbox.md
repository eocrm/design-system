# `<Checkbox>` — checkbox with native input + custom paint

```tsx
<Checkbox label="I agree" />
<Checkbox checked={agreed} onChange={setAgreed} label="Subscribe" />
<Checkbox indeterminate checked={allSelected} onChange={selectAll} aria-label="Select all" />
```

- Native `<input type='checkbox'>` is visually hidden but stays in tab order + AT tree — keyboard, screen reader, form submission, RHF/Zod, autofill all work for free.
- `size`: `sm` (14px) / `md` (16px, default) / `lg` (20px). Same scale as `<Input>`.
- `checked` + `onChange(next, event)` for controlled; `defaultChecked` for uncontrolled.
- `indeterminate` is a **display flag, not a third value**. Pairs with `checked` for the "select all where some-but-not-all are picked" pattern. Clicking an indeterminate checkbox emits `onChange(nextChecked)` based on the current `checked`; consumer typically clears `indeterminate` in response.
- `label` (ReactNode) renders next to the box; the whole `<label>` is the click target. Omit `label` for icon-only checkboxes (e.g., DataTable row selectors) and pass `aria-label` instead.
- `invalid` adds the danger border + sets `aria-invalid='true'`. Pair with a visible error + `aria-describedby`. Hover preview is border-only (no fill tint).
- Native HTML attrs flow through (`name`, `value`, `required`, `form`, `autoFocus`, etc.). `FormData.getAll(name)` returns the array of checked values for same-`name` checkboxes.
- forwardRef points at the native `<input>` so consumers can `.focus()` or programmatically set `.indeterminate`.
