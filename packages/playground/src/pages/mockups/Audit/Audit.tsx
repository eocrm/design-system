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

      <Text tone="muted">
        Table is rendered in the next task. Active chips:{' '}
        {chips.length === 0 ? 'none' : chips.map((c) => `${c.label}=${c.value}`).join(', ')}.
      </Text>

      <CrossLinks kind="mockup" slug="audit" />
    </Stack>
  );
}

export type { Chip };
