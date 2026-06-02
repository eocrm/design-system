# `<Field>` names composite controls (accessible-name fix)

**Date:** 2026-06-02
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `@eocrm/design-system`

## Problem

`<Field label="X"><Select/></Field>` gives the Select's combobox **no accessible name**. Field associates its label purely via a native `<label htmlFor={controlId}>` and auto-clones `id={controlId}` onto the child's root element. That works only when the child's root **is** the focusable, labelable element (native `<input>`). For composite controls the injected `id` lands on a wrapper `<div>` while the real focusable trigger keeps its own internal id, so `<label htmlFor>` points at a non-labelable wrapper and the control is announced unnamed.

Discovered during the custom-fields mockup review (worked around there with Field's render-prop). The **already-merged member-profile** mockup has the same latent gap (Field + Select for timezone/language/role).

**Scope audit (focusable element vs. the id-receiving element):**

- **Fine** (id reaches the real `<input>`, `htmlFor` works): `Input`, `Textarea`, `Checkbox`, `Radio`, `Switch`, `PasswordInput`, `DatePicker`, `DateRangePicker`. No change.
- **Affected** (focusable trigger ≠ id-receiving root): `Select`, `Slider`, `ColorPicker`, `FileUpload`, `TimeField`.
- **Excluded:** `OptionsPicker` (documented "not a form field — use Select"), `RadioGroup` (uses Field `asGroup`).

## Approach (chosen)

### Core: Field also conveys `aria-labelledby`

`<Field>` already computes a stable `labelId = ${controlId}-label` and renders `<label id={labelId} htmlFor={controlId}>`. The fix: Field's **auto-clone** (non-`asGroup`) and its **render-prop `field` object** also carry `aria-labelledby={labelId}` — guarded so the child's own value wins and it's only set when a label is rendered:

- Auto-clone `injected` (non-group) gains: `...(label != null ? { 'aria-labelledby': childProps['aria-labelledby'] ?? labelId } : {})`.
- `FieldRenderProps` gains `'aria-labelledby': string | undefined` (= `label != null ? labelId : undefined`), so `{...field}` conveys it too.
- `id` injection stays (native controls still name via `htmlFor`); `asGroup` is unchanged (group naming already lives on the `role="group"` wrapper).

**Why it's safe:** the `*` marker is `aria-hidden` and `(optional)` is already inside the label text, so `aria-labelledby={labelId}` resolves to the _same_ accessible name `htmlFor` already produces — no double-announce, no name change for native controls (belt-and-suspenders). `Select` and `Slider` already forward `aria-labelledby` to their focusable element, so they get named **with no control changes**.

### Per-control forwarding (the remaining composites)

Each must forward `aria-labelledby` (read from props) onto its **focusable** element:

- **`ColorPicker`** — forward `aria-labelledby` (and `aria-describedby`) onto the trigger `<button>` (DefaultTrigger), not the root wrapper.
- **`FileUpload`** — forward `aria-labelledby` (and `aria-describedby`) onto the `role="button"` dropzone element, not the root wrapper.
- **`TimeField`** — relax its **required** `aria-label` to **optional**, accept `aria-labelledby`, and forward it onto the time `<input>`. Backward-compatible: existing callers (e.g. DatePicker embedding TimeField) keep passing `aria-label`; when `aria-labelledby` is present it provides the name (ARIA precedence) so a `<Field>` label wins.

`Select` and `Slider` need **no change** (already forward `aria-labelledby`).

## Components changed

- **`Field`** (core: inject/expose `aria-labelledby`) — `Field.tsx`, `FieldRenderProps`, JSDoc, tests.
- **`ColorPicker`** — forward `aria-labelledby`/`aria-describedby` to the trigger; tests.
- **`FileUpload`** — forward `aria-labelledby`/`aria-describedby` to the dropzone; tests.
- **`TimeField`** — `aria-label` optional + accept/forward `aria-labelledby`; tests.
- **`Select`, `Slider`** — unchanged; add a regression test each proving `<Field label>` names them.

## Testing (the acceptance criteria)

For each affected control, a test that `<Field label="Type"><Control/></Field>` exposes the accessible name on the focusable element (`getByRole('combobox' | 'slider' | 'button', { name: 'Type' })` or assert `aria-labelledby` on the focusable node resolves to the label):

- **Field unit:** auto-clone injects `aria-labelledby={labelId}` when a label exists; not when label is absent; child's explicit `aria-labelledby` wins; `field` render-prop object includes `aria-labelledby`; existing id/aria-describedby/invalid/required behavior unchanged.
- **Select / Slider:** `<Field label>` → named focusable (regression lock; no control change).
- **ColorPicker / FileUpload:** `<Field label>` → named trigger/dropzone.
- **TimeField:** `aria-label` now omittable; `<Field label>` → named input; passing `aria-label` alone still names it (back-compat).
- No regression: existing Select/Slider/ColorPicker/FileUpload/TimeField/Field tests stay green; native controls (Input etc.) still named and unchanged.

## Constraints

- **Rule 1** (tests next to each changed component), **Rule 7** (JSDoc: document that Field now wires `aria-labelledby`, and that composite controls forward it; update the `aria-label`/`aria-labelledby` notes on ColorPicker/FileUpload/TimeField), **Rule 8** (pre-push library review-fix loop), **Rule 6** spread-order preserved.
- No public API removal. `TimeField`'s `aria-label` goes from required → optional (additive/back-compat). No new exported types beyond the added `aria-labelledby` key on `FieldRenderProps`.
- No SCSS/token changes. i18n unaffected (these are consumer-supplied ARIA props).

## Non-goals

- No `FieldContext` (rejected — overkill for a prop-injection fix).
- No change to the native-control `id`/`htmlFor` naming path.
- `OptionsPicker` (not a form field) — left as-is.
- The stray consumer-`id`-on-wrapper hygiene in Select et al. (inert; not this fix) — optional follow-up.

## Downstream (after merge)

- **member-profile** mockup Selects (timezone/language/role) become named automatically — no change needed.
- **custom-fields** mockup's Type Select can simplify from the render-prop workaround back to plain auto-clone — optional follow-up (the render-prop still works, just becomes unnecessary).

## Branch

`fix/field-labels-composites`, off `main`. Its own PR.
