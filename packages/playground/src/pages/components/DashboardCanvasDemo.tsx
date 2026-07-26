import { useState } from 'react';
import {
  Accordion,
  Badge,
  Card,
  DashboardCanvas,
  Stack,
  Text,
  Title,
  type DashboardCanvasValue,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface Widget {
  title: string;
  metric: string;
  sub: string;
}

const WIDGETS: Record<string, Widget> = {
  revenue: { title: 'Revenue (MTD)', metric: '$128,400', sub: '+12% vs last month' },
  deals: { title: 'Open deals', metric: '34', sub: '9 closing this week' },
  activity: { title: 'Recent activity', metric: '212 events', sub: 'Last 24 hours' },
  leaderboard: { title: 'Top reps', metric: 'A. Chen — $41,200', sub: 'Q3 leaderboard' },
  quota: { title: 'Quota attainment', metric: '87%', sub: 'Team average' },
  exports: { title: 'Scheduled exports', metric: '3 reports', sub: 'Next run: tomorrow 6am' },
};

// `activity` is the one widget tall enough (h: 6) to also show its feed —
// content that actually fills the extra row, not blank cell below a short
// stat (a fixed-unit grid cell never shrinks to fit; the DS `Card` inside it
// does, so a taller widget needs taller content).
const RECENT_EVENTS = [
  'A. Chen closed Acme Corp — $18,200',
  'M. Reyes logged a call with Initech',
  'New lead: Globex Corporation',
];

const INITIAL_VALUE: DashboardCanvasValue = {
  items: [
    { id: 'revenue', x: 0, y: 0, w: 8, h: 4 },
    { id: 'deals', x: 8, y: 0, w: 8, h: 4 },
    { id: 'activity', x: 16, y: 0, w: 8, h: 6 },
  ],
  sections: [
    {
      id: 'team',
      title: 'Team performance',
      collapsed: false,
      items: [
        { id: 'leaderboard', x: 0, y: 0, w: 12, h: 4 },
        { id: 'quota', x: 12, y: 0, w: 12, h: 4 },
      ],
    },
    {
      id: 'reports',
      title: 'Reports',
      collapsed: true,
      items: [{ id: 'exports', x: 0, y: 0, w: 24, h: 4 }],
    },
  ],
};

// The pre-#350 12-column layout — the same dashboard on the coarser grid a
// legacy schema (e.g. eocrm layout-v2) was saved against.
const TWELVE_COL_VALUE: DashboardCanvasValue = {
  items: [
    { id: 'revenue', x: 0, y: 0, w: 4, h: 2 },
    { id: 'deals', x: 4, y: 0, w: 4, h: 2 },
    { id: 'activity', x: 8, y: 0, w: 4, h: 3 },
  ],
  sections: [],
};

// revenue: locked to a KPI-sized footprint. quota: never allowed to shrink
// narrower than half the section (a bar needs room to read).
const CONSTRAINTS = {
  revenue: { minW: 4, maxH: 4 },
  quota: { minW: 6 },
};

const NARROW_VALUE: DashboardCanvasValue = {
  items: [
    { id: 'revenue', x: 0, y: 0, w: 12, h: 2 },
    { id: 'deals', x: 12, y: 0, w: 12, h: 2 },
  ],
  sections: [
    {
      id: 'team',
      title: 'Team performance',
      collapsed: false,
      items: [{ id: 'quota', x: 0, y: 0, w: 24, h: 2 }],
    },
  ],
};

function renderWidget(id: string | number) {
  const widget = WIDGETS[String(id)];
  if (!widget) return null;
  // height: '100%' fills the grid cell — the "size the content to the cell"
  // pattern from DashboardCanvas's renderItem JSDoc (#344): the widget's own
  // edges ARE the cell edges, so resize/drag reads WYSIWYG against the dots.
  return (
    <Card style={{ height: '100%' }}>
      <Stack gap="xs">
        <Text size="sm" tone="muted">
          {widget.title}
        </Text>
        <Title order={3} size="md">
          {widget.metric}
        </Title>
        <Text size="sm" tone="muted">
          {widget.sub}
        </Text>
        {id === 'activity' && (
          <Stack gap="xs">
            {RECENT_EVENTS.map((event) => (
              <Text key={event} size="sm">
                {event}
              </Text>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

export function DashboardCanvasDemo() {
  const [value, setValue] = useState<DashboardCanvasValue>(INITIAL_VALUE);
  const [twelveValue, setTwelveValue] = useState<DashboardCanvasValue>(TWELVE_COL_VALUE);
  const [narrowValue, setNarrowValue] = useState<DashboardCanvasValue>(NARROW_VALUE);

  const renderSectionHeader = (id: string | number) => (
    <Badge tone="neutral">{value.sections.find((s) => s.id === id)?.items.length ?? 0}</Badge>
  );

  return (
    <DemoLayout
      name="DashboardCanvas"
      componentName="DashboardCanvas"
      description="Datadog-style 2D snap-grid dashboard — a configurable-column grid (24 by default) with square cells that scale fluidly with the container width, drag-to-move with push-down collision, E/S/SE resize, collapsible full-width sections with their own sub-grids, cross-container drag, and band reorder. Always controlled: every completed gesture fires onChange once with the whole next value."
      files={getComponentFiles('DashboardCanvas')}
    >
      <Example
        title="Edit mode"
        description="The default 24-column grid with square cells: the row unit equals the column width at every container size, so resize the window and the whole layout scales in proportion (override --dashboard-canvas-row with a fixed length for fixed-height rows). Drag a widget to move it (push-down collision + live compaction preview). Drag its right / bottom / corner edge to resize — every gesture snaps per single cell. Drag a section header to reorder bands, or click the chevron to collapse. Keyboard: Tab to a widget, Enter/Space to pick it up, arrows to move (crossing a band's edge moves it between containers), Shift+arrows to resize, Enter/Space to drop, Escape to cancel. `revenue` and `quota` carry constraints (min size / max height) via the `constraints` prop. The current value is shown below, collapsibly."
        code={`import { useState } from 'react';
import { Badge, Card, DashboardCanvas, Stack, Text, Title, type DashboardCanvasValue } from '@eocrm/design-system';

const WIDGETS = {
  revenue: { title: 'Revenue (MTD)', metric: '$128,400', sub: '+12% vs last month' },
  deals: { title: 'Open deals', metric: '34', sub: '9 closing this week' },
  activity: { title: 'Recent activity', metric: '212 events', sub: 'Last 24 hours' },
  leaderboard: { title: 'Top reps', metric: 'A. Chen — $41,200', sub: 'Q3 leaderboard' },
  quota: { title: 'Quota attainment', metric: '87%', sub: 'Team average' },
  exports: { title: 'Scheduled exports', metric: '3 reports', sub: 'Next run: tomorrow 6am' },
};

const RECENT_EVENTS = [
  'A. Chen closed Acme Corp — $18,200',
  'M. Reyes logged a call with Initech',
  'New lead: Globex Corporation',
];

function renderWidget(id) {
  const w = WIDGETS[id];
  // height: '100%' fills the grid cell (renderItem JSDoc's "size the content
  // to the cell" pattern) — widget edges == cell edges, resizing is WYSIWYG.
  return (
    <Card style={{ height: '100%' }}>
      <Stack gap="xs">
        <Text size="sm" tone="muted">{w.title}</Text>
        <Title order={3} size="md">{w.metric}</Title>
        <Text size="sm" tone="muted">{w.sub}</Text>
        {id === 'activity' && (
          <Stack gap="xs">
            {RECENT_EVENTS.map((event) => <Text key={event} size="sm">{event}</Text>)}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

export function Demo() {
  // 24 columns (the default); cells are square, so the layout scales with width.
  const [value, setValue] = useState<DashboardCanvasValue>({
    items: [
      { id: 'revenue', x: 0, y: 0, w: 8, h: 4 },
      { id: 'deals', x: 8, y: 0, w: 8, h: 4 },
      { id: 'activity', x: 16, y: 0, w: 8, h: 6 },
    ],
    sections: [
      {
        id: 'team',
        title: 'Team performance',
        collapsed: false,
        items: [
          { id: 'leaderboard', x: 0, y: 0, w: 12, h: 4 },
          { id: 'quota', x: 12, y: 0, w: 12, h: 4 },
        ],
      },
      {
        id: 'reports',
        title: 'Reports',
        collapsed: true,
        items: [{ id: 'exports', x: 0, y: 0, w: 24, h: 4 }],
      },
    ],
  });

  return (
    <DashboardCanvas
      value={value}
      onChange={setValue}
      constraints={{ revenue: { minW: 4, maxH: 4 }, quota: { minW: 6 } }}
      renderItem={renderWidget}
      renderSectionHeader={(id) => (
        <Badge tone="neutral">{value.sections.find((s) => s.id === id)?.items.length ?? 0}</Badge>
      )}
    />
  );
}`}
      >
        <Stack gap="md">
          <DashboardCanvas
            value={value}
            onChange={setValue}
            constraints={CONSTRAINTS}
            renderItem={renderWidget}
            renderSectionHeader={renderSectionHeader}
          />
          <Accordion type="single" collapsible>
            <Accordion.Item value="json">
              <Accordion.Trigger>Current value (JSON)</Accordion.Trigger>
              <Accordion.Content>
                <pre style={{ margin: 0, fontSize: 'var(--font-size-sm)', overflow: 'auto' }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Example>

      <Example
        title="12 columns"
        description="columns={12} restores the pre-#350 grid for layouts saved against a 12-column schema (the eocrm layout-v2 spec) — placements are NOT converted between column counts, so a 12-column value rendered at the default 24 shows every widget at half width. Cells stay square at any column count; fewer columns just makes them coarser."
        code={`import { useState } from 'react';
import { DashboardCanvas, type DashboardCanvasValue } from '@eocrm/design-system';

export function Demo() {
  const [value, setValue] = useState<DashboardCanvasValue>(twelveColumnLayout);
  return (
    <DashboardCanvas columns={12} value={value} onChange={setValue} renderItem={renderWidget} />
  );
}`}
      >
        <DashboardCanvas
          columns={12}
          value={twelveValue}
          onChange={setTwelveValue}
          renderItem={renderWidget}
        />
      </Example>

      <Example
        title="Read-only"
        description="Same value as the edit-mode canvas above, rendered with readOnly: no drag/resize wiring, no handles, no keyboard editing. Section collapse toggles keep working — collapse is navigation, not editing. Suits a dashboard record page or a permission-gated view."
        code={`import { DashboardCanvas } from '@eocrm/design-system';

export function Demo() {
  return <DashboardCanvas value={savedLayout} renderItem={renderWidget} readOnly />;
}`}
      >
        <DashboardCanvas value={value} renderItem={renderWidget} readOnly />
      </Example>

      <Example
        title="Single-column stack (stackBelow)"
        description="Drag the box's resize handle (bottom-right corner) narrower than 640px. Every container — top level and the section — re-templates to one column with fixed-height rows, and pointer + keyboard editing turns off automatically; this width gate is independent of the readOnly prop. Widen it back past 640px to see editing (and the square cells) return. The threshold is the stackBelow prop: 'sm' 480px / 'md' 640px (default) / 'lg' 768px, measured against the canvas's own width."
        code={`import { useState } from 'react';
import { DashboardCanvas, type DashboardCanvasValue } from '@eocrm/design-system';

export function Demo() {
  const [value, setValue] = useState<DashboardCanvasValue>(narrowLayout);
  return (
    <div style={{ resize: 'horizontal', overflow: 'auto', width: 480 }}>
      {/* stackBelow="md" is the default; pass 'sm' or 'lg' to move the threshold */}
      <DashboardCanvas value={value} onChange={setValue} renderItem={renderWidget} />
    </div>
  );
}`}
      >
        <div style={{ resize: 'horizontal', overflow: 'auto', width: 480 }}>
          <DashboardCanvas
            value={narrowValue}
            onChange={setNarrowValue}
            renderItem={renderWidget}
          />
        </div>
      </Example>
    </DemoLayout>
  );
}
