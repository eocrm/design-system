# Custom Fields configuration mockup

**Date:** 2026-06-02
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `playground` (mockup; never published)

## Problem / goal

A believable CRM **admin screen for defining custom fields per entity** (Contacts, Deals, Companies, Tickets). It showcases the form primitives (`Field`/`FormRow`/`FormSection`) in a real configuration workflow and exercises the recently-fixed Select-in-`Drawer` behavior. This is a **mockup** — built exclusively from `@eocrm/design-system` components (playground Hard rule 6); lucide icons + the `toast` helper are allowed.

The reference repo has no custom-fields concept to mirror, so the model is designed fresh. Field *definitions* are mockup-local state — there are no real entity records.

## The page

Standalone admin mockup at **`/mockups/custom-fields`**, reachable from the Mockups sidebar.

### Layout (approved: entity tabs + per-entity field list)

- **`PageHeader`** — title "Custom fields", subtitle, and an **"+ Add field"** `Button` in `Actions`.
- **`Tabs`** — one tab per entity: **Contacts · Deals · Companies · Tickets**. Switching tabs shows that entity's fields. (Entity names only; no records.)
- **Field list** — a reorderable list of the selected entity's fields.
- **"+ Add field"** opens the **Add/Edit `Drawer`** (right, `size="md"`).

### Field list — a `<Sortable>` list (not a literal `<Table>`)

`Sortable` renders an `<ol>`/`<li>` list and is the library's drag-reorder primitive; `<Table>` rows are **not** drag-sortable. To deliver the approved drag-handle reorder within Hard rule 6 (no escape hatch), the field list is a **`<Sortable>` list** whose rows are laid out with `Cluster`/`Stack` (flex), not pixel-aligned table columns. Each row (`Sortable.Item`):

- `Sortable.Handle` (drag grip)
- `Stack`: field **label** (`Text` medium) + **key** (`Code`, muted) on a second line
- spacer (`Cluster` grow)
- **type** `Badge` (e.g. "Dropdown", "Number") via a per-type tone map
- **Required** indicator (`Badge`/`Text` "Required", shown only when required)
- row actions `DropdownMenu` (Edit, Delete)

Reordering calls `onReorder(({from,to}) => arrayMove(...))`. When an entity has no fields → **`EmptyState`** ("No custom fields yet" + an "Add field" action). (No separate header row — rows are self-describing — because flex rows can't pixel-align to a header within the library's sizing primitives.)

### Add / edit field `Drawer` (controlled `open`, `side="right"`, `size="md"`)

`Drawer.Header` "Add field · {Entity}" / "Edit field · {Entity}". `Drawer.Body` = three `FormSection`s; `Drawer.Footer` = Cancel (`Drawer.Close`) + "Save field".

1. **Field** — Label (`Field` required + `Input`); Field key (`Field` + `Input`, `Code`-styled, auto-derived from the label, editable; hint: "Used in the API & imports"); Type (`Field` required + **`Select`** — this Select is inside the Drawer, exercising the #112 elevation fix).
2. **Options** *(conditional — only when Type is `dropdown` or `multiselect`)* — a `Sortable` list of option rows, each a `Field`-less `Input` + a remove action, plus an "+ Add option" `Button`. Drag to reorder.
3. **Behavior** — Help text (`Field` optional + `Input`); Required (`Field` horizontal + `Switch`); Show in table (`Field` horizontal + `Switch`, "Add a column on the {Entity} list").

**Field types** (the Type `Select` options): Text, Text area, Number, Date, Checkbox (yes/no), Dropdown, Multi-select, Email, URL, Phone.

## State & behavior (mockup-local)

- `fieldsByEntity: Record<EntityKey, CustomField[]>` — seeded with a few plausible fields per entity (e.g. Contacts: Industry/dropdown, LinkedIn/url; Deals: Forecast category/dropdown, Contract value/number, Renewal date/date).
- `activeEntity: EntityKey` (from the Tabs).
- Drawer: `open`, `editingId: string | null` (null = add), `draft: CustomFieldDraft`, `errors`.
- **Add:** "+ Add field" → reset draft (type defaults to `text`), `editingId=null`, open.
- **Edit:** row action → load the field into draft, `editingId=field.id`, open.
- **Key derivation:** the key auto-syncs from the label (slugify: lowercase, non-alphanumeric → `_`, collapse repeats, trim) until the user edits the key manually, then it stops syncing.
- **Save:** validate; on error set `errors` (Field error states) and keep open; else upsert into `fieldsByEntity[activeEntity]`, close, `toast.success("Field saved")`.
- **Cancel / dismiss:** discard draft.
- **Reorder:** `Sortable` `onReorder` → `arrayMove` the entity's fields (and option rows within the drawer).
- **Delete:** row action → `ConfirmationPopover` ("Delete this field?") → remove + `toast`.

### Validation (drives `Field` error states)

On Save: **Label** required; **Key** required, matches `^[a-z][a-z0-9_]*$`, and unique within the entity (excluding the field being edited); **choice types** (`dropdown`/`multiselect`) need ≥1 non-empty option.

### Types

```ts
type EntityKey = 'contacts' | 'deals' | 'companies' | 'tickets';
type FieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'checkbox'
  | 'dropdown' | 'multiselect' | 'email' | 'url' | 'phone';
interface FieldOption { id: string; label: string; }
interface CustomField {
  id: string;
  label: string;
  key: string;
  type: FieldType;
  helpText?: string;
  required: boolean;
  showInTable: boolean;
  options?: FieldOption[]; // choice types only
}
```

## Components used (registry `usesComponents`)

`Badge`, `Button`, `Code`, `ConfirmationPopover`, `Drawer`, `DropdownMenu`, `EmptyState`, `Field`, `FormRow`, `FormSection`, `Input`, `Page`, `PageHeader`, `Select`, `Sortable`, `Stack`, `Switch`, `Tabs`, `Text`. (All already in the `ComponentName` union — no additions needed. `Textarea` only if a textarea preview is added; not in the base scope. Final `usesComponents` must match actual imports exactly — Rule 7.)

## Files

- **Create:** `packages/playground/src/pages/mockups/CustomFields/CustomFields.tsx` (the page: tabs, field list, state). If the file grows past ~300 lines, split the Drawer form into `CustomFields/FieldDrawer.tsx` (same folder) — decide during implementation.
- **Modify (Rule 4 wiring):**
  - `packages/playground/src/App.tsx` — import + `<Route path="/mockups/custom-fields" …>`
  - `packages/playground/src/layout/AppShell/AppShell.tsx` — a `mockupItems` nav entry (lucide icon, e.g. `SlidersHorizontal` / `ListPlus`)
  - `packages/playground/src/pages/mockups/registry.ts` — a `MOCKUPS` entry `{ slug: 'custom-fields', title: 'Custom fields', path: '/mockups/custom-fields', blurb, usesComponents }` (auto-feeds `MockupsIndex` + `CrossLinks`; path has no `:` so it appears on the overview grid)

## Constraints

- **Hard rule 6:** only `@eocrm/design-system` components — no raw HTML, no inline `style`, no co-located SCSS. lucide icons + `toast` allowed. The field-list rows use `Cluster`/`Stack` flex layout (not pixel-aligned columns) since the library has no arbitrary-track table-with-drag primitive; this needs no escape hatch.
- **Brand:** use `eocrm` in any brand copy.
- Spacing via `Stack`/`Cluster`/`FormRow`/`FormSection` gaps; the in-drawer Type `Select` relies on the merged #112 fix to render above the drawer.

## Non-goals

- No backend/persistence — definitions live in component state for the session.
- No real entity records or live field rendering/preview (a "preview how this field looks on a form" is a follow-up).
- No per-field permissions, conditional visibility, or field dependencies.
- No unit test file — playground mockups aren't unit-tested; verification is gates + the Rule 7 mockup review loop + manual smoke.

## Verification

- Gates: `make test`, `make build` (typecheck + bundle), `make lint`, `prettier --check`.
- **Playground Hard rule 7** mockup review-fix loop (fresh-context reviewer over the new mockup; 10 categories) until "clean enough to stop".
- Manual smoke: `/mockups/custom-fields` — switch entity tabs; Add field → pick Dropdown → Options editor appears, the Type Select opens **above** the drawer; invalid (empty label / no options) blocks Save with Field errors; Save adds the row + toast; drag-reorder rows; Edit/Delete via row actions; empty entity shows the EmptyState.

## Follow-ups (out of scope)

- Live preview of how each field renders on an entity form.
- Import/export field definitions; per-field default values & placeholder.
- A reusable `<Sortable>`-backed "data list with drag" or sortable-table primitive in the library (would replace the hand-laid Cluster rows).
