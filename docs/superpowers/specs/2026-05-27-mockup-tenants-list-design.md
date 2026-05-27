# Mockup: Tenants list page (superadmin)

## Context

EOCRM is a multi-tenant SaaS. A **tenant** is a customer organization on the platform. The Tenants list page is a **superadmin** (platform-admin) view that lists every tenant and surfaces operational signal: provisioning state, member activity, app version. It's not a tenant-user-facing page.

Canonical reference: `/Users/dpws/projects/eocrm/api/app/Modules/Platform/Superadmin/`.

- API: `GET /api/v1/superadmin/tenants?state=<state>&search=<q>`.
- Row data per `IndexTest.php`: `id`, `slug`, `name`, `state`, `state_reason`, `app_version`, `last_migration_at`, `activated_at`, `archived_at`, `created_at`, `members_count`, `pending_invites_count`, `last_member_active_at`.
- Per-row actions per `*Controller.php`: Suspend (Active → Suspended), Unsuspend (Suspended → Active), Retry provisioning (Failed/Queued/Pending → Provisioning).
- States per `TenantState.php`: `pending | queued | provisioning | active | failed | suspended`.

## Goal

A believable superadmin-facing list page rendered entirely from `@eocrm/design-system` primitives. The page demonstrates: tabular list with state badges, search + state filter, per-row context menu, pagination, and a subtle "this is a superadmin context" framing — without inventing a separate nav system.

## Framing

The page renders inside the existing playground AppShell (Mockups section). The superadmin context is conveyed in-page, not via a parallel nav:

- `PageHeader` breadcrumb reads `Superadmin / Tenants` (rendered with `<Breadcrumb>`).
- A `<Badge tone="warning" size="sm">Superadmin</Badge>` chip sits next to the page title, so any consumer looking at this page knows immediately it's a platform-admin view, not a tenant-user view.
- The page title itself is `Tenants`.

## Columns

| Column | Source field | Cell |
| --- | --- | --- |
| Tenant | `slug`, `name` | `<PersonDisplay>` shape — initials-style mark + name (top) + slug (bottom, monospace) |
| State | `state`, `state_reason` | `<Badge>` with tone per state (see mapping below) + optional `<Tooltip>` exposing `state_reason` for failed/suspended rows |
| Members | `members_count` | Right-aligned number; `<Text tone="muted">` if 0 |
| Invites | `pending_invites_count` | Right-aligned number; muted "—" if 0; `<Badge tone="info" size="sm">` if > 0 |
| Last active | `last_member_active_at` | Relative time ("2h ago"); "—" if null |
| App version | `app_version` | `<Code>` for the version string; "—" if null (still provisioning) |
| Created | `created_at` | Short date ("May 12") |
| ⋯ | — | `<DropdownMenu>` with state-appropriate actions |

State-to-badge-tone mapping:

| State | Tone | Reasoning |
| --- | --- | --- |
| `active` | `success` | Operational, serving traffic |
| `pending` | `neutral` | Submitted, not yet picked up |
| `queued` | `info` | In queue, awaiting worker |
| `provisioning` | `info` | Actively being set up |
| `failed` | `danger` | Provisioning broke |
| `suspended` | `warning` | Operator-disabled |

## Per-state row actions

The trailing `⋯` menu surfaces only the actions valid for the row's state (mirrors what the API will accept):

- **Active**: View · Suspend · Edit metadata
- **Suspended**: View · Unsuspend · Edit metadata
- **Failed**: View · Retry provisioning · View error
- **Pending / Queued**: View · Retry provisioning · Cancel
- **Provisioning**: View · (no destructive actions while in-flight)

The submenu items use `<DropdownMenu.Item destructive>` for Suspend; everything else is default.

## Demo data — 8 rows, all six states

The data file gives every state at least one representative row. Names follow the existing mockup data convention (fictional orgs with `slug` + `name`).

| # | slug | name | state | members | pending | last_active | app_version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `acme` | Acme Inc. | active | 24 | 0 | 8 min ago | 2026.5.12 |
| 2 | `umbrella-corp` | Umbrella Corporation | active | 142 | 3 | 2h ago | 2026.5.12 |
| 3 | `northwind-trading` | Northwind Trading | suspended | 8 | 0 | 4d ago | 2026.5.04 |
| 4 | `initech` | Initech | failed | 0 | 1 | — | — |
| 5 | `globex` | Globex Corp | provisioning | 0 | 5 | — | — |
| 6 | `hooli` | Hooli | active | 67 | 2 | 22 min ago | 2026.5.12 |
| 7 | `vandelay` | Vandelay Industries | queued | 0 | 1 | — | — |
| 8 | `stark-industries` | Stark Industries | pending | 0 | 4 | — | — |

`state_reason` is populated for rows 3 (suspended), 4 (failed): "Manual suspension — billing issue (2026-05-23)" / "Database migration timeout on `add_audit_index` step (last attempt 2026-05-26 14:22 UTC)". A `<Tooltip>` on the state badge of those rows surfaces the reason.

`last_migration_at` is shown via Tooltip on the App version badge (so the version cell stays compact); explicitly listed for active rows only.

## Filters + search

A `<Card padding="sm">` row above the table contains:

- `<Input>` placeholder `Search by name or slug…` — wired to filter the displayed rows by substring match on either field.
- `<DropdownMenu>` "State: All" — `RadioGroup` for all-states / each individual state. When non-default, rows filter to that state.
- `<DropdownMenu>` "Sort: Last active" — purely visual (no real sort logic); shows the pattern.

Filter state lives in the page component. Search and state filter both filter the rendered row set; if zero rows match, render an `<EmptyState>`.

## PageHeader

- Title: `Tenants`
- Breadcrumb: `Superadmin / Tenants`
- Eyebrow Badge: `<Badge tone="warning" size="sm">Superadmin</Badge>` next to the title.
- Meta: `8 tenants` (live count of the filtered list)
- Actions cluster: `<Button variant="secondary">Export CSV</Button>` (decorative, wrapped in `<Tooltip content="Export coming soon">` with `aria-disabled`), `<Button>+ New tenant</Button>`.

## Footer pagination

Below the table:

- `<Pagination>` primitive with `currentPage={1}`, `totalPages={4}`, 25/page (mock numbers).
- Wrapped in `<Cluster justify="between">` with a "Showing 1–8 of 84 tenants" `<Text tone="muted">` on the left.

## Layout

```
<Page>
  <PageHeader> … </PageHeader>
  <Card padding="sm">
    <Cluster> Search Input + Filter dropdowns </Cluster>
  </Card>
  <Card padding="none">
    <Table> …rows… </Table>
  </Card>
  <Cluster justify="between">
    <Text>Showing …</Text>
    <Pagination />
  </Cluster>
  <CrossLinks kind="mockup" slug="tenants" />
</Page>
```

All vertical spacing comes from the `<Page>` Stack default gap; no custom margins.

## Components used (for `registry.ts`)

`Badge`, `Breadcrumb`, `Button`, `Card`, `Cluster`, `Code`, `DropdownMenu`, `EmptyState`, `Input`, `Page`, `PageHeader`, `Pagination`, `PersonDisplay`, `Stack`, `Table`, `Text`, `Title`, `Tooltip`.

## Files

| File | Role |
| --- | --- |
| `packages/playground/src/data/tenants.ts` (NEW) | Mock data array + helpers (`stateTone`, `stateLabel`, `relativeTime`, `tenantActions`) |
| `packages/playground/src/pages/mockups/Tenants/Tenants.tsx` (NEW) | Page component |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY) | Register `tenants` slug + components used |
| `packages/playground/src/App.tsx` (MODIFY) | Route: `/mockups/tenants → <Tenants />` |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY) | Sidebar item under Mockups group |

## Out of scope

- Real superadmin nav (parallel sidebar). The "Superadmin" badge near the title carries the framing.
- Tenant detail page (would be a separate mockup if requested).
- Member-management subview (already covered by `mockups/Members`).
- Bulk row actions (single-row context menu is enough).
- Sorting logic — `Sort:` dropdown is visual only.
- Live API. All filtering is local on the 8 mock rows.
