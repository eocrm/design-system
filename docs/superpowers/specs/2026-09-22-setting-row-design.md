# SettingRow — design

**Date:** 2026-09-22
**Status:** approved

## Problem

Backend-driven settings screens render a repeating row: a label with provenance
badges, a description, a typed control, adornments that act on that control
(a mode `Select`, an "Overridden" badge, a reset button), and — for metered
limits — a usage meter with a caveat below.

The library has no primitive for that row, so it has been hand-rolled **twice**,
and the two hand-rolls picked opposite layouts:

| Hand-roll                                                         | Layout                                             | Failure mode                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `packages/playground/src/pages/mockups/Settings/Settings.tsx:107` | `Cluster justify="between"`                        | Control flung to the far edge of a wide card, far from the label it belongs to.       |
| eocrm `apps/web/src/console/module-config/ConfigKeyRow.tsx`       | `Cluster` packed left (explicitly, with a comment) | Every row's control starts at a different x, because each label is a different width. |

The screenshot that prompted this work is the second one. Measured on the real
screen: the Seats control starts at x=410, API calls at x=384, Default currency
at x=406. Alongside that, `Progress` is rendered with no width constraint and
spans the full ~1600px card, and the mode `Select` wraps onto its own line under
the number input.

None of those three defects is fixed by a new component on its own — they are
consumer-side. What justifies the component is that **nothing in the library
expresses the row's shape**, so each consumer re-derives the alignment and gets
it wrong in a new way.

## What `Field` already does, and where it stops

`Field orientation="horizontal"` is the closest existing primitive. It gives a
shared label column via `--field-label-width` (default `12rem`), and it owns the
control wiring: id ownership, `aria-labelledby`, the `aria-describedby`
description/error swap, and `aria-invalid`.

It stops at four things this row needs:

| Need                                                                  | `Field` today                                                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Badge on the label baseline ("From plan")                             | Only by putting a `Cluster` inside `label` — which drags the badge text into the control's accessible name. |
| Adornments **after** the control (mode `Select`, "Overridden", Reset) | Single child; needs the render-prop escape hatch.                                                           |
| A footer aligned under the **control** column (meter + hint)          | `description` renders under the control but cannot hold a block.                                            |
| Rhythm, dividers and one shared label width across a list of rows     | Nothing.                                                                                                    |

`SettingRow` cannot simply _be_ a horizontal `Field`: `Field` puts `description`
in column 2 under the control, and this row puts it in column 1 under the label.
The DOM shapes differ, so the row owns its own grid and borrows only the wiring.

## Decisions taken during brainstorming

| Decision           | Choice                                                                    | Why                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shape              | New `SettingRow` component, not new `Field` props                         | `Field` is already a 9-prop surface (label, description, error, required, optional, orientation, size, id, asGroup, render-prop). Three more slots plus a list wrapper pushes it to god-component.                       |
| Row rhythm         | Compound `SettingRow.List` with `dividers`                                | Matches `DefinitionList`'s existing vocabulary (`dividers`, `spacing`) so the DS has one rhythm language, and gives the shared label width an owner.                                                                     |
| `dividers` default | `false`                                                                   | Same default as `DefinitionList`. eocrm opts in.                                                                                                                                                                         |
| Label adornment    | Separate `labelAdornment` prop, rendered **outside** `<label>`            | Anything inside `<label>` joins the accessible name. Today eocrm's row announces "Seats From plan".                                                                                                                      |
| Control width      | `controlWidth` prop on the row, not consumer-side `Constrain`             | Wrapping the child in `<Constrain>` makes `Constrain` the element `cloneElement` wires, so the input silently loses its `id` and `aria-*`. The row applies the max-width to the control **cell** instead.                |
| Wiring             | Extract `Field`'s wiring to `_internal/fieldWiring.tsx`, consumed by both | The empty-ARIA-id-list rule (`\|\|` rather than `??`) is subtle, hard-won and commented. Copying 20 lines of it is how it drifts.                                                                                        |
| Narrow layout      | `collapseBelow` container query, default `'sm'`                           | Same measurement basis and the same `_internal/collapse.scss` constants as `Grid` / `Split`. The row re-templates inside a box whose width the collapse does not change, so a container query is stable and needs no JS. |
| Mockup             | Rebuild the existing `mockups/Settings` page; no new mockup route         | Fewest files. Cost accepted below.                                                                                                                                                                                       |
| Read-only rows     | Out of scope                                                              | Nothing needs them. `DefinitionList` covers read-only key/value today.                                                                                                                                                   |

### Accepted cost

Rebuilding `mockups/Settings` rather than adding a tenant-settings mockup means
the component never renders the vertical-`Tabs` + module-panel shape from the
screenshot that prompted it. It ships proven against a card-of-rows screen only.
The eocrm-side `ConfigKeyRow` refactor is where the originating screen gets
tested, and that is separate work in a separate repo.

## Public API

```ts
/** Max width applied to the control cell. Mirrors `Constrain`'s scale. */
export type SettingRowControlWidth = 'auto' | 'xs' | 'sm' | 'md' | 'full';

export interface SettingRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` naming the control. Required. */
  label: ReactNode;
  /**
   * Badges/chips on the label line, rendered as a SIBLING of the `<label>`.
   * Deliberately outside it: label content becomes the control's accessible
   * name, so a provenance badge placed inside makes the input announce
   * "Seats From plan".
   */
  labelAdornment?: ReactNode;
  /** Helper text under the label, in the label column. Linked via `aria-describedby`. */
  description?: ReactNode;
  /** Max width of the control cell. Default `'auto'` (control's intrinsic width). */
  controlWidth?: SettingRowControlWidth;
  /** Content after the control on the same line — a mode select, a state badge, a reset button. */
  trailing?: ReactNode;
  /** Block under the control column — a usage meter, a caveat, a preview. */
  footer?: ReactNode;
  /**
   * Error message. Replaces `description` in `aria-describedby` and flips the
   * control to `invalid`. Not announced — see `Field`'s note on #494; the form
   * owns the submit-time summary.
   */
  error?: ReactNode;
  /** Marks the row required: shows `*` and injects `required` onto the control. */
  required?: boolean;
  /** Explicit control id. The row owns the id by default so the label always matches. */
  id?: string;
  /** A single control element (auto-wired) or a render-prop `(field) => ReactNode`. */
  children: ReactNode | ((field: FieldRenderProps) => ReactNode);
}

export interface SettingRowListProps extends HTMLAttributes<HTMLDivElement> {
  /** CSS length for the label column, shared by every row. Default `'16rem'`. */
  labelWidth?: string;
  /** 1px border between rows. Default `false`, matching `DefinitionList`. */
  dividers?: boolean;
  /** Vertical padding per row: `sm` space-2 / `md` space-3 / `lg` space-4. Default `'md'`. */
  spacing?: 'sm' | 'md' | 'lg';
  /** Container width at or below which the label column stacks above the control. Default `'sm'`. */
  collapseBelow?: CollapseBreakpoint;
  children: ReactNode;
}
```

`FieldRenderProps` is re-exported from `Field` — the render-prop contract is
identical, and a second near-identical type would be a trap.

### Canonical usage

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
    trailing={<Select size="sm" options={modes} value={mode} onChange={setMode} />}
    footer={
      <Stack gap="xs">
        <Progress value={0} max={50} aria-label="Seats usage" />
        <Text as="span" size="xs" tone="muted">
          Metering is wired — counters start when billing is enabled.
        </Text>
      </Stack>
    }
    error={errors.get('seats')}
  >
    <Input type="number" />
  </SettingRow>
</SettingRow.List>
```

## Structure

```
┌─ SettingRow.List ────────────────────────────────────────────┐
│  --setting-row-label-width: 18rem                            │
│  ┌─ SettingRow (grid: <label-width> 1fr) ─────────────────┐  │
│  │ .term                      │ .control                  │  │
│  │  <label> + labelAdornment  │  .controlRow:             │  │
│  │  description               │    children + trailing    │  │
│  │                            │  footer                   │  │
│  │                            │  error                    │  │
│  └────────────────────────────┴───────────────────────────┘  │
│  ─────────────────────── divider ──────────────────────────  │
│  ┌─ SettingRow ───────────────────────────────────────────┐  │
└──────────────────────────────────────────────────────────────┘
```

Alignment across rows needs no subgrid: `labelWidth` is a **length**, not
`max-content`, so every row independently resolves the same column. The List
sets `--setting-row-label-width` once; a row used outside a List falls back to
`16rem`.

`collapseBelow` puts `container-type: inline-size` on the List and, below the
threshold, re-templates every row to a single column — term above control.

## Internals

### `_internal/fieldWiring.tsx` (new)

Lifted verbatim from `Field.tsx`'s body: id derivation (`controlId`, `labelId`,
`descriptionId`, `errorId`), the `describedBy` error-wins-over-description
choice, the `FieldRenderProps` object, and the `cloneElement` injection
including its `asGroup` branch and the `||`-not-`??` comment.

`Field` is refactored to consume it. **This must be behavior-preserving** —
`Field.test.tsx` is the guard, and it runs unchanged. If any `Field` test needs
editing, the extraction is wrong.

`SettingRow` consumes it with `asGroup: false`. `optional` stays in `Field` —
it is a rendered marker, not wiring, and `SettingRow` has no use for it.

`CollapseBreakpoint` is already publicly exported (`src/index.ts:417`, via
`Sortable`), so `SettingRowListProps` reuses it rather than minting a parallel
union.

### Styling

`SettingRow.tokens.scss` holds the component tokens
(`--setting-row-label-width`, `--setting-row-divider-color`,
`--setting-row-padding-y-{sm,md,lg}`, `--setting-row-column-gap`,
`--setting-row-description-fg`), each defaulting to a primitive.

Hard rule 4 holds: the row declares no `margin` and no `width` other than
`100%`. Vertical padding and dividers live on the List, which is the parent.

## Testing

`SettingRow.test.tsx`:

- renders with minimum props (`label` + one control)
- `<label>` is associated with the control; clicking the label focuses it
- **`labelAdornment` content is absent from the control's accessible name** —
  the regression this component exists to prevent
- `description` is linked via `aria-describedby`
- `error` replaces `description` in `aria-describedby` and sets `aria-invalid`
- `required` injects `required` and renders the marker
- `trailing` and `footer` render in their cells
- each `controlWidth` value renders the right class
- render-prop form receives a `field` object with the full wiring
- `ref` forwards to the row element; `className` is merged, not replaced

`SettingRow.List` cases: `dividers`, `spacing`, `collapseBelow` render the right
data attributes, and `labelWidth` sets the custom property.

`Field.test.tsx` runs unchanged as the extraction guard.

## Delivery checklist

Root `CLAUDE.md`'s core invariant, in full:

1. `packages/design-system/src/components/SettingRow/` — `SettingRow.tsx`,
   `SettingRow.module.scss`, `SettingRow.tokens.scss`, `SettingRow.test.tsx`,
   `index.ts`
2. `_internal/fieldWiring.tsx` extracted; `Field.tsx` refactored onto it
3. Re-exported from `packages/design-system/src/index.ts` (component + types)
4. JSDoc on the component and every prop, with `@example` blocks and
   `@remarks` "When NOT to use" / "Anti-patterns"
5. `packages/design-system/AGENTS.md` — one-section TL;DR
6. `CLUSTERS` entry in **both** `src/_meta/manifest.ts` and
   `scripts/generate-manifest.mjs`, then `npm run build:manifest`
7. `packages/playground/src/pages/components/SettingRowDemo.tsx`
8. Playground wiring: `App.tsx` route, `layout/AppShell/navItems.ts`,
   `pages/components/ComponentsIndex.tsx`,
   `pages/components/overviewSchematics.tsx`,
   `pages/mockups/registry.ts` `ComponentName` union
9. `mockups/Settings/Settings.tsx` rebuilt onto the real component (local
   `SettingRow` deleted); `data/systemSettings.ts` gains metered entries so
   `footer` and `trailing` are exercised

### Anti-patterns to document

- ❌ Putting a badge inside `label` instead of `labelAdornment` — it joins the
  accessible name.
- ❌ Wrapping the control in `<Constrain>` — breaks auto-wiring. Use
  `controlWidth`.
- ❌ A bare `Cluster` with `justify="between"` or packed left for a settings
  row — the two failure modes this component replaces.
- ❌ Read-only key/value display — that is `DefinitionList`.
- ❌ `margin` on a `SettingRow` to separate rows — that is `SettingRow.List`.
