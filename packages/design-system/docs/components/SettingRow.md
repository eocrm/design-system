# `<SettingRow>` — one row of a settings screen

```tsx
<SettingRow.List dividers labelWidth="18rem">
  <SettingRow
    label="Seats"
    labelAdornment={
      <Badge tone="neutral" size="sm">
        From plan
      </Badge>
    }
    description="Member seats included for this tenant"
    controlWidth="xs"
    trailing={
      <Constrain width="xs">
        <Select options={modes} value={mode} onChange={setMode} />
      </Constrain>
    }
    footer={
      <Constrain maxWidth="sm">
        <Progress value={used} max={included} aria-label="Seats usage" />
      </Constrain>
    }
  >
    <Input type="number" />
  </SettingRow>
</SettingRow.List>
```

<!-- props:start -->

## Props

### `SettingRowProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `label` | `ReactNode` | yes | — | Label text. Renders a `<label htmlFor>` that names the control. Required — an empty or falsy value (e.g. `0`, `''`, `[]`, `<></>`) renders no `<label>` at all; see the anti-pattern below. |
| `labelAdornment` | `ReactNode` | no | — | Badges / chips on the label line, rendered as a SIBLING of the `<label>`. Deliberately outside it: label content becomes the control's accessible name, so a provenance badge placed inside makes the input announce "Seats From plan". |
| `description` | `ReactNode` | no | — | Helper text under the label, in the label column. Linked via `aria-describedby`. |
| `controlWidth` | `'auto' \| 'xs' \| 'sm' \| 'md'` | no | — | Width of the control only — `trailing` is not sized by it. Default `'auto'` — the control's intrinsic width. Every row using the same step gets the same control width (capped at the column, so a narrow container still shrinks it), which is what keeps controls aligned down a `<SettingRow.List>`. Intended for controls that stretch to `width: 100%` (`Input`, `Select`); a fixed-size control (`Switch`) does not grow — the slot just reserves the width. `trailing` stays on the control's line only while both fit: in a narrow column a wide step (`'md'`) plus `trailing` can wrap `trailing` onto a second line. Use a smaller step if that matters. |
| `trailing` | `ReactNode` | no | — | Content after the control on the same line — a mode select, a state badge, a reset button. `controlWidth` does NOT apply here — it only sizes the main control. A control that sizes itself to `width: 100%` (`Select`, `Input`, `Textarea`) fills the ENTIRE trailing group and pushes any other adornment onto a second line; wrap it in `<Constrain width="xs">` (or another named step) to size it instead. Plain truthiness check: an empty array or fragment still renders an empty wrapper (a stray gap) — pass `undefined` for "none". |
| `footer` | `ReactNode` | no | — | Block under the control column — a usage meter, a caveat, a preview. Fills the control column's full width; cap a meter with `<Constrain>` — safe here, `footer` is not the wired child. |
| `error` | `ReactNode` | no | — | Error message. Takes over `aria-describedby` and flips the control to `invalid`. Unlike `<Field>`, the `description` stays VISIBLE alongside it — the two sit in different columns, so an invalid value is no reason to remove the explanation of what the setting is. **Not announced, deliberately** — `aria-describedby` is read on focus, so the form owns the submit-time summary. Same reasoning as `<Field error>`. |
| `required` | `boolean` | no | — | Marks the row required: shows `*` and injects `required` onto the control. |
| `id` | `string` | no | — | Explicit control id. The row owns the id by default so the label always matches. |
| `children` | `ReactNode \| ((field: FieldRenderProps) => ReactNode)` | yes | — | A single control element (auto-wired) or a render-prop `(field) => ReactNode`. |
| …native | | | | plus native `<div>` attributes |

### `SettingRowListProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `labelWidth` | `string` | no | — | CSS length for the label column, shared by every row in the list (e.g. `'18rem'`, `'240px'`). Default `'16rem'` via the `--setting-row-label-width` token. A LENGTH, not `max-content` — rows align because they each resolve the same value, with no subgrid. |
| `dividers` | `boolean` | no | — | 1px border between rows. Default `false`, matching `<DefinitionList>`. |
| `spacing` | `'sm' \| 'md' \| 'lg'` | no | — | Vertical padding per row. Default `'md'`. |
| `collapseBelow` | `false \| 'sm' \| 'md' \| 'lg'` | no | — | Container width at or below which each row stacks its label column above its control column. `'sm'` 480px / `'md'` 640px / `'lg'` 768px, measured against the LIST's own box (a container query, like `<Grid>` and `<Split>`). Default `'sm'`. Pass `false` to opt out of containment entirely — e.g. inside a shrink-to-fit parent (a `width: max-content` flex item, an inline-block, a table cell), where `container-type: inline-size` would otherwise zero the List's intrinsic-width contribution. See the anti-pattern below. |
| `children` | `ReactNode` | yes | — | The rows. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Label (+ `labelAdornment`) and `description` in a shared LEFT column; control (+ `trailing`) and `footer` in the right. Wiring is `<Field>`'s — same `id` / `aria-labelledby` / `aria-describedby` / `invalid`, same render-prop `field` object.
- ❌ Don't wrap the control in `<Constrain>` to cap it, use `controlWidth` — `Constrain` becomes the element the row wires, silently stripping the control's `id` and `aria-*`.
- ❌ Mixing control sizes in one row — a `size="sm"` adornment beside a default-`md` control renders two different heights on the same line.
- `<SettingRow.List>` owns the shared label column (`labelWidth`, default `16rem`), `spacing` (`sm`/`md`/`lg`, default `md`), `dividers` (default `false`) and `collapseBelow` (`sm`/`md`/`lg`, default `'sm'` — a container query on the list's own box that stacks each row; pass `false` to opt out of containment entirely). **Collapse only works inside a List** — a standalone `<SettingRow>` never stacks at any width.
- ❌ A `SettingRow.List` inside a shrink-to-fit parent (a `width: max-content` flex item, an inline-block, a table cell) with the default `collapseBelow` — the List is a size container by default, so its intrinsic-width contribution is zero and it collapses. Pass `collapseBelow={false}` there.
- ❌ Read-only key/value → `<DefinitionList>`. ❌ An ordinary form field → `<Field>`. ❌ `margin` on a row to space rows → that is the List.

```tsx
// A plain setting — no adornments:
<SettingRow label="Default currency" description="Currency preselected for new records">
  <Select options={currencies} value={currency} onChange={setCurrency} />
</SettingRow>

// Render-prop for a wrapped or native control:
<SettingRow label="Webhook URL" error={errors.url}>
  {(field) => <input type="url" {...field} />}
</SettingRow>
```

**Alignment:** rows align because the label column is a length shared via `--setting-row-label-width`; set it once on `<SettingRow.List>` (`labelWidth`), never on individual rows.

**When NOT to use**

- A form field in a normal form: use `<Field>`; the shared label column is wrong for a two-up `<FormRow>`.
- A single self-labelling `<Checkbox>` / `<Switch>`: put it in a `<Cluster>`, or pass it as the row's control with the row's `label` as the only label (don't double-label).
- Grouping rows under a heading: use `<FormSection>`, which can wrap a `<SettingRow.List>`.

**Anti-patterns**

- A badge inside `label` instead of `labelAdornment`: it joins the control's accessible name.
- A bare `<Cluster justify="between">` or packed-left `<Cluster>` for a settings row: the first flings the control to the far edge of a wide card, the second leaves every row's control at a different x.
- A `<Stack>` of rows with ad-hoc `gap` instead of `<SettingRow.List>`: no shared label-column owner and no divider rhythm.
- Absent-value semantics: `label` / `error` / `description` treat `0`, `NaN`, `false`, `''`, an empty array and an empty fragment as ABSENT, so `description={remaining}` with `remaining === 0` or `error={errors.map(...)}` with no errors renders nothing (no `<label>`, no description, no error, no `invalid` flip). A labelless control falls back to its own `aria-label`, or is unnamed. A real but visually empty node (`label={<span />}`, `label="   "`) or an empty one-shot iterator (`Map.prototype.values()`, a generator) counts as present.
- An absent `label` also removes the `required` `*` marker (it lives inside the `<label>`): `<SettingRow label={0} required>` shows no `*`.
