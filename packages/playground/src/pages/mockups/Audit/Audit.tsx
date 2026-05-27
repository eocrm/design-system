import { useMemo, useState } from 'react';
import { ChevronDown, Download, Bookmark } from 'lucide-react';
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  Cluster,
  Code,
  DataTable,
  DefinitionList,
  Divider,
  FilterChip,
  OptionsPicker,
  Page,
  PageHeader,
  PersonDisplay,
  Stack,
  Text,
  Tooltip,
  useDataTable,
  type BadgeTone,
  type ColumnDef,
} from '@eocrm/design-system';
import {
  auditEntries,
  eventCatalog,
  eventColor,
  tenantOptions,
  type AuditEntry,
} from '../../../data/audit';
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
    <PersonDisplay size="sm">
      <PersonDisplay.Avatar name={a.name} />
      <PersonDisplay.Name>{a.name}</PersonDisplay.Name>
      <PersonDisplay.Description>{a.email}</PersonDisplay.Description>
      {i && (
        <PersonDisplay.Description>
          <Badge tone="warning" size="sm">
            impersonating {i.name}
          </Badge>
        </PersonDisplay.Description>
      )}
    </PersonDisplay>
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

function formatDiffValue(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.length}] ${JSON.stringify(v)}`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function isIdLikeContextKey(key: string): boolean {
  return key.endsWith('_id') || key === 'ip' || key === 'entity_id';
}

function ExpandedPanel({ entry }: { entry: AuditEntry }) {
  const actorName = entry.actor?.name ?? 'System';
  const entityType = entry.entity_type ?? 'entity';
  const entityId = entry.entity_id ?? '';

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text size="xs" tone="subtle" weight="semibold">
          Changes
        </Text>
        {entry.changes ? (
          <DefinitionList layout="horizontal" spacing="sm">
            {Object.entries(entry.changes).map(([field, { from, to }]) => (
              <DefinitionList.Item key={field}>
                <DefinitionList.Term>{field}</DefinitionList.Term>
                <DefinitionList.Description>
                  <Cluster gap="xs" align="center">
                    <Code tone="danger">{formatDiffValue(from)}</Code>
                    <Text size="sm" tone="muted" aria-hidden>
                      →
                    </Text>
                    <Code tone="accent">{formatDiffValue(to)}</Code>
                  </Cluster>
                </DefinitionList.Description>
              </DefinitionList.Item>
            ))}
          </DefinitionList>
        ) : (
          <Text size="sm" tone="muted">
            No field changes recorded.
          </Text>
        )}
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="xs" tone="subtle" weight="semibold">
          Context
        </Text>
        {Object.keys(entry.context).length === 0 ? (
          <Text size="sm" tone="muted">
            No additional context.
          </Text>
        ) : (
          <DefinitionList layout="horizontal" spacing="sm">
            {Object.entries(entry.context).map(([key, value]) => {
              const renderAsCode =
                isIdLikeContextKey(key) ||
                (typeof value === 'string' && /^[a-z0-9_]+$/i.test(value) && value.length > 12);
              return (
                <DefinitionList.Item key={key}>
                  <DefinitionList.Term>{key}</DefinitionList.Term>
                  <DefinitionList.Description>
                    {renderAsCode ? (
                      <Code>{String(value)}</Code>
                    ) : (
                      <Text size="sm">{String(value)}</Text>
                    )}
                  </DefinitionList.Description>
                </DefinitionList.Item>
              );
            })}
          </DefinitionList>
        )}
      </Stack>

      <Divider />

      {/*
        Filter-mutation actions ("show me all events by X") are Buttons,
        not Links — Link is for navigation. In production these would
        dispatch a setFilter() call; here they're no-ops.
      */}
      <ButtonGroup size="sm" aria-label="Forensic actions">
        <Button variant="secondary" onClick={() => {}}>
          See all by {actorName}
        </Button>
        {entry.entity_type && (
          <Button variant="secondary" onClick={() => {}}>
            See all on {entityType}
          </Button>
        )}
        {entityId && (
          <Button variant="secondary" onClick={() => {}}>
            See all on {entityId}
          </Button>
        )}
      </ButtonGroup>
    </Stack>
  );
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
          <Badge size="sm" color={eventColor(r.event)}>
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

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const instance = useDataTable<AuditEntry>({
    data: auditEntries,
    columns,
    getRowId: (r) => r.id,
    renderExpandedRow: (row) => <ExpandedPanel entry={row} />,
    expandedRows,
    // Single-expand: closing the previous row when a new one opens reads as
    // "drill into one event at a time" — keeps the surface focused and avoids
    // a stack of expanded panels obscuring the rest of the table.
    onExpandedRowsChange: (next) => {
      const openIds = Object.entries(next)
        .filter(([, open]) => open)
        .map(([id]) => id);
      const last = openIds[openIds.length - 1];
      setExpandedRows(last ? { [last]: true } : {});
    },
  });

  const [selectedEvents, setSelectedEvents] = useState<string[]>(['role.assigned']);
  const [selectedTenant, setSelectedTenant] = useState<string | null>('acme');

  function removeChip(key: ChipKey) {
    setChips((prev) => prev.filter((c) => c.key !== key));
  }

  return (
    <Page>
      <PageHeader>
        <PageHeader.Title>Audit log</PageHeader.Title>
        <PageHeader.Meta>
          <Text size="sm" tone="muted">
            284+ events
          </Text>
        </PageHeader.Meta>
        <PageHeader.Actions>
          <Cluster gap="sm">
            {/*
              aria-disabled (not disabled) so Tooltip's pointer/focus events
              still fire — `disabled` swallows them and the "coming soon" copy
              would never surface (anti-pattern noted in Tooltip's JSDoc).
            */}
            <Tooltip content="Export coming soon">
              <Button
                variant="secondary"
                size="sm"
                aria-disabled
                onClick={(e) => e.preventDefault()}
              >
                <Download size={14} /> Export CSV
              </Button>
            </Tooltip>
            <Tooltip content="Saved views coming soon">
              <Button
                variant="secondary"
                size="sm"
                aria-disabled
                onClick={(e) => e.preventDefault()}
              >
                <Bookmark size={14} /> Saved views
              </Button>
            </Tooltip>
          </Cluster>
        </PageHeader.Actions>
      </PageHeader>

      <Cluster gap="sm" wrap>
        <OptionsPicker selected={selectedEvents} onApply={setSelectedEvents}>
          <OptionsPicker.Trigger>
            <Button variant="secondary" size="sm">
              <Badge tone="info" dot="start" size="sm" />
              Event ({selectedEvents.length})
              <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter events" groups={eventCatalog} />
        </OptionsPicker>

        <OptionsPicker mode="single" selected={selectedTenant} onApply={setSelectedTenant}>
          <OptionsPicker.Trigger>
            <Button variant="secondary" size="sm">
              <Badge tone="info" dot="start" size="sm" />
              Tenant{selectedTenant ? `: ${selectedTenant}` : ''}
              <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter tenant" options={tenantOptions} />
        </OptionsPicker>

        <Button variant="secondary" size="sm">
          Last 7 days <ChevronDown size={14} />
        </Button>
      </Cluster>

      {chips.length > 0 && (
        <Cluster gap="xs" align="center" wrap>
          {chips.map((c) => (
            <FilterChip
              key={c.key}
              onDismiss={() => removeChip(c.key)}
              dismissLabel={`Remove ${c.label}: ${c.value} filter`}
            >
              <FilterChip.Label>{c.label}</FilterChip.Label>
              <FilterChip.Value tone={c.tone === 'neutral' ? undefined : c.tone}>
                {c.value}
              </FilterChip.Value>
            </FilterChip>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setChips([])}>
            Clear all
          </Button>
        </Cluster>
      )}

      <Card padding="none">
        <DataTable instance={instance} density="dense" aria-label="Audit events" />
      </Card>

      <Cluster justify="between" align="center" gap="sm">
        <Text size="sm" tone="muted">
          Showing {auditEntries.length} of 284+ events
        </Text>
        <Button variant="secondary" size="sm">
          Load more
        </Button>
      </Cluster>

      <CrossLinks kind="mockup" slug="audit" />
    </Page>
  );
}

export type { Chip };
