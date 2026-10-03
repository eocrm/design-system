# `<Radio>` — single radio button

```tsx
<Radio name="plan" value="pro" checked={plan === 'pro'} onChange={setPlan} label="Pro" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | yes | — | The value submitted when this radio is selected. |
| `size` | `RadioSize` | no | — | Ring diameter + label type scale. Defaults to `'md'`. - `'sm'` — 14px ring, font-size-sm label. - `'md'` — 16px ring, font-size-md label. - `'lg'` — 20px ring, font-size-lg label. Inside `<RadioGroup>`, the group's `size` becomes the default; explicit per-radio `size` still wins. |
| `checked` | `boolean` | no | — | Controlled checked state. Inside `<RadioGroup>`, leave this unset — the group computes `checked` from its `value`. If you explicitly set `checked` on a Radio inside a group, your prop wins and the group's controlled invariant breaks (don't do this). |
| `defaultChecked` | `boolean` | no | — | Initial checked state for uncontrolled standalone use. |
| `label` | `ReactNode` | no | — | Label rendered next to the ring. The whole `<label>` is the click target. Omit for icon-only radios + pass `aria-label`. |
| `invalid` | `boolean` | no | — | Toggles the error visual + `aria-invalid='true'`. Inside a `<RadioGroup>`, the group's `invalid` becomes the default for this radio — explicit per-child `invalid` (including `false`) still wins. |
| `onChange` | `((value: string, event: ChangeEvent<HTMLInputElement, Element>) => void)` | no | — | Fires when the radio is selected. Receives the radio's `value` AND the native event. Inside a group, this runs FIRST, then the group's `onChange` fires. |
| …native | | | | plus native `<input>` attributes |

<!-- props:end -->

- Native `<input type='radio'>` is visually hidden but stays in tab order + AT tree — browser arrow-key navigation between same-`name` radios works for free.
- **Prefer `<RadioGroup>`** for proper fieldset/legend a11y and centralized state. Standalone `<Radio>` is for embedding a single radio next to other controls.

Inside a group (preferred): `<RadioGroup name="size" defaultValue="md" label="T-shirt size"><Radio value="sm" label="Small" />…</RadioGroup>`.

**When NOT to use:** 10+ options — `<Select>`; multi-select — a set of `<Checkbox>`es; a single binary on/off — `<Switch>`.

**Anti-patterns**

- ❌ Standalone radios without a wrapping `<fieldset>` — fails AT grouping. Use `<RadioGroup>`.
- ❌ Setting `checked` on a Radio inside a `<RadioGroup>` — the group's `value` already controls each child's checked state.
- ❌ Omitting both `label` and `aria-label` — the radio is unlabelled to AT.
- Inside a group, a Radio's `onChange` runs first, then the group's `onChange`.
