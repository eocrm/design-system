# Tenants list page mockup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add a `/mockups/tenants` page that lists tenants (superadmin POV), built only from `@eocrm/design-system` primitives. Driven by the spec at `docs/superpowers/specs/2026-05-27-mockup-tenants-list-design.md`.

**Branch:** `feat/mockup-tenants-list` (already checked out off main).

**Reference:** EOCRM superadmin module at `/Users/dpws/projects/eocrm/api/app/Modules/Platform/Superadmin/`. Tenant states from `Tenancy/Enums/TenantState.php`. API contract from `Superadmin/Tests/Feature/Tenants/IndexTest.php`.

---

## Task 1: Mock data + helpers

**Files:**

- Create: `packages/playground/src/data/tenants.ts`

- [ ] **Step 1: Write the data file**

```ts
import type { BadgeTone } from '@eocrm/design-system';

export type TenantState = 'pending' | 'queued' | 'provisioning' | 'active' | 'failed' | 'suspended';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  state: TenantState;
  stateReason: string | null;
  appVersion: string | null;
  lastMigrationAt: string | null;
  activatedAt: string | null;
  membersCount: number;
  pendingInvitesCount: number;
  lastMemberActiveAt: string | null;
  createdAt: string;
}

export const stateTone: Record<TenantState, BadgeTone> = {
  active: 'success',
  pending: 'neutral',
  queued: 'info',
  provisioning: 'info',
  failed: 'danger',
  suspended: 'warning',
};

export const stateLabel: Record<TenantState, string> = {
  active: 'Active',
  pending: 'Pending',
  queued: 'Queued',
  provisioning: 'Provisioning',
  failed: 'Failed',
  suspended: 'Suspended',
};

export const tenants: Tenant[] = [
  {
    id: '01HX1ACME0000000000000000',
    slug: 'acme',
    name: 'Acme Inc.',
    state: 'active',
    stateReason: null,
    appVersion: '2026.5.12',
    lastMigrationAt: '2026-05-12T10:14:00Z',
    activatedAt: '2025-09-04T12:00:00Z',
    membersCount: 24,
    pendingInvitesCount: 0,
    lastMemberActiveAt: '2026-05-27T13:52:00Z', // 8 min ago at 14:00 UTC anchor
    createdAt: '2025-09-04T12:00:00Z',
  },
  {
    id: '01HX1UMBR0000000000000001',
    slug: 'umbrella-corp',
    name: 'Umbrella Corporation',
    state: 'active',
    stateReason: null,
    appVersion: '2026.5.12',
    lastMigrationAt: '2026-05-12T10:14:00Z',
    activatedAt: '2024-11-21T09:30:00Z',
    membersCount: 142,
    pendingInvitesCount: 3,
    lastMemberActiveAt: '2026-05-27T12:00:00Z',
    createdAt: '2024-11-21T09:30:00Z',
  },
  {
    id: '01HX1NORW0000000000000002',
    slug: 'northwind-trading',
    name: 'Northwind Trading',
    state: 'suspended',
    stateReason: 'Manual suspension — billing issue (2026-05-23)',
    appVersion: '2026.5.04',
    lastMigrationAt: '2026-05-04T08:42:00Z',
    activatedAt: '2025-03-12T14:11:00Z',
    membersCount: 8,
    pendingInvitesCount: 0,
    lastMemberActiveAt: '2026-05-23T18:00:00Z',
    createdAt: '2025-03-12T14:11:00Z',
  },
  {
    id: '01HX1INIT0000000000000003',
    slug: 'initech',
    name: 'Initech',
    state: 'failed',
    stateReason:
      'Database migration timeout on `add_audit_index` step (last attempt 2026-05-26 14:22 UTC)',
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 1,
    lastMemberActiveAt: null,
    createdAt: '2026-05-26T14:00:00Z',
  },
  {
    id: '01HX1GLOB0000000000000004',
    slug: 'globex',
    name: 'Globex Corp',
    state: 'provisioning',
    stateReason: null,
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 5,
    lastMemberActiveAt: null,
    createdAt: '2026-05-27T13:40:00Z',
  },
  {
    id: '01HX1HOOL0000000000000005',
    slug: 'hooli',
    name: 'Hooli',
    state: 'active',
    stateReason: null,
    appVersion: '2026.5.12',
    lastMigrationAt: '2026-05-12T10:14:00Z',
    activatedAt: '2025-07-01T10:00:00Z',
    membersCount: 67,
    pendingInvitesCount: 2,
    lastMemberActiveAt: '2026-05-27T13:38:00Z',
    createdAt: '2025-07-01T10:00:00Z',
  },
  {
    id: '01HX1VAND0000000000000006',
    slug: 'vandelay',
    name: 'Vandelay Industries',
    state: 'queued',
    stateReason: null,
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 1,
    lastMemberActiveAt: null,
    createdAt: '2026-05-27T13:55:00Z',
  },
  {
    id: '01HX1STRK0000000000000007',
    slug: 'stark-industries',
    name: 'Stark Industries',
    state: 'pending',
    stateReason: null,
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 4,
    lastMemberActiveAt: null,
    createdAt: '2026-05-27T13:58:00Z',
  },
];

// Anchored "now" so the relative timestamps in mock data render the same on
// every visit (Today = 2026-05-27T14:00:00Z). Without this the rows would
// drift over real time and break the demo's intent.
const NOW = new Date('2026-05-27T14:00:00Z').getTime();

export function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const delta = Math.max(0, NOW - new Date(iso).getTime());
  const m = Math.round(delta / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export type TenantAction =
  | 'view'
  | 'suspend'
  | 'unsuspend'
  | 'retry'
  | 'edit'
  | 'cancel'
  | 'view-error';

export function tenantActions(state: TenantState): TenantAction[] {
  switch (state) {
    case 'active':
      return ['view', 'suspend', 'edit'];
    case 'suspended':
      return ['view', 'unsuspend', 'edit'];
    case 'failed':
      return ['view', 'retry', 'view-error'];
    case 'pending':
    case 'queued':
      return ['view', 'retry', 'cancel'];
    case 'provisioning':
      return ['view'];
  }
}

export const actionLabel: Record<TenantAction, string> = {
  view: 'View',
  suspend: 'Suspend',
  unsuspend: 'Unsuspend',
  retry: 'Retry provisioning',
  edit: 'Edit metadata',
  cancel: 'Cancel',
  'view-error': 'View error details',
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/playground/src/data/tenants.ts
git commit -m "Playground: tenant mock data + state helpers"
```

---

## Task 2: Tenants mockup page

**Files:**

- Create: `packages/playground/src/pages/mockups/Tenants/Tenants.tsx`

The page renders strictly from `@eocrm/design-system` primitives (Hard rule 6). No inline styles, no raw HTML, no co-located SCSS.

- [ ] **Step 1: Write the page**

```tsx
import { useMemo, useState } from 'react';
import { ChevronDown, Download, Plus, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  Code,
  DropdownMenu,
  EmptyState,
  Input,
  Page,
  PageHeader,
  Pagination,
  PersonDisplay,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@eocrm/design-system';
import {
  tenants as ALL_TENANTS,
  stateTone,
  stateLabel,
  tenantActions,
  actionLabel,
  relativeTime,
  shortDate,
  type TenantState,
} from '../../../data/tenants';
import { CrossLinks } from '../../shared/CrossLinks';

const STATE_FILTER_OPTIONS: { value: TenantState | 'all'; label: string }[] = [
  { value: 'all', label: 'All states' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'queued', label: 'Queued' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'failed', label: 'Failed' },
  { value: 'suspended', label: 'Suspended' },
];

export function Tenants() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<TenantState | 'all'>('all');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_TENANTS.filter((t) => {
      if (stateFilter !== 'all' && t.state !== stateFilter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, stateFilter]);

  const stateFilterLabel =
    STATE_FILTER_OPTIONS.find((o) => o.value === stateFilter)?.label ?? 'All states';

  return (
    <Page>
      <PageHeader>
        <PageHeader.Breadcrumb>
          <Breadcrumb>
            <Breadcrumb.Item>Superadmin</Breadcrumb.Item>
            <Breadcrumb.Item current>Tenants</Breadcrumb.Item>
          </Breadcrumb>
        </PageHeader.Breadcrumb>
        <PageHeader.Title>
          <Cluster gap="sm" align="center">
            <span>Tenants</span>
            <Badge tone="warning" size="sm">
              Superadmin
            </Badge>
          </Cluster>
        </PageHeader.Title>
        <PageHeader.Meta>
          <Text size="sm" tone="muted">
            {rows.length} {rows.length === 1 ? 'tenant' : 'tenants'}
          </Text>
        </PageHeader.Meta>
        <PageHeader.Actions>
          <Cluster gap="sm">
            <Tooltip content="Export coming soon">
              <Button variant="secondary" aria-disabled onClick={(e) => e.preventDefault()}>
                <Download size={14} /> Export CSV
              </Button>
            </Tooltip>
            <Button>
              <Plus size={14} /> New tenant
            </Button>
          </Cluster>
        </PageHeader.Actions>
      </PageHeader>

      <Card padding="sm">
        <Cluster justify="between" align="center" gap="md" wrap={false}>
          <Input
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Cluster gap="sm" wrap={false}>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="secondary" size="sm">
                  State: {stateFilterLabel} <ChevronDown size={12} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.RadioGroup
                  value={stateFilter}
                  onValueChange={(v) => setStateFilter(v as TenantState | 'all')}
                >
                  {STATE_FILTER_OPTIONS.map((o) => (
                    <DropdownMenu.RadioItem key={o.value} value={o.value}>
                      {o.label}
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="secondary" size="sm">
                  Sort: Last active <ChevronDown size={12} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item>Last active</DropdownMenu.Item>
                <DropdownMenu.Item>Name (A→Z)</DropdownMenu.Item>
                <DropdownMenu.Item>Created (newest)</DropdownMenu.Item>
                <DropdownMenu.Item>Members</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
        </Cluster>
      </Card>

      <Card padding="none">
        {rows.length === 0 ? (
          <EmptyState
            title="No tenants match your filters"
            description="Try clearing the search or switching the state filter."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStateFilter('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Tenant</Table.HeaderCell>
                <Table.HeaderCell>State</Table.HeaderCell>
                <Table.HeaderCell align="end">Members</Table.HeaderCell>
                <Table.HeaderCell align="end">Invites</Table.HeaderCell>
                <Table.HeaderCell>Last active</Table.HeaderCell>
                <Table.HeaderCell>App version</Table.HeaderCell>
                <Table.HeaderCell>Created</Table.HeaderCell>
                <Table.HeaderCell align="end" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((t) => {
                const actions = tenantActions(t.state);
                const stateBadge = (
                  <Badge tone={stateTone[t.state]} size="sm">
                    {stateLabel[t.state]}
                  </Badge>
                );
                return (
                  <Table.Row key={t.id}>
                    <Table.Cell>
                      <PersonDisplay size="sm">
                        <PersonDisplay.Avatar name={t.name} />
                        <PersonDisplay.Name>{t.name}</PersonDisplay.Name>
                        <PersonDisplay.Description>
                          <Code>{t.slug}</Code>
                        </PersonDisplay.Description>
                      </PersonDisplay>
                    </Table.Cell>
                    <Table.Cell>
                      {t.stateReason ? (
                        <Tooltip content={t.stateReason}>{stateBadge}</Tooltip>
                      ) : (
                        stateBadge
                      )}
                    </Table.Cell>
                    <Table.Cell align="end">
                      {t.membersCount === 0 ? (
                        <Text size="sm" tone="muted">
                          0
                        </Text>
                      ) : (
                        <Text size="sm">{t.membersCount}</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell align="end">
                      {t.pendingInvitesCount === 0 ? (
                        <Text size="sm" tone="muted">
                          —
                        </Text>
                      ) : (
                        <Badge tone="info" size="sm">
                          {t.pendingInvitesCount}
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="sm" tone={t.lastMemberActiveAt ? 'default' : 'muted'}>
                        {relativeTime(t.lastMemberActiveAt)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {t.appVersion ? (
                        <Tooltip
                          content={
                            t.lastMigrationAt
                              ? `Last migration ${shortDate(t.lastMigrationAt)}`
                              : 'No migration history'
                          }
                        >
                          <Code>{t.appVersion}</Code>
                        </Tooltip>
                      ) : (
                        <Text size="sm" tone="muted">
                          —
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="sm" tone="muted">
                        {shortDate(t.createdAt)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell align="end">
                      <DropdownMenu>
                        <DropdownMenu.Trigger>
                          <Button variant="ghost" size="sm" aria-label={`Actions for ${t.name}`}>
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          {actions.map((a) => (
                            <DropdownMenu.Item
                              key={a}
                              destructive={a === 'suspend' || a === 'cancel'}
                            >
                              {actionLabel[a]}
                            </DropdownMenu.Item>
                          ))}
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </Card>

      <Cluster justify="between" align="center">
        <Text size="sm" tone="muted">
          Showing 1–{rows.length} of 84 tenants
        </Text>
        <Pagination currentPage={1} totalPages={4} onPageChange={() => undefined} />
      </Cluster>

      <CrossLinks kind="mockup" slug="tenants" />
    </Page>
  );
}
```

If `PageHeader.Breadcrumb`, `EmptyState`, `Pagination`, or any other primitive used here is missing or its API differs, ADAPT to the actual API rather than inventing. Read the relevant `Component.tsx` first if uncertain.

**Verify by reading primitive APIs** before writing:

- `packages/design-system/src/components/PageHeader/PageHeader.tsx` — confirm slot names (`Breadcrumb`, `Title`, `Meta`, `Actions`).
- `packages/design-system/src/components/Breadcrumb/Breadcrumb.tsx` — confirm `<Breadcrumb.Item current>` syntax.
- `packages/design-system/src/components/Table/Table.tsx` — confirm `<Table.Cell align="end">` exists; if not, the spec's "right-align" requirement uses a different prop (`textAlign`, `justifyContent`, or a Cluster wrapper).
- `packages/design-system/src/components/EmptyState/EmptyState.tsx` — confirm `action` slot.
- `packages/design-system/src/components/Pagination/Pagination.tsx` — confirm prop names.
- `packages/design-system/src/components/DropdownMenu/Item.tsx` — confirm `destructive` boolean.
- `packages/design-system/src/components/PersonDisplay/PersonDisplay.tsx` — confirm sub-component names.

If any prop name above differs, USE THE REAL ONE.

- [ ] **Step 2: Build + lint**

```bash
make build
make lint
```

Fix any compile errors against the real component APIs.

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/mockups/Tenants/Tenants.tsx
git commit -m "Mockup: superadmin Tenants list page"
```

---

## Task 3: Wire route + nav + registry + index

**Files:**

- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Route**

In `App.tsx`, import `Tenants` and add `<Route path="/mockups/tenants" element={<Tenants />} />` alongside the existing mockup routes.

- [ ] **Step 2: Sidebar**

In `AppShell.tsx`, in the `mockupItems` array, add an entry between `members` and `audit`:

```ts
{ to: '/mockups/tenants', label: 'Tenants', icon: Building2, end: false },
```

Import `Building2` from `lucide-react` (matches the "organizations" mental model).

- [ ] **Step 3: Registry**

In `registry.ts`, append a new `MockupEntry` after the audit entry:

```ts
{
  slug: 'tenants',
  title: 'Tenants',
  path: '/mockups/tenants',
  blurb: 'Superadmin list of platform tenants — state, members, app version, row actions.',
  usesComponents: [
    'Badge',
    'Breadcrumb',
    'Button',
    'Card',
    'Cluster',
    'Code',
    'DropdownMenu',
    'EmptyState',
    'Input',
    'Page',
    'PageHeader',
    'Pagination',
    'PersonDisplay',
    'Stack',
    'Table',
    'Text',
    'Title',
    'Tooltip',
  ],
},
```

`MockupsIndex.tsx` renders from the registry — no edit needed there.

- [ ] **Step 4: Build + lint + smoke**

```bash
make build
make lint
make up   # smoke in browser at http://localhost:8080/mockups/tenants
```

Walk through: page renders, search filters rows, state dropdown filters rows, EmptyState appears when filters exclude everything, row context menu shows state-appropriate actions, tooltips fire on failed/suspended badges.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "Mockup: wire Tenants route + nav + registry entry"
```

---

## Task 4: Playground Hard rule 7 review-fix cycle

The mockup touches `packages/playground/src/pages/mockups/**` and `registry.ts` — playground Hard rule 7 applies.

- [ ] **Step 1: Gates**

```bash
make test
make build
make lint
```

All must be green.

- [ ] **Step 2: Spawn fresh-context review-agent**

Brief on the 10 review categories (Rule 6 compliance, registry sync, imports, realism, a11y, keyboard, layout, coverage, state realism, TODO discipline). Ask for Critical / Important / Nice-to-have / verdict.

- [ ] **Step 3: Fix every Critical + Important finding**. Document deliberate skips.

- [ ] **Step 4: Re-run gates, re-spawn reviewer until `clean enough to stop`.**

---

## Task 5: Push + PR

- [ ] **Step 1: Final gate sweep**

```bash
make test
make build
make lint
```

- [ ] **Step 2: Push**

```bash
git push -u origin feat/mockup-tenants-list
```

Fix any prettier flag with `npx prettier --write …` + new commit.

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "Mockup: superadmin Tenants list page" --body "..."
```

Report URL.
