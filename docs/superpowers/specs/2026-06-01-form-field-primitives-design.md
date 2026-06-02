# Form field primitives — `<Field>`, `<FormRow>`, `<FormSection>`

**Date:** 2026-06-01
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `@eocrm/design-system`

## Problem

The design system ships ~20 form **controls** (`Input`, `Select`, `Checkbox`, `Radio`,
`Switch`, `Textarea`, `DatePicker`, `Slider`, `FileUpload`, `PasswordInput`, …), all
deliberately "dumb" — `Input`'s own JSDoc states _"validation logic lives in your form
layer."_ What's missing is the unit **one level up**: the label + control + help + error +
required-marker pairing, with the `id ↔ htmlFor`, `aria-describedby`, and invalid wiring
done correctly by construction.

Today every mockup hand-rolls it. From `packages/playground/src/pages/mockups/Login/Login.tsx`,
repeated per field (~10 lines each):

```tsx
<Stack gap="xs">
  <Text as="label" htmlFor="login-email" weight="medium" size="sm">
    Email
  </Text>
  <Input
    id="login-email"
    invalid={!!emailError}
    aria-describedby={emailError ? 'login-email-error' : undefined}
  />
  {emailError && (
    <Text id="login-email-error" size="sm" tone="danger">
      {emailError}
    </Text>
  )}
</Stack>
```

This is verbose and easy to get wrong (mismatched ids, forgotten `aria-describedby`,
missing required marker). `DefinitionList` already exists as the **read-only** sibling of
this unit; `<Field>` is the **editable** sibling.

## Goals

- A `<Field>` wrapper that owns the label↔control↔message relationship and its a11y wiring.
- A thin `<FormRow>` for side-by-side fields and `<FormSection>` for titled groups.
- Zero changes required to the existing 20 controls (they already expose `invalid` →
  `aria-invalid`; verified across `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`,
  `RadioGroup`, `Switch`, `PasswordInput`, `DatePicker`, etc.).

## Non-goals (explicit)

- **No validation or form state.** No React Hook Form / Zod / Formik integration. That stays
  in the consumer's form layer — consistent with the repo philosophy.
- **No `<Form>` element wrapper.** A plain `<form onSubmit>` remains the consumer's; we are
  not owning submit/busy state. (Considered and dropped during brainstorm.)
- No new control types. These three primitives only _arrange and label_ existing controls.

## Components

### `<Field>` — the labeled-control unit

```tsx
<Field label="Work email" error={errors.email} required>
  <Input type="email" />
</Field>
```

**Props**

| prop                   | type                         | behavior                                                                    |
| ---------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `label`                | `ReactNode`                  | renders `<label htmlFor={id}>`; generates an `id` if the control has none   |
| `error`                | `ReactNode`                  | red message; sets `invalid` on the control; `aria-describedby` → message id |
| `description` / `help` | `ReactNode`                  | hint text; **error replaces it** when present (single message slot)         |
| `required`             | `boolean`                    | shows `*` marker; injects `required` onto the control                       |
| `optional`             | `boolean`                    | shows `(optional)` marker (mutually exclusive with `required`)              |
| `orientation`          | `'vertical' \| 'horizontal'` | default `'vertical'`; `'horizontal'` = label beside control (Settings rows) |
| `id`                   | `string`                     | optional explicit id override                                               |
| `size`                 | `'sm' \| 'md' \| 'lg'`       | label/message type scale, pairs with the control's `size`                   |

**Wiring contract.** Field computes a `field` object:

```ts
{ id: string; 'aria-describedby': string | undefined; invalid: boolean; required: boolean;
  'aria-invalid': boolean | undefined /* render-prop form only */ }
```

- **Auto-clone (common case):** a single valid element child is cloned with
  `{ id, 'aria-describedby', invalid, required }`. DS controls consume `invalid` directly
  (they map it to `aria-invalid` internally). A child's own explicitly-set prop wins over the
  injected one (consumer override beats Field default).
- **Render-prop (escape hatch):** `{(field) => <InputGroup><Input {...field} /></InputGroup>}`
  for wrapped/nested/native controls. The object additionally carries `aria-invalid` so a
  native `<input>` (no `invalid` prop) is still correct.

**Decision — invalid signal:** Field injects the DS `invalid` boolean (universal across the
control set), _not_ raw `aria-invalid`, so the control's red-border visual fires. The
render-prop variant adds `aria-invalid` for native targets.

**Groups (Radio / Checkbox sets).** A radio/checkbox _group_ has no single focusable target
for `htmlFor`. In group mode (`as="group"` or detected when wrapping `RadioGroup`), Field:

- renders the label as a `role="group"` caption (no `htmlFor`),
- wires the group via `aria-labelledby` (label id) + `aria-describedby` (message id),
- pairs with `RadioGroup`'s existing fieldset/`aria-invalid` handling.

A **single** `Checkbox` / `Switch` keeps its own inline `label` prop and is **not** wrapped in
`Field` (anti-pattern — documented).

**Message precedence (decision):** `error` replaces `description`/`help` — one message line,
not both. Matches the Login/Settings mockups.

**Marker convention (decision):** nothing shown by default; `*` only when `required` is set,
`(optional)` only when `optional` is set. (Marking optional instead of required is _available_
but opt-in, not the default.)

### `<FormRow>` — fields side by side

```tsx
<FormRow>
  <Field label="First name" required>
    <Input />
  </Field>
  <Field label="Last name" required>
    <Input />
  </Field>
</FormRow>
```

- **Implemented as a thin wrapper over `Grid`** so it cannot drift from the layout system.
  It is a member of the layout-primitive family (`Stack`/`Cluster`/`Grid`/`Constrain`) and is
  therefore permitted to own internal `gap`/`grid` — it owns no outer `margin`/`position`.
- **Default (responsive):** delegates to `Grid`'s `minColumnWidth` auto-fit
  (`repeat(auto-fit, minmax(<min>, 1fr))`) — fields sit side by side while they fit and reflow
  to stacked as the container narrows, **container-based, no media-query breakpoints** (the
  repo has none). FormRow picks a sensible default min field width (e.g. a `--measure-*` token).
- **Fixed mode:** `columns?: 2 | 3` maps to `Grid`'s fixed `columns` when the consumer wants an
  exact count that does not reflow. `columns` and the auto-fit default are mutually exclusive,
  mirroring `Grid`'s own `columns` vs `minColumnWidth` prop split.

### `<FormSection>` — titled group

```tsx
<FormSection title="Profile" description="Basic details that appear on the contact record.">
  <FormRow>…</FormRow>
  <Field …/>
</FormSection>
```

- `title` (heading) + `description` + a `Stack` of fields.
- Configurable heading level (`titleOrder?`, default `h2`/order 2) for document outline.
- Divider/spacing between consecutive sections via a `Divider` or `border-top` token — no
  outer margins.
- This is the repeating block in `packages/playground/src/pages/mockups/Settings/Settings.tsx`.

## Conventions / constraints (repo rules)

- **Tokens only** in all `.module.scss` — colors/spacing/radii from `tokens.scss`
  (label weight, message tone, gaps). No raw values.
- **Layout invariant:** `Field` owns only its internal label/control/message rhythm (via
  `Stack`/`gap`), no outer `margin`/`position`. `FormRow`/`FormSection` are layout primitives
  (the form analogue of `Grid`/`Stack`) and are allowed `gap`/`grid` but no outer margins.

## File structure

Each component follows the existing per-component folder convention:

```
packages/design-system/src/components/Field/
  Field.tsx  Field.module.scss  Field.test.tsx  index.ts
packages/design-system/src/components/FormRow/      (same shape)
packages/design-system/src/components/FormSection/  (same shape)
```

## Testing plan (characterization — `*.test.tsx` alongside each)

`<Field>`:

- label renders `<label htmlFor>` matching the control's `id` (generated and explicit).
- `aria-describedby` points at the help id; at the error id when `error` is set.
- `error` injects `invalid` onto the child and renders the message with danger tone.
- help is hidden when `error` is present (precedence).
- `required` shows `*` + injects `required`; `optional` shows `(optional)`.
- consumer-set child prop overrides the injected prop.
- render-prop path receives the full `field` object incl. `aria-invalid`.
- group mode: label is `role="group"` caption, no `htmlFor`; `aria-labelledby`/`-describedby`
  wired (assert against `RadioGroup`).
- horizontal orientation renders without changing the a11y wiring.

`<FormRow>`: renders N columns; collapses (assert the responsive class/grid template);
`columns` prop respected.

`<FormSection>`: renders title at the configured heading level + description; children stack.

## Definition of done (repo core invariant, ×3 components)

For **each** of `Field`, `FormRow`, `FormSection`:

1. `*.test.tsx` alongside the component.
2. Demo page at `packages/playground/src/pages/components/<Name>Demo.tsx` exercising the real
   component's states (per the "demos exercise the real component" rule).
3. Demo wired into **three** places:
   - `packages/playground/src/App.tsx` — import + `<Route path="/components/<kebab>" …>`.
   - `packages/playground/src/layout/AppShell/AppShell.tsx` — nav entry (`to`, `label`,
     lucide `icon`).
   - `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview grid entry.
4. Re-exported from `packages/design-system/src/index.ts` (component + prop/type exports).
5. JSDoc `@remarks` "when NOT to use / anti-patterns" on the component function **and** a
   one-section TL;DR in `packages/design-system/AGENTS.md`.

> Note: root `CLAUDE.md` lists the demo path as `pages/demo/<Name>Demo.tsx`; the actual
> convention in the repo is `pages/components/<Name>Demo.tsx` (+ `ComponentsIndex.tsx` as the
> overview grid). Following the real convention; the stale doc line can be fixed separately.

## Follow-ups (out of scope for the build, tracked)

- Refactor the hand-rolled fields in `Login.tsx` and `Settings.tsx` onto these primitives once
  shipped (the same "Mocked in → refactor when it ships" pattern as `components/TODO.md`).

## Build order

1. `<Field>` (the load-bearing piece + wiring + tests + demo + wiring + exports + docs).
2. `<FormSection>` (depends on nothing but reads naturally after Field).
3. `<FormRow>` (thin Grid wrapper).

Each is independently shippable under the core invariant; `Field` first.
