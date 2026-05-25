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
import tsxSource from '@lib-source/components/Sortable/Sortable.tsx?raw';
import scssSource from '@lib-source/components/Sortable/Sortable.module.scss?raw';

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

  return (
    <DemoLayout
      name="Sortable"
      componentName="Sortable"
      description="Drag-to-reorder list (single column) built on @dnd-kit/sortable. Compound API with Sortable, Sortable.Item, and an optional Sortable.Handle for click-isolation + keyboard a11y."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Sortable.tsx"
      scssFilename="Sortable.module.scss"
    >
      <Example
        title="Plain text list (no Handle)"
        description="Whole-item drag works without a Handle when the Item contains no interactive content. The 5px activation distance means short clicks still pass through to child elements."
        code={`<Sortable
  onReorder={({ from, to }) => setTodos((curr) => arrayMove(curr, from, to))}
>
  {todos.map((t) => (
    <Sortable.Item key={t.id} id={t.id}>
      <Card padding="sm">{t.label}</Card>
    </Sortable.Item>
  ))}
</Sortable>`}
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
        code={`<Sortable
  onReorder={({ from, to }) => setTasks((curr) => arrayMove(curr, from, to))}
>
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
</Sortable>`}
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
        code={`<Sortable
  onReorder={({ from, to }) => setImages((curr) => arrayMove(curr, from, to))}
>
  {images.map((img) => (
    <Sortable.Item key={img.id} id={img.id}>
      <Card padding="sm">
        <Cluster gap="sm" align="center">
          <span style={{ width: 40, height: 40, background: img.color, borderRadius: 'var(--radius-sm)' }} />
          <Text>{img.label}</Text>
        </Cluster>
      </Card>
    </Sortable.Item>
  ))}
</Sortable>`}
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
        code={`// Same JSX as "Cards with Handle" above.
// User flow:
//   1. Tab to a GripVertical handle.
//   2. Space — item is picked up; aria-live announces it.
//   3. ArrowDown — item moves; announcement updates.
//   4. Space again — item is dropped, focus stays on the handle.`}
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
        code={`<div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
  <Sortable
    onReorder={({ from, to }) => setQueue((curr) => arrayMove(curr, from, to))}
  >
    {queue.map((q) => (
      <Sortable.Item key={q.id} id={q.id}>
        <Card padding="sm">{q.label}</Card>
      </Sortable.Item>
    ))}
  </Sortable>
</div>`}
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

      <Stack gap="xs">
        <Title order={3} size="md">
          Implementation notes
        </Title>
        <Text size="sm" tone="muted">
          Thin wrapper over @dnd-kit/sortable. PointerSensor with 5px activation distance;
          KeyboardSensor with sortableKeyboardCoordinates; vertical list strategy. Hybrid drag
          origin via containsHandle children walk. dnd-kit ships built-in aria-live announcements
          and autoscroll.
        </Text>
      </Stack>
    </DemoLayout>
  );
}
