# `<Radio>` — single radio button

```tsx
<Radio name="plan" value="pro" checked={plan === 'pro'} onChange={setPlan} label="Pro" />
```

- Native `<input type='radio'>` is visually hidden but stays in tab order + AT tree — browser arrow-key navigation between same-`name` radios works for free.
- `size`: `sm` (14px) / `md` (16px, default) / `lg` (20px). Same scale as `<Checkbox>` and `<Input>`.
- `value` (required) — the value submitted when this radio is selected.
- `checked` + `onChange(value, event)` for controlled standalone use; `defaultChecked` for uncontrolled standalone use.
- `label` (ReactNode) — text rendered next to the ring; the whole `<label>` is the click target. Omit + pass `aria-label` for icon-only.
- `invalid` — danger border + `aria-invalid='true'`. Hover preview is border-only and skips invalid (red stays red on hover).
- **Prefer `<RadioGroup>`** for proper fieldset/legend a11y and centralized state. Standalone `<Radio>` is for embedding a single radio next to other controls.
