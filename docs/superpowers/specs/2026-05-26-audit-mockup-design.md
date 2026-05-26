# Audit log mockup (superadmin scope)

**Status:** approved (design phase) · **Date:** 2026-05-26 · **Branch:** `feat/audit-mockup`

## Problem

The playground demonstrates `@eocrm/design-system` against real CRM screens. The current mockups cover the customer-facing surface (Dashboard, Deals, Contacts, Contact detail, Members) but not the platform/admin surface. The EOCRM product (`/Users/dpws/projects/eocrm`) ships a rich audit log page at `frontend/src/modules/platform/audit/` — DataTable with expandable rows, multi-faceted filtering, diff display, forensic actions — that exercises a different combination of primitives than the existing mockups (notably DataTable, DefinitionList, Code, Tooltip, and expand interaction together).

A mockup for the audit log surface fills that gap and proves the primitives compose at the density a platform admin screen demands.

## Goal

Add a single `/mockups/audit` page that shows the superadmin scope of the audit log (cross-tenant view, with the Tenant column) as a static-but-interactive demo. Built entirely from `@eocrm/design-system` primitives per Hard rule 6.

**Non-goals:**

- Tenant-scoped variant. Superadmin scope is a strict superset (adds the Tenant column + tenant filter); landing one variant first keeps the mockup focused.
- Real filter logic. Filter pickers do not open; chips are visually applied with a working "remove" X to demonstrate the chip-removal UX.
- Real data wiring or pagination. Mock data is hand-rolled and finite.

## Design

### Page shape

```
PageHeader: "Audit log" · "284+ events" · [Export CSV] [Saved views]   (both disabled with Tooltip)
Cluster:    [Events ▾] [Tenant ▾] [Last 7 days ▾]                       (trigger buttons; no popovers)
Cluster:    chip · chip · chip · [Clear all]                            (Badges with X; working remove)
DataTable:  10 rows, compact density, expandable
Cluster:    "Showing 10 of 284+ · [Load more]"
```

### State

Local React state held in `Audit.tsx`:

- `activeChips: ChipId[]` — start with three chips (`event:role.assigned`, `tenant:acme`, `entity:user`). Click X removes the chip; "Clear all" empties the list.
- `expandedRowId: string | null` — controls which audit row's panel is open. Click chevron toggles. Only one row open at a time.

No filtering of visible rows from chip state. The chips are illustrative of the "filtered state" UI — the table always shows the same 10 mock rows.

### Mock data shape & source

A new file `packages/playground/src/data/audit.ts` exports the `AuditEntry` type (1:1 with eocrm's `frontend/src/modules/platform/audit/types.ts`) and `auditEntries: AuditEntry[]`:

```ts
export type AuditActorRef = { id: string; name: string; email: string };
export type AuditTenantRef = { id: string; slug: string; name: string };
export type AuditEntry = {
  id: string;
  occurred_at: string;
  actor: AuditActorRef | null;
  impersonator: AuditActorRef | null;
  tenant: AuditTenantRef | null;
  event: string;
  entity_type: string | null;
  entity_id: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  context: Record<string, unknown>;
};
```

Roughly 10 entries spanning event categories and tones:

| Event                          | Notes                                          |
| ------------------------------ | ---------------------------------------------- |
| `role.assigned`                | Sarah Lin promotes Mei Kim to admin in acme    |
| `role.updated`                 | Permissions array diff (added 3, removed 0)    |
| `user.created`                 | Multiple fields created from null              |
| `auth.login_succeeded`         | No changes; rich context (ip, ua, mfa)         |
| `auth.mfa_enabled`             | Boolean enable                                 |
| `invitation.expired`           | System-driven (actor=null), status diff        |
| `system_setting.updated`       | Platform scope (tenant=null) feature flag flip |
| `contact.deleted`              | Soft delete with reason context                |
| `deal.won`                     | Amount field change                            |
| `user.created` (impersonation) | Sarah Lin impersonating Mei Kim creates a user |

Times within the last 7 days. Tenant slugs: `acme`, `beta`, `hooli`, `stark`. Actor names match the existing playground mock cast where reasonable (Alex Rivera, Jordan Park, Sam Chen, Maya Owens) plus one or two platform-side names (Sarah Lin, Mei Kim).

### Column rendering

`useDataTable` hook with `getRowId: (r) => r.id` and `renderExpandedRow` provided. Columns:

| Column  | Width             | Render                                                                                                                                                 | Primitives                                    |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| When    | 130px             | Relative time string ("2 min ago") wrapped in `<Tooltip>` with absolute ISO                                                                            | `Tooltip`, `Text`                             |
| Event   | flex 1, min 180   | `<Badge tone={eventTone(event)} dot="start">{event}</Badge>`                                                                                           | `Badge`                                       |
| Actor   | flex 1.4, min 200 | `<Cluster>Avatar + Stack(name, email)</Cluster>`; impersonation: extra row `<Badge tone="warning" size="sm">impersonating</Badge>` + impersonator name | `Avatar`, `Cluster`, `Stack`, `Text`, `Badge` |
| Tenant  | 110px             | `<Code tone="muted">{slug}</Code>` or em-dash                                                                                                          | `Code`, `Text`                                |
| Entity  | flex 1, min 140   | `<Stack gap="3xs"><Text size="xs" tone="subtle">{entity_type}</Text><Code size="xs">{entity_id}</Code></Stack>`                                        | `Stack`, `Text`, `Code`                       |
| Changes | flex 1, min 200   | Text hint: "1 field" · "permissions: +3 / −0" · em-dash for null changes                                                                               | `Text`                                        |

Chevron auto-column is added by `useDataTable({ renderExpandedRow })`.

`eventTone(event)` is a local helper (~15 lines, switch on `event.split('.')[0]`):

- `role.*`, `user.*` → `info`
- `auth.login_succeeded`, `auth.mfa_enabled` → `success`
- `auth.login_failed`, `*.expired`, `*.deleted` → `danger`
- `invitation.*` → `warning` (unless `expired` → `danger`)
- `system_setting.*` → `warning`
- fallback → `neutral`

### Expanded panel

`renderExpandedRow` returns three sections separated by `<Divider/>`:

1. **Changes** — `<DefinitionList>` where each term is the field name (e.g., `role`, `permissions`) and the description is `<Cluster gap="xs"><Code tone="danger">{from}</Code> → <Code tone="accent">{to}</Code></Cluster>`. Code's existing `tone` values are `'default' | 'muted' | 'accent' | 'danger'`; `danger` for the "from" slot and `accent` for "to" reads as a before/after pair without inventing a new tone. For array values (e.g., `permissions`), `from` and `to` are rendered as compact JSON-ish strings inside Code. For `changes === null` (e.g., login events), render `<Text tone="muted">No field changes recorded.</Text>` instead of an empty list.

2. **Context** — `<DefinitionList>` of `context` keys. Values that look like IDs or IPs render as `<Code>`; everything else as `<Text>`.

3. **Forensic actions** — `<Cluster gap="sm">` of `<Link as="button" onClick={() => {}}>` items: "See all by {actor.name}", "See all on {entity_type}", "See all on {entity_id}". Clicks are no-op; the buttons exist to show the forensic-navigation pattern the real surface uses.

### Filter chips

`activeChips` is a list of `{ key, label, value, tone }`:

```ts
[
  { key: 'event', label: 'Event', value: 'role.assigned', tone: 'info' },
  { key: 'tenant', label: 'Tenant', value: 'acme', tone: 'neutral' /* mono */ },
  { key: 'entity', label: 'Entity type', value: 'user', tone: 'neutral' },
];
```

Each chip renders as `<Badge tone={tone} dot="start">{label}: {value} ✕</Badge>` — the ✕ is a small inline icon (`X` from lucide-react) and clicking the badge removes it. "Clear all" Button (variant="ghost", size="sm") empties the array.

If the chip array is empty, the chip-bar row is omitted (no empty container).

### Filter triggers (non-functional)

Three Buttons in a Cluster:

- `<Button variant="secondary" size="sm">Events <ChevronDown/></Button>`
- `<Button variant="secondary" size="sm">Tenant <ChevronDown/></Button>`
- `<Button variant="secondary" size="sm">Last 7 days <ChevronDown/></Button>`

Clicks are no-op. The buttons exist to show what the filter bar looks like, not to demo picker interactions (covered separately in component demos for `DropdownMenu`, `DateRangePicker`).

### Pagination footer

Static `<Cluster justify="between">` with:

- `<Text size="sm" tone="muted">Showing 10 of 284+ events</Text>`
- `<Button variant="secondary" size="sm">Load more</Button>` (no-op)

### Registry + nav wiring

- `packages/playground/src/pages/mockups/registry.ts` — add an `audit` entry:

  ```ts
  {
    slug: 'audit',
    title: 'Audit log',
    path: '/mockups/audit',
    blurb: 'Platform audit events — DataTable with expandable diff, filters, forensic links.',
    usesComponents: [
      'Avatar', 'Badge', 'Button', 'Card', 'Cluster', 'Code', 'DataTable',
      'DefinitionList', 'Divider', 'Link', 'PageHeader', 'Stack', 'Text',
      'Title', 'Tooltip',
    ],
  }
  ```

- `packages/playground/src/App.tsx` — add `<Route path="/mockups/audit" element={<Audit/>} />`.
- `packages/playground/src/layout/AppShell/AppShell.tsx` — append "Audit log" to the Mockups nav list.
- `packages/playground/src/pages/mockups/MockupsIndex.tsx` — add an overview card.

### File layout

```
packages/playground/src/pages/mockups/Audit/
  Audit.tsx              ← the page; no co-located .module.scss (Hard rule 6)
packages/playground/src/data/audit.ts   ← AuditEntry type + mock entries + eventTone helper
```

`Audit.tsx` is a single component plus a couple of small inline render helpers (`ActorCell`, `ChangesHint`, `ChipRow`, `ExpandedPanel`) defined in the same file. No new co-located CSS — Hard rule 6 forbids it for mockups. Layout density is achieved via existing component props (Stack/Cluster gaps, Text size).

## Component coverage check

Traced each cell and panel section against the design-system's published primitives. No library gaps surfaced:

- DataTable + `renderExpandedRow` + `getRowId` from `useDataTable` — verified at `packages/design-system/src/components/DataTable/DataTable.tsx`.
- DefinitionList for both Changes and Context — verified at `packages/design-system/src/components/DefinitionList/`.
- Code for monospace IDs and diff values, with `tone` for from/to coloring — verified at `packages/design-system/src/components/Code/`.
- Tooltip for absolute ISO time on hover.
- Link with button-like rendering for forensic actions — `<Link as="button">` is the existing pattern in `ContactDetail` mockup.

If, during implementation, the from→to diff row pattern feels like it'd be useful as a primitive (`InlineDiff`?), file a TODO in `packages/design-system/src/components/TODO.md` and continue with the inline composition. Do not introduce the new primitive in this branch.

## Testing

Per playground convention, mockups have no unit tests of their own — the gate is:

- `make build` (typecheck + bundle) green
- `make lint` (stylelint) green — no `.module.scss` introduced so this is trivially clean for the new file
- Manual: load `/mockups/audit` in the playground; click each chip's X to verify removal; expand a row to verify the panel; expand a different row to verify only one expands at a time; collapse the expanded row.
- Hard rule 7 (mockup pre-push review-fix cycle) applies — spawn a fresh-context review agent before push.

## Out of scope

- Tenant scope (without Tenant column / tenant picker). Land as a follow-up if/when validated.
- Real picker dropdowns. `DropdownMenu` is already covered by its own component demo; reintroducing a non-trivial picker UX in a mockup adds complexity without proportional dogfooding value.
- Date range picker. Covered by `DateRangePicker` component demo. Mockup uses a static trigger button.
- Saved views, Export CSV. The buttons are disabled with a "coming soon" Tooltip, matching the real eocrm surface.
- Error/loading/empty states for the table. The mockup ships only the populated state; empty/loading/error states are covered by `DataTable` and `EmptyState` component demos.
