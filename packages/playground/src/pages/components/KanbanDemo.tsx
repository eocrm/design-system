import { useCallback, useState } from 'react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Kanban,
  Stack,
  Text,
  Title,
  type KanbanMoveEvent,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

type ColId = 'todo' | 'doing' | 'done';

interface CardData {
  id: string;
  title: string;
}

const COL_TITLES: Record<ColId, string> = {
  todo: 'To do',
  doing: 'In progress',
  done: 'Done',
};

const INITIAL_BOARD: Record<ColId, CardData[]> = {
  todo: [
    { id: 'task-1', title: 'Draft Q3 OKRs' },
    { id: 'task-2', title: 'Review pricing page mocks' },
    { id: 'task-3', title: 'Schedule retro' },
  ],
  doing: [
    { id: 'task-4', title: 'Refactor billing service' },
    { id: 'task-5', title: 'Customer interview notes' },
  ],
  done: [
    { id: 'task-6', title: 'Ship onboarding email' },
    { id: 'task-7', title: 'Migrate logs to OTLP' },
  ],
};

function makeMoveHandler(setter: React.Dispatch<React.SetStateAction<Record<ColId, CardData[]>>>) {
  return (event: KanbanMoveEvent) => {
    const { from, to, cardId } = event;
    setter((curr) => {
      const fromCol = from.columnId as ColId;
      const toCol = to.columnId as ColId;
      const next: Record<ColId, CardData[]> = {
        todo: [...curr.todo],
        doing: [...curr.doing],
        done: [...curr.done],
      };
      const sourceArr = next[fromCol];
      const idx = sourceArr.findIndex((c) => c.id === cardId);
      if (idx < 0) return curr;
      const [moved] = sourceArr.splice(idx, 1);
      const targetArr = fromCol === toCol ? sourceArr : next[toCol];
      const insertAt = Math.min(to.index, targetArr.length);
      targetArr.splice(insertAt, 0, moved);
      return next;
    });
  };
}

export function KanbanDemo() {
  const [boardA, setBoardA] = useState<Record<ColId, CardData[]>>(INITIAL_BOARD);
  const [boardB, setBoardB] = useState<Record<ColId, CardData[]>>(INITIAL_BOARD);
  const handleMoveA = useCallback(makeMoveHandler(setBoardA), [setBoardA]);
  const handleMoveB = useCallback(makeMoveHandler(setBoardB), [setBoardB]);

  return (
    <DemoLayout
      name="Kanban"
      componentName="Kanban"
      description="Multi-column board with live cross-column drag. Cards reflow into the target column as the dragged card crosses in — internal state, consumer's onMove fires once on drop."
      files={getComponentFiles('Kanban')}
    >
      <Example
        title="Basic board (3 columns)"
        description="Drag cards within and across columns. Empty columns are still drop targets. Watch the target column reflow as the dragged card crosses in."
        code={`<Kanban onMove={handleMove}>
  {(['todo', 'doing', 'done'] as const).map((colId) => (
    <Kanban.Column key={colId} id={colId}>
      <Cluster justify="between" align="center">
        <Title order={3} size="sm">{COL_TITLES[colId]}</Title>
        <Badge tone="neutral" size="sm">{board[colId].length}</Badge>
      </Cluster>
      {board[colId].map((card) => (
        <Kanban.Card key={card.id} id={card.id}>
          <Card padding="sm">{card.title}</Card>
        </Kanban.Card>
      ))}
    </Kanban.Column>
  ))}
</Kanban>`}
      >
        <Kanban onMove={handleMoveA}>
          {(['todo', 'doing', 'done'] as const).map((colId) => (
            <Kanban.Column key={colId} id={colId}>
              <Cluster justify="between" align="center">
                <Title order={3} size="sm">
                  {COL_TITLES[colId]}
                </Title>
                <Badge tone="neutral" size="sm">
                  {boardA[colId].length}
                </Badge>
              </Cluster>
              {boardA[colId].map((card) => (
                <Kanban.Card key={card.id} id={card.id}>
                  <Card padding="sm">{card.title}</Card>
                </Kanban.Card>
              ))}
            </Kanban.Column>
          ))}
        </Kanban>
      </Example>

      <Example
        title="Cards with Handle + DropdownMenu"
        description="Use Kanban.Handle when cards contain interactive elements. The grip is the only drag-initiator; the internal menu stays clickable."
        code={`<Kanban onMove={handleMove}>
  {(['todo', 'doing', 'done'] as const).map((colId) => (
    <Kanban.Column key={colId} id={colId}>
      <Cluster justify="between" align="center">
        <Title order={3} size="sm">{COL_TITLES[colId]}</Title>
        <Badge tone="neutral" size="sm">{board[colId].length}</Badge>
      </Cluster>
      {board[colId].map((card) => (
        <Kanban.Card key={card.id} id={card.id}>
          <Card padding="sm">
            <Cluster justify="between" align="center">
              <Cluster gap="sm" align="center">
                <Kanban.Handle aria-label={\`Reorder \${card.title}\`}>
                  <GripVertical size={14} />
                </Kanban.Handle>
                <Text weight="medium">{card.title}</Text>
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
        </Kanban.Card>
      ))}
    </Kanban.Column>
  ))}
</Kanban>`}
      >
        <Kanban onMove={handleMoveB}>
          {(['todo', 'doing', 'done'] as const).map((colId) => (
            <Kanban.Column key={colId} id={colId}>
              <Cluster justify="between" align="center">
                <Title order={3} size="sm">
                  {COL_TITLES[colId]}
                </Title>
                <Badge tone="neutral" size="sm">
                  {boardB[colId].length}
                </Badge>
              </Cluster>
              {boardB[colId].map((card) => (
                <Kanban.Card key={card.id} id={card.id}>
                  <Card padding="sm">
                    <Cluster justify="between" align="center">
                      <Cluster gap="sm" align="center">
                        <Kanban.Handle aria-label={`Reorder ${card.title}`}>
                          <GripVertical size={14} />
                        </Kanban.Handle>
                        <Text weight="medium">{card.title}</Text>
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
                </Kanban.Card>
              ))}
            </Kanban.Column>
          ))}
        </Kanban>
      </Example>

      <Stack gap="xs">
        <Title order={3} size="md">
          Implementation notes
        </Title>
        <Text size="sm" tone="muted">
          Each Column is a SortableContext; the Root provides a single shared DndContext spanning
          all columns. Cards reflow live during cross-column drag — internal Kanban state mutates on
          dragOver; consumer's onMove fires once on drop with the diff. Keyboard reorder works
          within a column only (dnd-kit's stock coordinateGetter is per-SortableContext).
        </Text>
      </Stack>
    </DemoLayout>
  );
}
