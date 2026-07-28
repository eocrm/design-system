import { useState } from 'react';
import {
  SortableGroup,
  Sortable,
  moveSortableItem,
  Stack,
  Cluster,
  Card,
  Text,
  Code,
} from '@eocrm/design-system';
import { GripVertical } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface Field {
  id: string;
  label: string;
}
const INITIAL: Record<string, Field[]> = {
  contact: [
    { id: 'first', label: 'First name' },
    { id: 'last', label: 'Last name' },
    { id: 'email', label: 'Email' },
  ],
  company: [
    { id: 'name', label: 'Company name' },
    { id: 'size', label: 'Headcount' },
  ],
  custom: [{ id: 'nps', label: 'NPS score' }],
};
const GROUP_LABELS: Record<string, string> = {
  contact: 'Contact',
  company: 'Company',
  custom: 'Custom',
};

export function SortableGroupDemo() {
  const [groups, setGroups] = useState<Record<string, Field[]>>(INITIAL);
  return (
    <DemoLayout
      name="SortableGroup"
      componentName="SortableGroup"
      description="Multi-container sortable — drag fields within a group AND between groups. Built on dnd-kit with a shared DragOverlay and a live cross-container handoff; apply onMove with the moveSortableItem helper. For a single list, use Sortable."
      files={getComponentFiles('SortableGroup')}
    >
      <Example
        title="Drag fields between groups"
        description="Grab a field's handle and drag it within its group to reorder, or across into another group. onMove fires during the drag (cross-container) and on drop; moveSortableItem applies it to the per-group state."
        code={`import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import {
  SortableGroup,
  Sortable,
  moveSortableItem,
  Stack,
  Cluster,
  Card,
  Text,
  Code,
} from '@eocrm/design-system';

interface Field {
  id: string;
  label: string;
}

const initial: Record<string, Field[]> = {
  contact: [
    { id: 'first', label: 'First name' },
    { id: 'last', label: 'Last name' },
    { id: 'email', label: 'Email' },
  ],
  company: [
    { id: 'name', label: 'Company name' },
    { id: 'size', label: 'Headcount' },
  ],
  custom: [{ id: 'nps', label: 'NPS score' }],
};

const groupLabels: Record<string, string> = {
  contact: 'Contact',
  company: 'Company',
  custom: 'Custom',
};

export function Demo() {
  const [groups, setGroups] = useState<Record<string, Field[]>>(initial);
  return (
    <Stack gap="md">
      <SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
        <Cluster gap="md" align="start">
          {Object.entries(groups).map(([gid, fields]) => (
            <Card key={gid} style={{ minWidth: 200, flex: 1 }}>
              <Stack gap="sm">
                <Text size="sm" weight="semibold">
                  {groupLabels[gid]}
                </Text>
                <SortableGroup.Container
                  id={gid}
                  items={fields.map((f) => f.id)}
                  aria-label={groupLabels[gid]}
                >
                  {fields.map((f) => (
                    <Sortable.Item key={f.id} id={f.id}>
                      <Cluster gap="sm" align="center">
                        <Sortable.Handle>
                          <GripVertical size={14} />
                        </Sortable.Handle>
                        <Text size="sm">{f.label}</Text>
                      </Cluster>
                    </Sortable.Item>
                  ))}
                </SortableGroup.Container>
              </Stack>
            </Card>
          ))}
        </Cluster>
      </SortableGroup>
      <Text size="sm" tone="muted">
        Order →{' '}
        <Code>
          {Object.entries(groups)
            .map(([g, f]) => \`\${g}: [\${f.map((x) => x.id).join(', ')}]\`)
            .join('  ·  ')}
        </Code>
      </Text>
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <SortableGroup onMove={(e) => setGroups((g) => moveSortableItem(g, e))}>
            <Cluster gap="md" align="start">
              {Object.entries(groups).map(([gid, fields]) => (
                <Card key={gid} style={{ minWidth: 200, flex: 1 }}>
                  <Stack gap="sm">
                    <Text size="sm" weight="semibold">
                      {GROUP_LABELS[gid]}
                    </Text>
                    <SortableGroup.Container
                      id={gid}
                      items={fields.map((f) => f.id)}
                      aria-label={GROUP_LABELS[gid]}
                    >
                      {fields.map((f) => (
                        <Sortable.Item key={f.id} id={f.id}>
                          <Cluster gap="sm" align="center">
                            <Sortable.Handle>
                              <GripVertical size={14} />
                            </Sortable.Handle>
                            <Text size="sm">{f.label}</Text>
                          </Cluster>
                        </Sortable.Item>
                      ))}
                    </SortableGroup.Container>
                  </Stack>
                </Card>
              ))}
            </Cluster>
          </SortableGroup>
          <Text size="sm" tone="muted">
            Order →{' '}
            <Code>
              {Object.entries(groups)
                .map(([g, f]) => `${g}: [${f.map((x) => x.id).join(', ')}]`)
                .join('  ·  ')}
            </Code>
          </Text>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
