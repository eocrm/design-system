import { useState } from 'react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Badge,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Sortable,
  Stack,
  Text,
  Title,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function SortableDemo() {
  const [todos, setTodos] = useState([
    { id: 1, label: 'Buy milk' },
    { id: 2, label: 'Walk the dog' },
    { id: 3, label: 'Call dentist' },
    { id: 4, label: 'Finish design review' },
    { id: 5, label: 'Pick up dry cleaning' },
  ]);

  const [tasks, setTasks] = useState([
    { id: 'task-1', title: 'Q3 renewal proposal', tone: 'info' as const, owner: 'Priya' },
    { id: 'task-2', title: 'Onboarding kickoff', tone: 'success' as const, owner: 'Alex' },
    { id: 'task-3', title: 'Customer interview notes', tone: 'warning' as const, owner: 'Maya' },
  ]);

  const [images, setImages] = useState([
    { id: 'img-1', label: 'Hero', color: '#3b82f6' },
    { id: 'img-2', label: 'Logo dark', color: '#6366f1' },
    { id: 'img-3', label: 'Pattern A', color: '#10b981' },
    { id: 'img-4', label: 'Pattern B', color: '#f59e0b' },
  ]);

  const [queue, setQueue] = useState(
    Array.from({ length: 20 }, (_, i) => ({ id: i + 1, label: `Ticket #${1000 + i}` })),
  );

  const [stages, setStages] = useState([
    { id: 'stage-1', label: 'Lead captured' },
    { id: 'stage-2', label: 'Qualified' },
    { id: 'stage-3', label: 'Proposal sent' },
    { id: 'stage-4', label: 'Negotiation' },
    { id: 'stage-5', label: 'Closed won' },
  ]);

  const [contained, setContained] = useState([
    { id: 'c-1', label: 'Discovery call' },
    { id: 'c-2', label: 'Demo scheduled' },
    { id: 'c-3', label: 'Contract draft' },
  ]);

  const [freeDrag, setFreeDrag] = useState([
    { id: 'f-1', label: 'Discovery call' },
    { id: 'f-2', label: 'Demo scheduled' },
    { id: 'f-3', label: 'Contract draft' },
  ]);

  const [widgets, setWidgets] = useState([
    { id: 'w-1', title: 'KPIs', span: '25%' as const },
    { id: 'w-2', title: 'Revenue', span: '75%' as const },
    { id: 'w-3', title: 'Recent deals', span: '33%' as const },
    { id: 'w-4', title: 'Pipeline', span: '67%' as const },
    { id: 'w-5', title: 'Activity feed', span: '100%' as const },
  ]);

  const [collapsibleWidgets, setCollapsibleWidgets] = useState([
    { id: 'cw-1', title: 'KPIs', span: '25%' as const },
    { id: 'cw-2', title: 'Revenue', span: '75%' as const },
    { id: 'cw-3', title: 'Recent deals', span: '33%' as const },
    { id: 'cw-4', title: 'Pipeline', span: '67%' as const },
    { id: 'cw-5', title: 'Activity feed', span: '100%' as const },
  ]);

  return (
    <DemoLayout
      name="Sortable"
      componentName="Sortable"
      description="Drag-to-reorder list (single column) built on @dnd-kit/sortable. Compound API with Sortable, Sortable.Item, and an optional Sortable.Handle for click-isolation + keyboard a11y."
      files={getComponentFiles('Sortable')}
    >
      <Example
        title="Plain text list (no Handle)"
        description="Whole-item drag works without a Handle when the Item contains no interactive content. The 5px activation distance means short clicks still pass through to child elements."
        code={`import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, Sortable } from '@eocrm/design-system';

export function Demo() {
  const [todos, setTodos] = useState([
    { id: 1, label: 'Buy milk' },
    { id: 2, label: 'Walk the dog' },
    { id: 3, label: 'Call dentist' },
    { id: 4, label: 'Finish design review' },
    { id: 5, label: 'Pick up dry cleaning' },
  ]);

  return (
    <Sortable onReorder={({ from, to }) => setTodos((curr) => arrayMove(curr, from, to))}>
      {todos.map((t) => (
        <Sortable.Item key={t.id} id={t.id}>
          <Card padding="sm">{t.label}</Card>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}`}
      >
        <Sortable onReorder={({ from, to }) => setTodos((curr) => arrayMove(curr, from, to))}>
          {todos.map((t) => (
            <Sortable.Item key={t.id} id={t.id}>
              <Card padding="sm">{t.label}</Card>
            </Sortable.Item>
          ))}
        </Sortable>
      </Example>

      <Example
        title="Cards with Handle + DropdownMenu"
        description="When an Item contains interactive elements, use Sortable.Handle to restrict drag origin. The internal menu stays clickable."
        code={`import { useState } from 'react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Badge,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Sortable,
  Text,
} from '@eocrm/design-system';

export function Demo() {
  const [tasks, setTasks] = useState([
    { id: 'task-1', title: 'Q3 renewal proposal', tone: 'info' as const, owner: 'Priya' },
    { id: 'task-2', title: 'Onboarding kickoff', tone: 'success' as const, owner: 'Alex' },
    {
      id: 'task-3',
      title: 'Customer interview notes',
      tone: 'warning' as const,
      owner: 'Maya',
    },
  ]);

  return (
    <Sortable onReorder={({ from, to }) => setTasks((curr) => arrayMove(curr, from, to))}>
      {tasks.map((task) => (
        <Sortable.Item key={task.id} id={task.id}>
          <Card padding="sm">
            <Cluster justify="between" align="center">
              <Cluster gap="sm" align="center">
                <Sortable.Handle aria-label={\`Reorder \${task.title}\`}>
                  <GripVertical size={14} />
                </Sortable.Handle>
                <Text weight="medium">{task.title}</Text>
                <Badge tone={task.tone}>{task.owner}</Badge>
              </Cluster>
              <DropdownMenu>
                <DropdownMenu.Trigger>
                  <Button variant="ghost" size="sm" iconOnly aria-label="More">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            </Cluster>
          </Card>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}`}
      >
        <Sortable onReorder={({ from, to }) => setTasks((curr) => arrayMove(curr, from, to))}>
          {tasks.map((task) => (
            <Sortable.Item key={task.id} id={task.id}>
              <Card padding="sm">
                <Cluster justify="between" align="center">
                  <Cluster gap="sm" align="center">
                    <Sortable.Handle aria-label={`Reorder ${task.title}`}>
                      <GripVertical size={14} />
                    </Sortable.Handle>
                    <Text weight="medium">{task.title}</Text>
                    <Badge tone={task.tone}>{task.owner}</Badge>
                  </Cluster>
                  <DropdownMenu>
                    <DropdownMenu.Trigger>
                      <Button variant="ghost" size="sm" iconOnly aria-label="More">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
                      <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </Cluster>
              </Card>
            </Sortable.Item>
          ))}
        </Sortable>
      </Example>

      <Example
        title="Image gallery"
        description="Drag-to-reorder visual tiles. Each tile is a Card with a colored thumbnail; the whole tile is draggable."
        code={`import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, Cluster, Sortable, Text } from '@eocrm/design-system';

export function Demo() {
  const [images, setImages] = useState([
    { id: 'img-1', label: 'Hero', color: '#3b82f6' },
    { id: 'img-2', label: 'Logo dark', color: '#6366f1' },
    { id: 'img-3', label: 'Pattern A', color: '#10b981' },
    { id: 'img-4', label: 'Pattern B', color: '#f59e0b' },
  ]);

  return (
    <Sortable onReorder={({ from, to }) => setImages((curr) => arrayMove(curr, from, to))}>
      {images.map((img) => (
        <Sortable.Item key={img.id} id={img.id}>
          <Card padding="sm">
            <Cluster gap="sm" align="center">
              <span
                style={{
                  display: 'inline-block',
                  width: 40,
                  height: 40,
                  background: img.color,
                  borderRadius: 'var(--radius-sm)',
                }}
              />
              <Text>{img.label}</Text>
            </Cluster>
          </Card>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}`}
      >
        <Sortable onReorder={({ from, to }) => setImages((curr) => arrayMove(curr, from, to))}>
          {images.map((img) => (
            <Sortable.Item key={img.id} id={img.id}>
              <Card padding="sm">
                <Cluster gap="sm" align="center">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 40,
                      height: 40,
                      background: img.color,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                  <Text>{img.label}</Text>
                </Cluster>
              </Card>
            </Sortable.Item>
          ))}
        </Sortable>
      </Example>

      <Example
        title="Keyboard-only walkthrough"
        description="Tab to a Handle (or any Item without a Handle), press Space to pick up, ArrowUp/ArrowDown to move, Space to drop. Escape cancels. dnd-kit announces each step via aria-live."
        code={`import { Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Text size="sm" tone="muted">
        Try Tab + Space + ArrowUp / ArrowDown on the cards above.
      </Text>
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Text size="sm" tone="muted">
            Try Tab + Space + ArrowUp / ArrowDown on the cards above.
          </Text>
        </Stack>
      </Example>

      <Example
        title="Long list with autoscroll"
        description="When the cursor enters the edge of the scrolling container during a drag, dnd-kit auto-scrolls. Try dragging from near the top toward the bottom."
        code={`import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, Sortable } from '@eocrm/design-system';

export function Demo() {
  const [queue, setQueue] = useState(
    Array.from({ length: 20 }, (_, i) => ({ id: i + 1, label: \`Ticket #\${1000 + i}\` })),
  );

  return (
    <div
      style={{
        maxHeight: 280,
        overflowY: 'auto',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2)',
      }}
    >
      <Sortable onReorder={({ from, to }) => setQueue((curr) => arrayMove(curr, from, to))}>
        {queue.map((q) => (
          <Sortable.Item key={q.id} id={q.id}>
            <Card padding="sm">{q.label}</Card>
          </Sortable.Item>
        ))}
      </Sortable>
    </div>
  );
}`}
      >
        <div
          style={{
            maxHeight: 280,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2)',
          }}
        >
          <Sortable onReorder={({ from, to }) => setQueue((curr) => arrayMove(curr, from, to))}>
            {queue.map((q) => (
              <Sortable.Item key={q.id} id={q.id}>
                <Card padding="sm">{q.label}</Card>
              </Sortable.Item>
            ))}
          </Sortable>
        </div>
      </Example>

      <Example
        title="Async / optimistic reorder"
        description="onReorder applies the new order a tick late — as it would with an optimistic TanStack mutation's onMutate. Before this fix the dropped row kept dnd-kit's stale drag transform and animated in from ~100px off (a 'fly up then settle' glitch). The dragged item now renders in a DragOverlay that owns the drop animation, so the late state update lands smoothly. Drag a stage to feel it."
        code={`import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, Sortable } from '@eocrm/design-system';

export function Demo() {
  const [stages, setStages] = useState([
    { id: 'stage-1', label: 'Lead captured' },
    { id: 'stage-2', label: 'Qualified' },
    { id: 'stage-3', label: 'Proposal sent' },
    { id: 'stage-4', label: 'Negotiation' },
    { id: 'stage-5', label: 'Closed won' },
  ]);

  return (
    <Sortable
      onReorder={({ from, to }) =>
        setTimeout(() => setStages((curr) => arrayMove(curr, from, to)), 0)
      }
    >
      {stages.map((s) => (
        <Sortable.Item key={s.id} id={s.id}>
          <Card padding="sm">{s.label}</Card>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}`}
      >
        <Sortable
          onReorder={({ from, to }) =>
            setTimeout(() => setStages((curr) => arrayMove(curr, from, to)), 0)
          }
        >
          {stages.map((s) => (
            <Sortable.Item key={s.id} id={s.id}>
              <Card padding="sm">{s.label}</Card>
            </Sortable.Item>
          ))}
        </Sortable>
      </Example>

      <Example
        title="Restrict drag to container (default)"
        description="By default (restrictToContainer) the dragged item is clamped to the list's bounding box — it can't be dragged off over unrelated UI. Pass restrictToContainer={false} for free-drag, where the item follows the cursor anywhere on the page. Drag a row in each list and notice how the left one stays inside its bounds while the right one doesn't."
        code={`import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, Cluster, Sortable, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  const [contained, setContained] = useState([
    { id: 'c-1', label: 'Discovery call' },
    { id: 'c-2', label: 'Demo scheduled' },
    { id: 'c-3', label: 'Contract draft' },
  ]);

  const [freeDrag, setFreeDrag] = useState([
    { id: 'f-1', label: 'Discovery call' },
    { id: 'f-2', label: 'Demo scheduled' },
    { id: 'f-3', label: 'Contract draft' },
  ]);

  return (
    <Cluster gap="lg" align="start">
      <Stack gap="xs">
        <Text size="sm" weight="medium">
          Contained (default)
        </Text>
        <Sortable
          onReorder={({ from, to }) => setContained((curr) => arrayMove(curr, from, to))}
        >
          {contained.map((s) => (
            <Sortable.Item key={s.id} id={s.id}>
              <Card padding="sm">{s.label}</Card>
            </Sortable.Item>
          ))}
        </Sortable>
      </Stack>
      <Stack gap="xs">
        <Text size="sm" weight="medium">
          Free drag (restrictToContainer=false)
        </Text>
        <Sortable
          restrictToContainer={false}
          onReorder={({ from, to }) => setFreeDrag((curr) => arrayMove(curr, from, to))}
        >
          {freeDrag.map((s) => (
            <Sortable.Item key={s.id} id={s.id}>
              <Card padding="sm">{s.label}</Card>
            </Sortable.Item>
          ))}
        </Sortable>
      </Stack>
    </Cluster>
  );
}`}
      >
        <Cluster gap="lg" align="start">
          <Stack gap="xs">
            <Text size="sm" weight="medium">
              Contained (default)
            </Text>
            <Sortable
              onReorder={({ from, to }) => setContained((curr) => arrayMove(curr, from, to))}
            >
              {contained.map((s) => (
                <Sortable.Item key={s.id} id={s.id}>
                  <Card padding="sm">{s.label}</Card>
                </Sortable.Item>
              ))}
            </Sortable>
          </Stack>
          <Stack gap="xs">
            <Text size="sm" weight="medium">
              Free drag (restrictToContainer=false)
            </Text>
            <Sortable
              restrictToContainer={false}
              onReorder={({ from, to }) => setFreeDrag((curr) => arrayMove(curr, from, to))}
            >
              {freeDrag.map((s) => (
                <Sortable.Item key={s.id} id={s.id}>
                  <Card padding="sm">{s.label}</Card>
                </Sortable.Item>
              ))}
            </Sortable>
          </Stack>
        </Cluster>
      </Example>

      <Example
        title="Grid arrangement (dashboard widgets)"
        description="arrangement='grid' re-lays the <ol> as a 12-column grid (columns default 12). Each Sortable.Item carries a span (same values as Grid.Item: 25%/33%/50%/67%/75%/100%), rows are equal-height, and dnd-kit's rectSortingStrategy reflows siblings in 2D during a drag. A drop reorders the flow — order-based, no persisted x/y. Drag a widget's grip to any position."
        code={`import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, Cluster, Sortable, Text } from '@eocrm/design-system';

export function Demo() {
  const [widgets, setWidgets] = useState([
    { id: 'w-1', title: 'KPIs', span: '25%' as const },
    { id: 'w-2', title: 'Revenue', span: '75%' as const },
    { id: 'w-3', title: 'Recent deals', span: '33%' as const },
    { id: 'w-4', title: 'Pipeline', span: '67%' as const },
    { id: 'w-5', title: 'Activity feed', span: '100%' as const },
  ]);

  return (
    <Sortable
      arrangement="grid"
      columns={12}
      onReorder={({ from, to }) => setWidgets((w) => arrayMove(w, from, to))}
    >
      {widgets.map((widget) => (
        <Sortable.Item key={widget.id} id={widget.id} span={widget.span}>
          <Card padding="sm" style={{ height: '100%' }}>
            <Cluster gap="sm" align="center">
              <Sortable.Handle aria-label={\`Reorder \${widget.title}\`}>
                <GripVertical size={14} />
              </Sortable.Handle>
              <Text weight="medium">{widget.title}</Text>
              <Text size="sm" tone="muted">
                {widget.span}
              </Text>
            </Cluster>
          </Card>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}`}
      >
        <Sortable
          arrangement="grid"
          columns={12}
          onReorder={({ from, to }) => setWidgets((w) => arrayMove(w, from, to))}
        >
          {widgets.map((widget) => (
            <Sortable.Item key={widget.id} id={widget.id} span={widget.span}>
              <Card padding="sm" style={{ height: '100%' }}>
                <Cluster gap="sm" align="center">
                  <Sortable.Handle aria-label={`Reorder ${widget.title}`}>
                    <GripVertical size={14} />
                  </Sortable.Handle>
                  <Text weight="medium">{widget.title}</Text>
                  <Text size="sm" tone="muted">
                    {widget.span}
                  </Text>
                </Cluster>
              </Card>
            </Sortable.Item>
          ))}
        </Sortable>
      </Example>

      <Example
        title="Grid arrangement — graduated collapse"
        description="collapseBelow accepts the same graduated map as Grid: {{ md: 6, sm: 1 }} re-templates the grid to 6 columns under 640px (item spans clamp to fit) and to 1 column under 480px, mirroring Grid's collapseBelow exactly. Drag the box's resize handle (bottom-right corner) narrower to see it step down."
        code={`import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { Card, Cluster, Sortable, Text } from '@eocrm/design-system';

export function Demo() {
  const [widgets, setWidgets] = useState([
    { id: 'w-1', title: 'KPIs', span: '25%' as const },
    { id: 'w-2', title: 'Revenue', span: '75%' as const },
    { id: 'w-3', title: 'Recent deals', span: '33%' as const },
    { id: 'w-4', title: 'Pipeline', span: '67%' as const },
    { id: 'w-5', title: 'Activity feed', span: '100%' as const },
  ]);

  return (
    <Sortable
      arrangement="grid"
      columns={12}
      collapseBelow={{ md: 6, sm: 1 }}
      onReorder={({ from, to }) => setWidgets((w) => arrayMove(w, from, to))}
    >
      {widgets.map((widget) => (
        <Sortable.Item key={widget.id} id={widget.id} span={widget.span}>
          <Card padding="sm" style={{ height: '100%' }}>
            <Cluster gap="sm" align="center">
              <Sortable.Handle aria-label={\`Reorder \${widget.title}\`}>
                <GripVertical size={14} />
              </Sortable.Handle>
              <Text weight="medium">{widget.title}</Text>
              <Text size="sm" tone="muted">
                {widget.span}
              </Text>
            </Cluster>
          </Card>
        </Sortable.Item>
      ))}
    </Sortable>
  );
}`}
      >
        <div style={{ resize: 'horizontal', overflow: 'auto' }}>
          <Sortable
            arrangement="grid"
            columns={12}
            collapseBelow={{ md: 6, sm: 1 }}
            onReorder={({ from, to }) => setCollapsibleWidgets((w) => arrayMove(w, from, to))}
          >
            {collapsibleWidgets.map((widget) => (
              <Sortable.Item key={widget.id} id={widget.id} span={widget.span}>
                <Card padding="sm" style={{ height: '100%' }}>
                  <Cluster gap="sm" align="center">
                    <Sortable.Handle aria-label={`Reorder ${widget.title}`}>
                      <GripVertical size={14} />
                    </Sortable.Handle>
                    <Text weight="medium">{widget.title}</Text>
                    <Text size="sm" tone="muted">
                      {widget.span}
                    </Text>
                  </Cluster>
                </Card>
              </Sortable.Item>
            ))}
          </Sortable>
        </div>
      </Example>

      <Stack gap="xs">
        <Title order={3} size="md">
          Implementation notes
        </Title>
        <Text size="sm" tone="muted">
          Thin wrapper over @dnd-kit/sortable. PointerSensor with 5px activation distance;
          KeyboardSensor with sortableKeyboardCoordinates. arrangement='list' (default) uses the
          vertical list strategy; arrangement='grid' uses rectSortingStrategy on a columns-track CSS
          grid with per-item spans (Sortable.Item span). Hybrid drag origin via containsHandle
          children walk. dnd-kit ships built-in aria-live announcements and autoscroll.
        </Text>
      </Stack>
    </DemoLayout>
  );
}
