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

type ChipKey = 'event' | 'tenant' | 'entity';
type Chip = { key: ChipKey; label: string; value: string; tone: BadgeTone };

const initialChips: Chip[] = [
  { key: 'event', label: 'Event', value: 'role.assigned', tone: 'info' },
  { key: 'tenant', label: 'Tenant', value: 'acme', tone: 'neutral' },
  { key: 'entity', label: 'Entity type', value: 'user', tone: 'neutral' },
];

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
    return (
      <Text size="sm" tone="subtle">
        System
      </Text>
    );
  }
  return (
    <Cluster gap="xs" align="center">
      <Avatar size="sm" name={a.name} />
      <Stack gap="xs">
        <Text size="sm">{a.name}</Text>
        <Text size="xs" tone="subtle">
          {a.email}
        </Text>
        {i && (
          <Cluster gap="xs" align="center">
            <Badge tone="warning" size="sm">
              impersonating
            </Badge>
            <Text size="xs" tone="muted">
              by {i.name}
            </Text>
          </Cluster>
        )}
      </Stack>
    </Cluster>
  );
}

function changesHint(entry: AuditEntry) {
  if (!entry.changes)
    return (
      <Text size="sm" tone="muted">
        —
      </Text>
    );
  const fields = Object.keys(entry.changes);
  if (fields.length === 1) {
    return <Text size="sm">{fields[0]}</Text>;
  }
  return <Text size="sm">{fields.length} fields</Text>;
}

export function Audit() {
  const [chips, setChips] = useState<Chip[]>(initialChips);

  const columns = useMemo<ColumnDef<AuditEntry>[]>(
    () => [
      {
        id: 'when',
        header: 'When',
        size: 130,
        cell: (r) => (
          <Tooltip content={new Date(r.occurred_at).toISOString()}>
            <Text size="sm" tone="muted">
              {relativeTime(r.occurred_at)}
            </Text>
          </Tooltip>
        ),
      },
      {
        id: 'event',
        header: 'Event',
        size: 200,
        cell: (r) => (
          <Badge tone={eventTone(r.event)} dot="start">
            {r.event}
          </Badge>
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
            <Text size="sm" tone="muted">
              —
            </Text>
          ),
      },
      {
        id: 'entity',
        header: 'Entity',
        size: 160,
        cell: (r) => (
          <Stack gap="xs">
            <Text size="xs" tone="subtle">
              {r.entity_type ?? '—'}
            </Text>
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

  function removeChip(key: ChipKey) {
    setChips((prev) => prev.filter((c) => c.key !== key));
  }

  return (
    <Stack gap="lg">
      <PageHeader>
        <PageHeader.Title>Audit log</PageHeader.Title>
        <PageHeader.Meta>
          <Text size="sm" tone="muted">
            284+ events
          </Text>
        </PageHeader.Meta>
        <PageHeader.Actions>
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
        </PageHeader.Actions>
      </PageHeader>

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
            // TODO: replace inline cursor style when DismissibleBadge ships — see packages/design-system/src/components/TODO.md
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

      <DataTable instance={instance} density="dense" aria-label="Audit events" />

      <Cluster justify="between" align="center" gap="sm">
        <Text size="sm" tone="muted">
          Showing {auditEntries.length} of 284+ events
        </Text>
        <Button variant="secondary" size="sm">
          Load more
        </Button>
      </Cluster>

      <CrossLinks kind="mockup" slug="audit" />
    </Stack>
  );
}

export type { Chip };
