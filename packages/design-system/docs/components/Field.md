# `<Field>` — labeled-control unit

```tsx
<Field label="Work email" error={errors.email} required>
  <Input type="email" />
</Field>

// wrapped / native control → render-prop, spread `field`:
<Field label="Email" error={errors.email}>
  {(field) => <input type="email" {...field} />}
</Field>
```

<!-- props:start -->

## Props

### `FieldProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `label` | `ReactNode` | no | — | Label text. Renders a `<label htmlFor>` (or, in `asGroup`, a `role="group"` caption). An empty or falsy value (e.g. `0`, `''`, `[]`, `<></>`) renders no label at all; see the anti-pattern below. |
| `description` | `ReactNode` | no | — | Helper text below the control. Hidden while `error` is present. |
| `error` | `ReactNode` | no | — | Error message. Replaces `description`, flips the control to `invalid`, and links it with `aria-describedby`. **Not announced, deliberately.** `aria-describedby` is read on FOCUS, so an error that appears after a submit reaches nobody unless focus moves into the field. Hard rule 10 permits chosen silence provided it is written down; this is that note. The alternative — a live region per Field — is worse in the common case: a validate-on-change form would announce on every keystroke, and a submit failing N fields would fire N announcements over each other. The right owner of that announcement is the FORM, which knows how many fields failed and when the user asked for the answer. So: announce a summary yourself on submit, and leave the per-field message to `aria-describedby` for when focus arrives. ```tsx <div role="status" aria-live="polite"> {submitted && errorCount > 0 ? `${errorCount} fields need attention` : ''} </div> ``` |
| `required` | `boolean` | no | — | Marks the field required: shows `*` and injects `required` onto the control. |
| `optional` | `boolean` | no | — | Marks the field optional: shows `(optional)`. Mutually exclusive with `required`. |
| `orientation` | `'vertical' \| 'horizontal'` | no | — | Label placement. Default `'vertical'`. `'horizontal'` puts the label beside the control. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | — | Label/message type scale. Default `'md'`. Size primarily scales the label; the help/error message uses a compact fixed scale (`md` and `lg` both render the message at `sm`). |
| `id` | `string` | no | — | Explicit control id. Field owns the id by default (auto-generated) so the label always matches. |
| `asGroup` | `boolean` | no | — | Group mode for radio/checkbox sets: label becomes a `role="group"` caption (no `htmlFor`). |
| `children` | `FieldChild` | yes | — | A single control element (auto-wired) or a render-prop `(field) => ReactNode`. |
| …native | | | | plus native `<div>` attributes |

### `FieldRenderProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | yes | — |  |
| `aria-describedby` | `string \| undefined` | yes | — |  |
| `aria-labelledby` | `string \| undefined` | yes | — | Id of the label element to name the control — set only when a label is rendered. |
| `aria-invalid` | `boolean \| undefined` | yes | — |  |
| `invalid` | `boolean` | yes | — |  |
| `required` | `boolean` | yes | — |  |
| `labelId` | `string` | yes | — | Id of the label/caption element — for manual `aria-labelledby` wiring. |

<!-- props:end -->

- Wraps ONE control with its label + help/error + required marker, and auto-wires
  `id` / `aria-labelledby` / `aria-describedby` / `invalid` (controls map `invalid → aria-invalid`).
- When a `label` is present, Field injects `aria-labelledby` onto the cloned child, so
  composite controls that forward ARIA props (`Select`, `Slider`, `ColorPicker`,
  `IconPicker`, `FileUpload`, `TimeField`) get an accessible name for free. The render-prop `field`
  object also carries `aria-labelledby` for wrapped/nested DOM.
  `optional` shows `(optional)`. `orientation="horizontal"` = label beside control.
- Field owns the control `id` — to set one, use `<Field id>`, not the control.
- Groups: `<Field asGroup>` around `<RadioGroup>` → label becomes a `role="group"` caption.
- ❌ Don't wrap a single `<Checkbox>`/`<Switch>` (they self-label). ❌ No validation/state — pass `error` from your form layer.

```tsx
// Radio/checkbox group — label becomes a role="group" caption
<Field asGroup label="Notify me" error={errors.notify}>
  <RadioGroup name="notify">
    <Radio value="all" label="All activity" />
    <Radio value="mentions" label="Only mentions" />
  </RadioGroup>
</Field>
```

#### When NOT to use

- A single `<Checkbox>` / `<Switch>` — they carry their own inline `label`; use the control's `label` prop instead of double-labeling.
- Read-only key/value display — use `<DefinitionList>`.
- Arranging multiple fields — that is `<FormRow>` / `<FormSection>` / `<Stack>`.

#### Anti-patterns

- ❌ Auto-wiring a raw native `<input>` and expecting `aria-invalid`: auto-clone injects the DS `invalid` prop. For a native element use the render-prop and spread `field` (it includes `aria-invalid`).
- ❌ Passing both `required` and `optional`.
- ⚠️ `label` / `description` / `error` treat `0`, `NaN`, `false`, `''`, an empty array and an empty fragment (`<></>`) as ABSENT. `error={errors.map(...)}` with no errors, `label={<></>}` or `description={[]}` render nothing — no `<label>`, no description, no error text, no `invalid` flip — so the control falls back to its own `aria-label` or ends up unnamed. A real but visually empty node (`label={<span />}`, `label="   "`) or an empty one-shot iterator (`Map.prototype.values()`, a generator) still counts as present. Pass `undefined` explicitly for "none" rather than a container that might be empty.
- ⚠️ An absent `label` also removes the `required` / `optional` marker, since both live inside the `<label>`: `<Field label={0} required>` shows no `*`.
