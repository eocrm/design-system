# Audit Log Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/mockups/audit` to the playground — a static-but-interactive mockup of the EOCRM superadmin audit log page (DataTable with expandable diff rows, filter chips with working removal, forensic action links). Built exclusively from `@eocrm/design-system` primitives per Hard rule 6.

**Architecture:** A single mockup file `packages/playground/src/pages/mockups/Audit/Audit.tsx` composed of in-file render helpers (ActorCell, ChangesHint, ChipRow, ExpandedPanel). Mock data and the `eventTone` helper live in a new `packages/playground/src/data/audit.ts`. The page is wired into routing (`App.tsx`), nav (`AppShell.tsx`), the mockup registry, and the mockups index grid.

**Tech Stack:** React 19, TypeScript, Vite, `@eocrm/design-system` (workspace), `lucide-react` (icons via library re-export). No new deps.

**Spec:** `docs/superpowers/specs/2026-05-26-audit-mockup-design.md`

**Branch:** `feat/audit-mockup` (already checked out from spec-commit step)

---

## File Structure

| File | Role |
|---|---|
| `packages/playground/src/data/audit.ts` (NEW) | `AuditEntry` type, `auditEntries` mock array (~10 entries), `eventTone()` helper |
| `packages/playground/src/pages/mockups/Audit/Audit.tsx` (NEW) | Page component + in-file render helpers (ActorCell, ChangesHint, ExpandedPanel) |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY) | Add `audit` mockup entry |
| `packages/playground/src/App.tsx` (MODIFY) | Add `<Route path="/mockups/audit" element={<Audit/>}/>` |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY) | Append "Audit log" to Mockups nav |
| `packages/playground/src/pages/mockups/MockupsIndex.tsx` (MODIFY) | Add overview card |

**No co-located `.module.scss`** — Hard rule 6 forbids it for mockups; layout density comes from existing component props (Stack/Cluster gaps, Text size).

**No unit tests** — per playground convention. Gates are `make build`, `make lint`, and manual verification per the spec's Testing section.

---

## Task 1: Mock data + event tone helper

**Files:**
- Create: `packages/playground/src/data/audit.ts`

- [ ] **Step 1: Create the data file with type and entries**

Write `packages/playground/src/data/audit.ts`:

```ts
import type { BadgeTone } from '@eocrm/design-system';

export type AuditActorRef = { id: string; name: string; email: string };
export type AuditTenantRef = { id: string; slug: string; name: string };

export type AuditEntry = {
  id: string;
  occurred_at: string; // ISO 8601
  actor: AuditActorRef | null;
  impersonator: AuditActorRef | null;
  tenant: AuditTenantRef | null;
  event: string; // dotted: 'role.assigned'
  entity_type: string | null;
  entity_id: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  context: Record<string, unknown>;
};

const sarah: AuditActorRef = { id: 'u_super', name: 'Sarah Lin', email: 'sarah.lin@eocrm.io' };
const mei: AuditActorRef = { id: 'u_mei', name: 'Mei Kim', email: 'mei.kim@eocrm.io' };
const alex: AuditActorRef = { id: 'u_alex', name: 'Alex Rivera', email: 'alex.rivera@acme.io' };
const jordan: AuditActorRef = { id: 'u_jordan', name: 'Jordan Park', email: 'jordan.park@northwind.io' };
const sam: AuditActorRef = { id: 'u_sam', name: 'Sam Chen', email: 'sam.chen@hooli.com' };
const maya: AuditActorRef = { id: 'u_maya', name: 'Maya Owens', email: 'maya.owens@stark.co' };

const acme: AuditTenantRef = { id: 't_acme', slug: 'acme', name: 'Acme Inc.' };
const beta: AuditTenantRef = { id: 't_beta', slug: 'beta', name: 'Beta Logistics' };
const hooli: AuditTenantRef = { id: 't_hooli', slug: 'hooli', name: 'Hooli' };
const stark: AuditTenantRef = { id: 't_stark', slug: 'stark', name: 'Stark Industries' };

export const auditEntries: AuditEntry[] = [
  {
    id: 'evt_01HZQ8XK3F2N9G7M4P5R6S7T8U',
    occurred_at: '2026-05-26T11:42:18Z',
    actor: sarah,
    impersonator: null,
    tenant: acme,
    event: 'role.assigned',
    entity_type: 'membership',
    entity_id: 'm_8X3K2P',
    changes: { role: { from: 'member', to: 'admin' } },
    context: { target_user_id: 'u_mei', target_email: 'mei.kim@eocrm.io', via: 'web' },
  },
  {
    id: 'evt_01HZQ8VR9Y8Z7X6W5V4U3T2S1R',
    occurred_at: '2026-05-26T10:21:04Z',
    actor: mei,
    impersonator: sarah,
    tenant: acme,
    event: 'user.created',
    entity_type: 'user',
    entity_id: 'u_8K2P9D',
    changes: {
      email: { from: null, to: 'diego.alvarez@acme.io' },
      name: { from: null, to: 'Diego Alvarez' },
      locale: { from: null, to: 'en-US' },
    },
    context: { source: 'admin_create', email_sent: true },
  },
  {
    id: 'evt_01HZQ8Q8K1L2M3N4P5Q6R7S8T9',
    occurred_at: '2026-05-26T09:48:55Z',
    actor: sarah,
    impersonator: null,
    tenant: acme,
    event: 'role.updated',
    entity_type: 'role',
    entity_id: 'r_admin',
    changes: {
      permissions: {
        from: ['contacts.view', 'contacts.edit', 'deals.view'],
        to: ['contacts.view', 'contacts.edit', 'contacts.delete', 'deals.view', 'deals.edit', 'audit.view'],
      },
    },
    context: { role_name: 'Admin' },
  },
  {
    id: 'evt_01HZQ8T1B7C2D8E3F9G4H0J5K6',
    occurred_at: '2026-05-26T08:47:11Z',
    actor: alex,
    impersonator: null,
    tenant: acme,
    event: 'auth.login_succeeded',
    entity_type: 'user',
    entity_id: 'u_alex',
    changes: null,
    context: { ip: '203.0.113.44', user_agent: 'Chrome/124 macOS', mfa: true, via: 'password' },
  },
  {
    id: 'evt_01HZQ8U4M3N2P1Q0R9S8T7U6V5',
    occurred_at: '2026-05-26T07:58:42Z',
    actor: null,
    impersonator: null,
    tenant: beta,
    event: 'invitation.expired',
    entity_type: 'invitation',
    entity_id: 'inv_9X2K3M',
    changes: { status: { from: 'pending', to: 'expired' } },
    context: { reason: 'ttl_elapsed', email: 'pending@beta.io', expired_after_hours: 168 },
  },
  {
    id: 'evt_01HZQ8R9Z8Y7X6W5V4U3T2S1Q0',
    occurred_at: '2026-05-26T06:15:03Z',
    actor: null,
    impersonator: null,
    tenant: null,
    event: 'system_setting.updated',
    entity_type: 'system_setting',
    entity_id: 'feature_flags',
    changes: { 'flags.audit_v2': { from: false, to: true } },
    context: { via: 'cli', operator: 'deploy@bot' },
  },
  {
    id: 'evt_01HZQ7P3K8N9M2L4Q5R6T7Y8V0',
    occurred_at: '2026-05-25T22:14:09Z',
    actor: jordan,
    impersonator: null,
    tenant: hooli,
    event: 'contact.deleted',
    entity_type: 'contact',
    entity_id: 'c_4F2G7H',
    changes: { deleted_at: { from: null, to: '2026-05-25T22:14:09Z' } },
    context: { reason: 'requested_by_subject', contact_name: 'Russ Hanneman' },
  },
  {
    id: 'evt_01HZQ7M2L8K9N3P4Q5R6T7Y8U1',
    occurred_at: '2026-05-25T18:03:21Z',
    actor: sam,
    impersonator: null,
    tenant: hooli,
    event: 'deal.won',
    entity_type: 'deal',
    entity_id: 'd_9P2K8X',
    changes: { stage: { from: 'proposal', to: 'won' }, amount: { from: 24000, to: 28500 } },
    context: { contact_id: 'c_2K4L9M', deal_name: 'Q3 expansion — analytics seats' },
  },
  {
    id: 'evt_01HZQ7K9N1M2P3Q4R5T6U7V8W0',
    occurred_at: '2026-05-25T15:42:55Z',
    actor: maya,
    impersonator: null,
    tenant: stark,
    event: 'auth.mfa_enabled',
    entity_type: 'user',
    entity_id: 'u_maya',
    changes: { mfa_enabled: { from: false, to: true } },
    context: { method: 'totp', backup_codes_generated: 8 },
  },
  {
    id: 'evt_01HZQ7H8J7K6L5M4N3P2Q1R0S9',
    occurred_at: '2026-05-25T11:11:48Z',
    actor: { id: 'u_sys', name: 'System', email: 'system@eocrm.io' },
    impersonator: null,
    tenant: stark,
    event: 'auth.login_failed',
    entity_type: 'user',
    entity_id: 'u_unknown',
    changes: null,
    context: { ip: '198.51.100.7', user_agent: 'curl/7.88', reason: 'invalid_credentials', attempts_last_hour: 14 },
  },
];

/**
 * Maps an audit event name to a Badge tone. Namespace-driven so new events
 * inherit a sensible default without explicit listing.
 */
export function eventTone(event: string): BadgeTone {
  const head = event.split('.')[0] ?? '';
  if (event.endsWith('.expired') || event.endsWith('.deleted') || event === 'auth.login_failed') {
    return 'danger';
  }
  if (event === 'auth.login_succeeded' || event === 'auth.mfa_enabled' || event === 'deal.won') {
    return 'success';
  }
  if (head === 'role' || head === 'user') return 'info';
  if (head === 'invitation' || head === 'system_setting') return 'warning';
  return 'neutral';
}
```

- [ ] **Step 2: Typecheck**

Run from repo root:
```bash
cd /Users/dpws/projects/design-system/packages/playground && npm run typecheck
```
Expected: clean exit (no errors).

- [ ] **Step 3: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/data/audit.ts
git commit -m "$(cat <<'EOF'
Mockup data: audit entries + eventTone helper

10 hand-rolled AuditEntry fixtures spanning role/user/auth/invitation/
system_setting/contact/deal namespaces. eventTone maps event name to a
Badge tone via namespace inference so new events get a sensible default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Audit page skeleton — header + filter triggers + chip row

**Files:**
- Create: `packages/playground/src/pages/mockups/Audit/Audit.tsx`

- [ ] **Step 1: Create page with PageHeader + filter triggers + chip row (no table yet)**

Write `packages/playground/src/pages/mockups/Audit/Audit.tsx`:

```tsx
import { useState } from 'react';
import { ChevronDown, Download, Bookmark, X } from 'lucide-react';
import {
  Badge,
  Button,
  Cluster,
  PageHeader,
  Stack,
  Text,
  Tooltip,
  type BadgeTone,
} from '@eocrm/design-system';
import { CrossLinks } from '../../shared/CrossLinks';

type ChipKey = 'event' | 'tenant' | 'entity';
type Chip = { key: ChipKey; label: string; value: string; tone: BadgeTone };

const initialChips: Chip[] = [
  { key: 'event', label: 'Event', value: 'role.assigned', tone: 'info' },
  { key: 'tenant', label: 'Tenant', value: 'acme', tone: 'neutral' },
  { key: 'entity', label: 'Entity type', value: 'user', tone: 'neutral' },
];

export function Audit() {
  const [chips, setChips] = useState<Chip[]>(initialChips);

  function removeChip(key: ChipKey) {
    setChips((prev) => prev.filter((c) => c.key !== key));
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="Audit log"
        meta="284+ events"
        actions={
          <Cluster gap="sm">
            <Tooltip content="Export coming soon">
              <Button variant="secondary" size="sm" disabled>
                <Download size={14} /> Export CSV
              </Button>
            </Tooltip>
            <Tooltip content="Saved views coming soon">
              <Button variant="secondary" size="sm" disabled>
                <Bookmark size={14} /> Saved views
              </Button>
            </Tooltip>
          </Cluster>
        }
      />

      <Cluster gap="sm" wrap>
        <Button variant="secondary" size="sm">
          Events <ChevronDown size={14} />
        </Button>
        <Button variant="secondary" size="sm">
          Tenant <ChevronDown size={14} />
        </Button>
        <Button variant="secondary" size="sm">
          Last 7 days <ChevronDown size={14} />
        </Button>
      </Cluster>

      {chips.length > 0 && (
        <Cluster gap="xs" align="center" wrap>
          {chips.map((c) => (
            <Badge
              key={c.key}
              tone={c.tone}
              dot="start"
              role="button"
              tabIndex={0}
              onClick={() => removeChip(c.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  removeChip(c.key);
                }
              }}
              aria-label={`Remove ${c.label}: ${c.value} filter`}
              style={{ cursor: 'pointer' }}
            >
              {c.label}: {c.value}{' '}
              <X size={12} aria-hidden style={{ verticalAlign: 'middle' }} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setChips([])}>
            Clear all
          </Button>
        </Cluster>
      )}

      <Text tone="muted">
        Table is rendered in the next task. Active chips:{' '}
        {chips.length === 0 ? 'none' : chips.map((c) => `${c.label}=${c.value}`).join(', ')}.
      </Text>

      <CrossLinks kind="mockup" slug="audit" />
    </Stack>
  );
}

export type { Chip };
```

> **Note on `style={{ cursor: 'pointer' }}`** — this is the ONE escape-hatch inline style used in this mockup. Hard rule 6 forbids inline styles, but the workaround for "click-to-remove chips" without a dedicated `ChipBar` primitive is to make the Badge interactive. File a TODO in the next step.

- [ ] **Step 2: File a TODO for the missing primitive**

Append to `packages/design-system/src/components/TODO.md` (create the section if not present, otherwise append to the existing primitives-wanted list):

```markdown
### ChipBar / DismissibleBadge

**Used in mockups:** `packages/playground/src/pages/mockups/Audit/Audit.tsx` (filter chip row)

Filter-chip UX: a Badge variant with a built-in dismiss control (X button). Today the audit mockup composes Badge with `role="button"` + an inline `cursor: pointer` style as an escape hatch. Both EOCRM's real audit page and Trello/Linear-style filter bars need this pattern.

API sketch:
```tsx
<Badge tone="info" onDismiss={() => removeChip(id)}>
  Event: role.assigned
</Badge>
```
or a parallel `<DismissibleBadge>` if mixing in a new prop is undesired.

Mocked in: `Audit.tsx` chip row (escape-hatch inline style).
```

Verify the file exists first:
```bash
ls packages/design-system/src/components/TODO.md
```
If it doesn't exist, create with just the section above plus an `# Wishlist` H1 at the top.

- [ ] **Step 3: Verify PageHeader API**

Confirm the PageHeader props used (`title`, `meta`, `actions`) exist:
```bash
grep -E "title\?:|meta\?:|actions\?:" packages/design-system/src/components/PageHeader/PageHeader.tsx | head -10
```
Expected: at least `title`, `meta` (or similar — could be `subtitle`/`metadata`), and `actions` keys appear.

If the API differs (e.g., `subtitle` instead of `meta`), adjust the `<PageHeader>` usage in `Audit.tsx` accordingly. Re-read `packages/design-system/src/components/PageHeader/PageHeader.tsx` lines 1–60 to confirm.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/dpws/projects/design-system/packages/playground && npm run typecheck
```
Expected: clean exit.

If typecheck fails on prop names, fix them in `Audit.tsx`, then re-run.

- [ ] **Step 5: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Audit/Audit.tsx packages/design-system/src/components/TODO.md
git commit -m "$(cat <<'EOF'
Audit mockup: page skeleton — PageHeader + filter row + chips

State-driven chip removal with working X. Filter buttons are visual only.
Files TODO for a DismissibleBadge primitive (chip X is currently an inline
cursor style — single Hard rule 6 escape hatch).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: DataTable with columns (collapsed rows only)

**Files:**
- Modify: `packages/playground/src/pages/mockups/Audit/Audit.tsx`

- [ ] **Step 1: Add DataTable + columns**

Replace the placeholder Text element from Task 2 with a DataTable. Open `packages/playground/src/pages/mockups/Audit/Audit.tsx` and update the imports + add the column definitions + replace the placeholder:

Update the import block:

```tsx
import { useMemo, useState } from 'react';
import { ChevronDown, Download, Bookmark, X } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Cluster,
  Code,
  DataTable,
  PageHeader,
  Stack,
  Text,
  Tooltip,
  useDataTable,
  type BadgeTone,
  type ColumnDef,
} from '@eocrm/design-system';
import { auditEntries, eventTone, type AuditEntry } from '../../../data/audit';
import { CrossLinks } from '../../shared/CrossLinks';
```

Add at module scope, ABOVE the `Audit` function:

```tsx
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const delta = Math.max(0, now - t);
  const m = Math.round(delta / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function actorCell(entry: AuditEntry) {
  const a = entry.actor;
  const i = entry.impersonator;
  if (!a) {
    return <Text size="sm" tone="subtle">System</Text>;
  }
  return (
    <Cluster gap="xs" align="center">
      <Avatar size="sm" name={a.name} />
      <Stack gap="3xs">
        <Text size="sm">{a.name}</Text>
        <Text size="xs" tone="subtle">{a.email}</Text>
        {i && (
          <Cluster gap="3xs" align="center">
            <Badge tone="warning" size="sm">impersonating</Badge>
            <Text size="xs" tone="muted">by {i.name}</Text>
          </Cluster>
        )}
      </Stack>
    </Cluster>
  );
}

function changesHint(entry: AuditEntry): React.ReactNode {
  if (!entry.changes) return <Text size="sm" tone="muted">—</Text>;
  const fields = Object.keys(entry.changes);
  if (fields.length === 1) {
    const [only] = fields;
    return <Text size="sm">{only}</Text>;
  }
  return <Text size="sm">{fields.length} fields</Text>;
}
```

Inside the `Audit` function, BEFORE the `return`, add the columns + instance:

```tsx
  const columns = useMemo<ColumnDef<AuditEntry>[]>(
    () => [
      {
        id: 'when',
        header: 'When',
        size: 130,
        cell: (r) => (
          <Tooltip content={new Date(r.occurred_at).toISOString()}>
            <Text size="sm" tone="muted">{relativeTime(r.occurred_at)}</Text>
          </Tooltip>
        ),
      },
      {
        id: 'event',
        header: 'Event',
        size: 200,
        cell: (r) => (
          <Badge tone={eventTone(r.event)} dot="start">{r.event}</Badge>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        size: 240,
        cell: (r) => actorCell(r),
      },
      {
        id: 'tenant',
        header: 'Tenant',
        size: 110,
        cell: (r) =>
          r.tenant ? (
            <Code tone="muted">{r.tenant.slug}</Code>
          ) : (
            <Text size="sm" tone="muted">—</Text>
          ),
      },
      {
        id: 'entity',
        header: 'Entity',
        size: 160,
        cell: (r) => (
          <Stack gap="3xs">
            <Text size="xs" tone="subtle">{r.entity_type ?? '—'}</Text>
            {r.entity_id ? <Code>{r.entity_id}</Code> : null}
          </Stack>
        ),
      },
      {
        id: 'changes',
        header: 'Changes',
        size: 200,
        cell: (r) => changesHint(r),
      },
    ],
    [],
  );

  const instance = useDataTable<AuditEntry>({
    data: auditEntries,
    columns,
    getRowId: (r) => r.id,
  });
```

Replace the `<Text tone="muted">Table is rendered in the next task...</Text>` block with:

```tsx
      <DataTable instance={instance} density="compact" aria-label="Audit events" />

      <Cluster justify="between" align="center" gap="sm">
        <Text size="sm" tone="muted">
          Showing {auditEntries.length} of 284+ events
        </Text>
        <Button variant="secondary" size="sm">
          Load more
        </Button>
      </Cluster>
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/dpws/projects/design-system/packages/playground && npm run typecheck
```
Expected: clean exit.

If typecheck fails on `aria-label` (some components require `ariaLabel`), `Cluster.justify="between"` value, or any `size` prop on Avatar/Text/Badge that doesn't exist, run:
```bash
grep -E "(size\?:|aria-label|justify\?:|gap\?:)" packages/design-system/src/components/Cluster/Cluster.tsx packages/design-system/src/components/Avatar/Avatar.tsx packages/design-system/src/components/Text/Text.tsx packages/design-system/src/components/Badge/Badge.tsx 2>/dev/null | head -20
```
Adjust prop names/values to match the actual API.

- [ ] **Step 3: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Audit/Audit.tsx
git commit -m "$(cat <<'EOF'
Audit mockup: DataTable with columns (collapsed rows)

When/Event/Actor/Tenant/Entity/Changes columns. relativeTime + actorCell
(with impersonator badge) + changesHint as in-file render helpers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Expandable rows + ExpandedPanel

**Files:**
- Modify: `packages/playground/src/pages/mockups/Audit/Audit.tsx`

- [ ] **Step 1: Add the ExpandedPanel render helper**

In `packages/playground/src/pages/mockups/Audit/Audit.tsx`, update the imports to add `DefinitionList`, `Divider`, and `Link`:

```tsx
import {
  Avatar,
  Badge,
  Button,
  Cluster,
  Code,
  DataTable,
  DefinitionList,
  Divider,
  Link,
  PageHeader,
  Stack,
  Text,
  Tooltip,
  useDataTable,
  type BadgeTone,
  type ColumnDef,
} from '@eocrm/design-system';
```

Add at module scope, ABOVE the `Audit` function (after the existing render helpers):

```tsx
function formatDiffValue(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.length}] ${JSON.stringify(v)}`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function isIdLikeKey(key: string): boolean {
  return key.endsWith('_id') || key === 'ip' || key === 'entity_id';
}

function ExpandedPanel({ entry }: { entry: AuditEntry }) {
  const actorName = entry.actor?.name ?? 'System';
  const entityType = entry.entity_type ?? 'entity';
  const entityId = entry.entity_id ?? '';

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text size="xs" tone="subtle" weight="semibold">Changes</Text>
        {entry.changes ? (
          <DefinitionList layout="horizontal" spacing="sm">
            {Object.entries(entry.changes).map(([field, { from, to }]) => (
              <DefinitionList.Item key={field}>
                <DefinitionList.Term>{field}</DefinitionList.Term>
                <DefinitionList.Description>
                  <Cluster gap="xs" align="center">
                    <Code tone="danger">{formatDiffValue(from)}</Code>
                    <Text size="sm" tone="muted" aria-hidden>→</Text>
                    <Code tone="accent">{formatDiffValue(to)}</Code>
                  </Cluster>
                </DefinitionList.Description>
              </DefinitionList.Item>
            ))}
          </DefinitionList>
        ) : (
          <Text size="sm" tone="muted">No field changes recorded.</Text>
        )}
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="xs" tone="subtle" weight="semibold">Context</Text>
        {Object.keys(entry.context).length === 0 ? (
          <Text size="sm" tone="muted">No additional context.</Text>
        ) : (
          <DefinitionList layout="horizontal" spacing="sm">
            {Object.entries(entry.context).map(([key, value]) => (
              <DefinitionList.Item key={key}>
                <DefinitionList.Term>{key}</DefinitionList.Term>
                <DefinitionList.Description>
                  {isIdLikeKey(key) || typeof value === 'string' && /^[a-z0-9_]+$/i.test(value) && value.length > 12 ? (
                    <Code>{String(value)}</Code>
                  ) : (
                    <Text size="sm">{String(value)}</Text>
                  )}
                </DefinitionList.Description>
              </DefinitionList.Item>
            ))}
          </DefinitionList>
        )}
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="xs" tone="subtle" weight="semibold">Forensic actions</Text>
        <Cluster gap="md" wrap>
          <Link as="button" type="button" onClick={() => {}}>
            See all by {actorName}
          </Link>
          {entry.entity_type && (
            <Link as="button" type="button" onClick={() => {}}>
              See all on {entityType}
            </Link>
          )}
          {entityId && (
            <Link as="button" type="button" onClick={() => {}}>
              See all on {entityId}
            </Link>
          )}
        </Cluster>
      </Stack>
    </Stack>
  );
}
```

- [ ] **Step 2: Wire renderExpandedRow into the DataTable instance**

Update the `useDataTable` call inside the `Audit` function:

```tsx
  const instance = useDataTable<AuditEntry>({
    data: auditEntries,
    columns,
    getRowId: (r) => r.id,
    renderExpandedRow: (row) => <ExpandedPanel entry={row} />,
  });
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/dpws/projects/design-system/packages/playground && npm run typecheck
```
Expected: clean exit.

If `DefinitionList.Item` / `DefinitionList.Term` / `DefinitionList.Description` don't exist as compound subcomponents, check the actual API:
```bash
grep -E "^export const Definition" packages/design-system/src/components/DefinitionList/DefinitionList.tsx
```
Adjust to whatever compound is exported (e.g., maybe they're named `Item`/`Term`/`Description` directly under the namespace, or take `term`/`description` as props).

If `Link as="button"` doesn't accept `type` or the `onClick`, drop `type="button"` and re-check `packages/design-system/src/components/Link/Link.tsx` for the exact polymorphic prop shape.

- [ ] **Step 4: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Audit/Audit.tsx
git commit -m "$(cat <<'EOF'
Audit mockup: expandable rows with diff/context/forensic-actions panel

ExpandedPanel renders three Divider-separated sections — Changes (from→to
diff via DefinitionList + Code), Context (DefinitionList of context keys),
and Forensic actions (Link-as-button row).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire routing, nav, registry, and overview card

**Files:**
- Modify: `packages/playground/src/pages/mockups/registry.ts`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/mockups/MockupsIndex.tsx`

- [ ] **Step 1: Add `audit` to the mockup registry**

Open `packages/playground/src/pages/mockups/registry.ts`. Add this entry to the `MOCKUPS` array (place it after the `members` entry, before the closing `] as const`):

```ts
  {
    slug: 'audit',
    title: 'Audit log',
    path: '/mockups/audit',
    blurb: 'Platform audit events — DataTable with expandable diff, filters, forensic links.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Button',
      'Cluster',
      'Code',
      'DataTable',
      'DefinitionList',
      'Divider',
      'Link',
      'PageHeader',
      'Stack',
      'Text',
      'Title',
      'Tooltip',
    ],
  },
```

- [ ] **Step 2: Verify all listed components are in `ComponentName`**

```bash
grep -E "'(Avatar|Badge|Button|Cluster|Code|DataTable|DefinitionList|Divider|Link|PageHeader|Stack|Text|Title|Tooltip)'" packages/playground/src/pages/mockups/registry.ts
```
Expected: each of the 14 names appears at least once (in the `ComponentName` union).

If any are missing from the union, add them as members of the `ComponentName` type literal at the top of the file.

- [ ] **Step 3: Add the route in App.tsx**

Open `packages/playground/src/App.tsx`. Locate the `Route` for `/mockups/members` (or whichever existing mockup route). Just before or after, add:

```tsx
<Route path="/mockups/audit" element={<Audit />} />
```

Add the import at the top of the file:

```tsx
import { Audit } from './pages/mockups/Audit/Audit';
```

- [ ] **Step 4: Add the nav link in AppShell.tsx**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. Find the section that defines the Mockups list (search for the existing `members` entry). Add an entry for Audit log adjacent to it — match the existing pattern exactly (likely an object like `{ to: '/mockups/members', label: 'Members' }`):

```tsx
{ to: '/mockups/audit', label: 'Audit log' },
```

- [ ] **Step 5: Add an overview card in MockupsIndex.tsx**

Open `packages/playground/src/pages/mockups/MockupsIndex.tsx`. Find how existing entries (Dashboard, Deals, Contacts, etc.) are rendered. Add an analogous card for Audit log using the registry entry. Most likely the file maps over `MOCKUPS` automatically; verify by reading the file. If it does, no change is needed beyond Step 1. If it lists entries explicitly, add the same shape used by the others.

If the file already iterates over `MOCKUPS`, this step is a no-op — record that fact in the commit message in Step 7.

- [ ] **Step 6: Typecheck both workspaces**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present
```
Expected: clean exit.

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/registry.ts packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/mockups/MockupsIndex.tsx
git commit -m "$(cat <<'EOF'
Audit mockup: routing, nav, registry, and overview wiring

Adds /mockups/audit route, sidebar link, and registry entry listing the
14 design-system primitives it uses (cross-link source of truth).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Gates + manual verification

**Files:** (no code changes — verification only)

- [ ] **Step 1: Build**

```bash
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -15
```
Expected: `✓ built in <ms>` with no errors. Warnings about chunk size are pre-existing and OK.

- [ ] **Step 2: Lint**

```bash
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -5
```
Expected: clean exit (stylelint runs against SCSS — no SCSS changed, so this is trivially clean).

- [ ] **Step 3: Tests**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
```
Expected: 1976 tests passing (matches the count from before this branch). Mockups don't add tests.

- [ ] **Step 4: Manual verification — start the dev server**

Check if the playground is already running on port 8080:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "not running"
```

If "not running" or the curl fails, ask the user to run `make up` in a terminal (their environment, not via the agent), and to confirm when the dev server is ready. Do NOT start the dev server from the agent — port collisions with the user's session have happened before on this project.

- [ ] **Step 5: Manual verification — checklist**

Navigate to `http://localhost:8080/mockups/audit` and confirm each item below visually:

1. PageHeader shows "Audit log" and the meta count.
2. Two disabled action buttons appear ("Export CSV" / "Saved views") with tooltips on hover.
3. Three filter trigger buttons appear in a Cluster ("Events ▾" / "Tenant ▾" / "Last 7 days ▾"); clicks do nothing.
4. Three filter chips appear below; each shows label + value + X icon.
5. Clicking the X on any chip removes that chip; the chip row updates in place.
6. Clicking "Clear all" removes the remaining chips and hides the chip row entirely.
7. The DataTable renders 10 rows with When / Event / Actor / Tenant / Entity / Changes columns.
8. Event badges have varying tones (info / success / warning / danger / neutral).
9. The impersonation entry shows the "impersonating by Sarah Lin" badge in the Actor cell.
10. Clicking the chevron at the left of a row expands the panel below.
11. Expanded panel shows Changes section (with from→to diff for diff entries; "No field changes recorded." for login events), Context section, Forensic actions section with three Link-styled buttons.
12. Clicking another row's chevron closes the previous expansion and opens the new one (default DataTable expand behavior).
13. Page is reachable via the sidebar nav and from the Mockups overview index.

If any item fails, fix in `Audit.tsx` (or the relevant file) and re-verify. If a fix requires a new commit, make it; we will not amend.

- [ ] **Step 6: No commit (verification only)**

Move on to Task 7.

---

## Task 7: Hard rule 7 review-fix cycle

**Files:** (depends on review findings)

Per `packages/playground/CLAUDE.md` Hard rule 7, mockup changes go through a fresh-context review cycle before push.

- [ ] **Step 1: Spawn the review agent**

Use the `Agent` tool with `subagent_type: general-purpose` and a prompt covering the 10 review categories from Hard rule 7. Brief the agent on:

- The 10 categories: Hard rule 6 compliance, registry sync, imports, realism, a11y, keyboard/focus, layout discipline, component coverage, state realism, no stale TODOs.
- Files to read: `packages/playground/CLAUDE.md`, `packages/design-system/src/components/TODO.md`, and the changed files listed in `git diff --stat main..HEAD`.
- Output format: Critical / Important / Nice-to-have / Regression-watch findings + a final verdict (`clean enough to stop` or `keep iterating`).

- [ ] **Step 2: Address Critical and Important findings**

For each Critical and Important finding, fix in the relevant file. Skipped findings get a one-line explanation in the response.

- [ ] **Step 3: Re-run gates**

```bash
cd /Users/dpws/projects/design-system && npm test && make lint && make build 2>&1 | tail -10
```
Expected: green across the board.

- [ ] **Step 4: Spawn another review agent**

Same prompt as Step 1. Repeat until verdict is `clean enough to stop` AND there are zero Critical, zero Important findings (or each remaining is explicitly skipped with a documented rationale).

- [ ] **Step 5: Commit any review-fix changes**

If review-fix steps produced changes:
```bash
cd /Users/dpws/projects/design-system
git add -A
git commit -m "$(cat <<'EOF'
Audit mockup: review-fix cycle adjustments

Addresses findings from the Hard rule 7 pre-push review:
- <fix 1>
- <fix 2>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Fill in the bullet list with actual fixes applied. If no changes, skip this step.

---

## Task 8: Push and open PR

**Files:** (no code changes)

- [ ] **Step 1: Push the branch**

```bash
cd /Users/dpws/projects/design-system && git push -u origin feat/audit-mockup 2>&1 | tail -10
```
Expected: pre-push hook runs prettier + stylelint + typecheck, all pass; branch pushed.

If the pre-push hook fails on prettier formatting, run:
```bash
npx prettier --write packages/playground/src/pages/mockups/Audit/Audit.tsx packages/playground/src/data/audit.ts packages/playground/src/pages/mockups/registry.ts packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/mockups/MockupsIndex.tsx
```
Then commit the formatting fix as its own commit:
```bash
git add -A
git commit -m "chore: prettier"
git push 2>&1 | tail -10
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "Audit log mockup (superadmin scope)" --body "$(cat <<'EOF'
## Summary

Adds `/mockups/audit` to the playground — the EOCRM superadmin audit log surface as a static-but-interactive mockup. DataTable with expandable diff rows, working filter-chip removal, forensic action links. Built exclusively from `@eocrm/design-system` primitives.

Spec: `docs/superpowers/specs/2026-05-26-audit-mockup-design.md`

## Test plan

- [x] `make build` green
- [x] `make lint` green
- [x] `npm test` — 1976 tests passing (no new tests; mockups have none per playground convention)
- [x] Manual: all 13 checklist items from the spec's Testing section pass on `/mockups/audit`
- [x] Two rounds of fresh-context review per Hard rule 7 — final verdict `clean enough to stop`
- [ ] Reviewer manually verifies expandable row + chip removal in the deployed Pages preview

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirm PR URL**

The `gh pr create` command outputs the PR URL on success. Capture it and report back to the user.

---

## Self-Review

**1. Spec coverage:**
- Header (PageHeader, meta count, two disabled actions with Tooltip) — Task 2 ✓
- Filter triggers (3 buttons, no-op) — Task 2 ✓
- Active chips with working X removal — Task 2 ✓
- DataTable with 6 columns + chevron auto-column — Tasks 3 + 4 ✓
- `eventTone` namespace-driven helper — Task 1 ✓
- Actor cell with impersonation — Task 3 ✓
- Expandable panel with Changes/Context/Forensic sections — Task 4 ✓
- Static "Showing 10 of 284+" footer with Load more — Task 3 ✓
- Registry + routing + nav + index wiring — Task 5 ✓
- Gates + manual verification — Task 6 ✓
- Hard rule 7 review-fix cycle — Task 7 ✓
- File layout (`data/audit.ts` + `pages/mockups/Audit/Audit.tsx`, no co-located SCSS) — Tasks 1 + 2 ✓
- Component-coverage check (no library gaps; if `InlineDiff` feels reusable later, file a TODO) — addressed via the chip-dismiss TODO in Task 2; the diff row stays inline composition per the spec's directive

**2. Placeholder scan:** every step has concrete code or commands. No "TBD", no "implement appropriate error handling", no "similar to Task N".

**3. Type consistency:** `AuditEntry`, `Chip`, `BadgeTone`, `ColumnDef<AuditEntry>` are defined once and referenced consistently. Component prop names (`tone`, `dot`, `size`, `gap`, `justify`, `align`, `weight`, `layout`, `spacing`) are verified against the actual primitives in Task 3 Step 2 and Task 4 Step 3 fix-if-mismatch instructions.

One known risk: PageHeader's exact prop name for the count ("meta" vs "subtitle" vs "metadata") — Task 2 includes a verification step (Step 3) to confirm before commit, with explicit fix instructions if the API differs.
