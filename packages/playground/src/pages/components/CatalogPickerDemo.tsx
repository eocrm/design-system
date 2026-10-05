import { useState } from 'react';
import {
  Badge,
  Button,
  CatalogPicker,
  Drawer,
  Stack,
  Text,
  WidgetPreview,
  type CatalogPickerItem,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const CATEGORIES = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'work', label: 'Work' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'analytics', label: 'Analytics' },
];

const ITEMS: CatalogPickerItem[] = [
  {
    id: 'open-deals',
    title: 'Open deals',
    description: 'Count of deals in open stages.',
    category: 'sales',
    tags: ['pipeline', 'kpi'],
    badge: <Badge>New</Badge>,
    preview: <WidgetPreview variant="kpi" />,
  },
  {
    id: 'pipeline',
    title: 'Pipeline board',
    description: 'Deals by stage.',
    category: 'sales',
    preview: <WidgetPreview variant="pipeline" />,
  },
  {
    id: 'revenue',
    title: 'Revenue',
    description: 'Monthly revenue trend.',
    category: 'sales',
    preview: <WidgetPreview variant="chart" />,
  },
  {
    id: 'my-tasks',
    title: 'My tasks',
    description: 'Tasks due soon.',
    category: 'work',
    preview: <WidgetPreview variant="list" />,
    disabledReason: 'Already on dashboard',
  },
  {
    id: 'overdue',
    title: 'Overdue tasks',
    description: 'Count of overdue tasks.',
    category: 'work',
    preview: <WidgetPreview variant="kpi" />,
  },
  {
    id: 'recent-activity',
    title: 'Recent activity',
    description: 'Latest changes across records.',
    category: 'overview',
    preview: <WidgetPreview variant="activity" />,
  },
  {
    id: 'new-contacts',
    title: 'New contacts',
    description: 'Contacts added this week.',
    category: 'contacts',
    preview: <WidgetPreview variant="list" />,
  },
  {
    id: 'top-accounts',
    title: 'Top accounts',
    description: 'Accounts by lifetime value.',
    category: 'contacts',
    preview: <WidgetPreview variant="list" />,
  },
  {
    id: 'funnel',
    title: 'Conversion funnel',
    description: 'Lead to customer conversion.',
    category: 'analytics',
    preview: <WidgetPreview variant="chart" />,
    disabledReason: 'Requires Analytics permission',
  },
  {
    id: 'forecast',
    title: 'Forecast',
    description: 'Projected quarterly revenue.',
    category: 'analytics',
    preview: <WidgetPreview variant="chart" />,
  },
];

export function CatalogPickerDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  return (
    <DemoLayout
      name="CatalogPicker"
      componentName="CatalogPicker"
      description="Search box, category pills, live result count and an auto-fill card grid for choosing one item from a catalog. A surface, not an overlay: put it in Drawer.Body or Modal.Body. onSelect is an action; unavailable items stay visible with a reason."
      files={getComponentFiles('CatalogPicker')}
    >
      <Example
        title="Inline"
        description="In a 420px box. Two items are unavailable (dimmed, with a reason) and one carries a badge. Arrow keys move through the grid; Enter selects."
        code={`const [selected, setSelected] = useState<string | null>(null);

<Stack gap="sm">
  <div style={{ width: 420, border: '1px solid var(--color-border)', padding: 'var(--space-4)' }}>
    <CatalogPicker
      label="Widget catalog"
      categories={CATEGORIES}
      items={ITEMS}
      onSelect={setSelected}
    />
  </div>
  <Text size="sm" tone="muted">Last selected: {selected ?? 'none'}</Text>
</Stack>`}
      >
        <Stack gap="sm">
          <div
            style={{
              width: 420,
              maxWidth: '100%',
              border: 'var(--border-width) solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}
          >
            <CatalogPicker
              label="Widget catalog"
              categories={CATEGORIES}
              items={ITEMS}
              onSelect={setSelected}
            />
          </div>
          <Text size="sm" tone="muted">
            Last selected: {selected ?? 'none'}
          </Text>
        </Stack>
      </Example>

      <Example
        title="Add widget drawer"
        description="The canonical use: a Drawer opened from a button. The toolbar stays pinned while the body scrolls; selecting closes the drawer."
        code={`const [open, setOpen] = useState(false);
const [added, setAdded] = useState<string | null>(null);

<Stack gap="sm">
  <Button onClick={() => setOpen(true)}>Add widget</Button>
  <Text size="sm" tone="muted">Added: {added ?? 'none'}</Text>
  <Drawer open={open} onOpenChange={setOpen}>
    <Drawer.Header>Add widget</Drawer.Header>
    <Drawer.Body>
      <CatalogPicker
        label="Widget catalog"
        categories={CATEGORIES}
        items={ITEMS}
        onSelect={(id) => { setAdded(id); setOpen(false); }}
      />
    </Drawer.Body>
  </Drawer>
</Stack>`}
      >
        <Stack gap="sm">
          <div>
            <Button onClick={() => setOpen(true)}>Add widget</Button>
          </div>
          <Text size="sm" tone="muted">
            Added: {added ?? 'none'}
          </Text>
          <Drawer open={open} onOpenChange={setOpen}>
            <Drawer.Header>Add widget</Drawer.Header>
            <Drawer.Body>
              <CatalogPicker
                label="Widget catalog"
                categories={CATEGORIES}
                items={ITEMS}
                onSelect={(id) => {
                  setAdded(id);
                  setOpen(false);
                }}
              />
            </Drawer.Body>
          </Drawer>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
