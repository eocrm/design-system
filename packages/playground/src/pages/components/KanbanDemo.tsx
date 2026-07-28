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
type UnevenColId = 'backlog' | 'archive';

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

const UNEVEN_TITLES: Record<UnevenColId, string> = {
  backlog: 'Backlog',
  archive: 'Archive',
};

const INITIAL_UNEVEN: Record<UnevenColId, CardData[]> = {
  backlog: [
    { id: 'lead-1', title: 'Call Acme about renewal' },
    { id: 'lead-2', title: 'Send proposal to Globex' },
    { id: 'lead-3', title: 'Follow up with Initech' },
    { id: 'lead-4', title: 'Demo for Umbrella Corp' },
    { id: 'lead-5', title: 'Qualify Stark Industries' },
    { id: 'lead-6', title: 'Renewal review — Wayne Ent.' },
    { id: 'lead-7', title: 'Pricing question from Hooli' },
    { id: 'lead-8', title: 'Onboard Pied Piper trial' },
    { id: 'lead-9', title: 'Escalation: Vandelay import' },
    { id: 'lead-10', title: 'Intro call with Wonka Co' },
    { id: 'lead-11', title: 'Upsell check-in — Cyberdyne' },
    { id: 'lead-12', title: 'Contract redlines from Oscorp' },
    { id: 'lead-13', title: 'Win-back email to Dunder Mifflin' },
    { id: 'lead-14', title: 'Quote revision for Tyrell' },
  ],
  archive: [],
};

// Eight stages at min-width 260px ≈ 2200px of board — wider than any demo
// viewport, so this Example always overflows and always auto-scrolls (#373).
const PIPELINE: [string, CardData[]][] = [
  [
    'New',
    [
      { id: 'deal-1', title: 'Acme — 40 seats' },
      { id: 'deal-2', title: 'Globex renewal' },
    ],
  ],
  ['Qualified', [{ id: 'deal-3', title: 'Initech pilot' }]],
  ['Discovery', [{ id: 'deal-4', title: 'Umbrella — security review' }]],
  ['Demo', [{ id: 'deal-5', title: 'Stark Industries' }]],
  ['Proposal', [{ id: 'deal-6', title: 'Wayne Ent. — multi-year' }]],
  ['Negotiation', [{ id: 'deal-7', title: 'Hooli — legal redlines' }]],
  ['Closing', [{ id: 'deal-8', title: 'Pied Piper' }]],
  ['Won', [{ id: 'deal-9', title: 'Cyberdyne' }]],
];

const INITIAL_PIPELINE: Record<string, CardData[]> = Object.fromEntries(PIPELINE);

function makeMoveHandler<K extends string>(
  setter: React.Dispatch<React.SetStateAction<Record<K, CardData[]>>>,
) {
  return (event: KanbanMoveEvent) => {
    const { from, to, cardId } = event;
    setter((curr) => {
      const fromCol = from.columnId as K;
      const toCol = to.columnId as K;
      const next = { ...curr };
      for (const k of Object.keys(next) as K[]) next[k] = [...next[k]];
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
  const [boardC, setBoardC] = useState<Record<UnevenColId, CardData[]>>(INITIAL_UNEVEN);
  const [boardD, setBoardD] = useState<Record<string, CardData[]>>(INITIAL_PIPELINE);
  const handleMoveD = useCallback(makeMoveHandler(setBoardD), [setBoardD]);
  const [lastMove, setLastMove] = useState<string>('—');
  const handleMoveA = useCallback(makeMoveHandler(setBoardA), [setBoardA]);
  const handleMoveB = useCallback(makeMoveHandler(setBoardB), [setBoardB]);
  const applyMoveC = useCallback(makeMoveHandler(setBoardC), [setBoardC]);
  const handleMoveC = useCallback(
    (event: KanbanMoveEvent) => {
      setLastMove(
        `${event.cardId}: ${event.from.columnId}[${event.from.index}] → ${event.to.columnId}[${event.to.index}]`,
      );
      applyMoveC(event);
    },
    [applyMoveC],
  );

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
        code={`import { useCallback, useState } from 'react';
import {
  Badge,
  Card,
  Cluster,
  Kanban,
  Title,
  type KanbanMoveEvent,
} from '@eocrm/design-system';

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

export function Demo() {
  const [board, setBoard] = useState<Record<ColId, CardData[]>>(INITIAL_BOARD);

  const handleMove = useCallback((event: KanbanMoveEvent) => {
    const { from, to, cardId } = event;
    setBoard((curr) => {
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
  }, []);

  return (
    <Kanban onMove={handleMove}>
      {(['todo', 'doing', 'done'] as const).map((colId) => (
        <Kanban.Column key={colId} id={colId} aria-label={COL_TITLES[colId]}>
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
    </Kanban>
  );
}`}
      >
        <Kanban onMove={handleMoveA}>
          {(['todo', 'doing', 'done'] as const).map((colId) => (
            <Kanban.Column key={colId} id={colId} aria-label={COL_TITLES[colId]}>
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
        code={`import { useCallback, useState } from 'react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Kanban,
  Text,
  Title,
  type KanbanMoveEvent,
} from '@eocrm/design-system';

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

export function Demo() {
  const [board, setBoard] = useState<Record<ColId, CardData[]>>(INITIAL_BOARD);

  const handleMove = useCallback((event: KanbanMoveEvent) => {
    const { from, to, cardId } = event;
    setBoard((curr) => {
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
  }, []);

  return (
    <Kanban onMove={handleMove}>
      {(['todo', 'doing', 'done'] as const).map((colId) => (
        <Kanban.Column key={colId} id={colId} aria-label={COL_TITLES[colId]}>
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
    </Kanban>
  );
}`}
      >
        <Kanban onMove={handleMoveB}>
          {(['todo', 'doing', 'done'] as const).map((colId) => (
            <Kanban.Column key={colId} id={colId} aria-label={COL_TITLES[colId]}>
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

      <Example
        title="Uneven board (empty column)"
        description="A tall populated column beside an empty one — the empty column stretches to match its sibling's height. Drops anywhere inside the empty column land in it (index 0), even at a Y-position that lines up with a card in the source column."
        code={`import { useCallback, useState } from 'react';
import { Badge, Card, Cluster, Kanban, Title, type KanbanMoveEvent } from '@eocrm/design-system';

const INITIAL: Record<string, { id: string; title: string }[]> = {
  backlog: [
    { id: 'lead-1', title: 'Call Acme about renewal' },
    { id: 'lead-2', title: 'Send proposal to Globex' },
    // ... a long backlog (14 cards) so the board is tall
    { id: 'lead-14', title: 'Quote revision for Tyrell' },
  ],
  archive: [],
};

export function Demo() {
  const [board, setBoard] = useState(INITIAL);

  const handleMove = useCallback((event: KanbanMoveEvent) => {
    const { from, to, cardId } = event;
    setBoard((curr) => {
      const next = { ...curr };
      for (const k of Object.keys(next)) next[k] = [...next[k]];
      const idx = next[from.columnId].findIndex((c) => c.id === cardId);
      if (idx < 0) return curr;
      const [moved] = next[from.columnId].splice(idx, 1);
      next[to.columnId].splice(Math.min(to.index, next[to.columnId].length), 0, moved);
      return next;
    });
  }, []);

  return (
    <Kanban onMove={handleMove}>
      {(['backlog', 'archive'] as const).map((colId) => (
        <Kanban.Column key={colId} id={colId} aria-label={colId}>
          <Cluster justify="between" align="center">
            <Title order={3} size="sm">{colId}</Title>
            <Badge tone="neutral" size="sm">{board[colId].length}</Badge>
          </Cluster>
          {board[colId].map((card) => (
            <Kanban.Card key={card.id} id={card.id}>
              <Card padding="sm">{card.title}</Card>
            </Kanban.Card>
          ))}
        </Kanban.Column>
      ))}
    </Kanban>
  );
}`}
      >
        <Stack gap="sm">
          <Kanban onMove={handleMoveC} data-testid="uneven-board">
            {(['backlog', 'archive'] as const).map((colId) => (
              <Kanban.Column key={colId} id={colId} aria-label={UNEVEN_TITLES[colId]}>
                <Cluster justify="between" align="center">
                  <Title order={3} size="sm">
                    {UNEVEN_TITLES[colId]}
                  </Title>
                  <Badge tone="neutral" size="sm">
                    {boardC[colId].length}
                  </Badge>
                </Cluster>
                {boardC[colId].map((card) => (
                  <Kanban.Card key={card.id} id={card.id}>
                    <Card padding="sm">{card.title}</Card>
                  </Kanban.Card>
                ))}
              </Kanban.Column>
            ))}
          </Kanban>
          <Text size="sm" tone="muted" data-testid="uneven-last-move">
            Last onMove: {lastMove}
          </Text>
        </Stack>
      </Example>

      <Example
        title="Wide board (auto-scroll to an off-screen column)"
        description="Eight stages, wider than the page. Drag a card to the right edge and hold: the board scrolls until the last column is reached and then STOPS — the card is bounded by the board's scroll content, so it can't extend scrollWidth and send auto-scroll chasing an edge that keeps receding (#373). Drop into a column that started off-screen to confirm."
        code={`// Nothing to configure — any board wider than its container behaves this way.
// The dragged card is bounded by the board's scrollable content box, so
// scrollLeft plateaus at the real maximum instead of running away.

<Kanban onMove={handleMove}>
  {STAGES.map(([stage, deals]) => (
    <Kanban.Column key={stage} id={stage} aria-label={stage}>
      <Cluster justify="between" align="center">
        <Title order={3} size="sm">{stage}</Title>
        <Badge tone="neutral" size="sm">{deals.length}</Badge>
      </Cluster>
      {deals.map((deal) => (
        <Kanban.Card key={deal.id} id={deal.id}>
          <Card padding="sm">{deal.title}</Card>
        </Kanban.Card>
      ))}
    </Kanban.Column>
  ))}
</Kanban>`}
      >
        <Kanban onMove={handleMoveD} data-testid="wide-board">
          {PIPELINE.map(([stage]) => (
            <Kanban.Column key={stage} id={stage} aria-label={stage}>
              <Cluster justify="between" align="center">
                <Title order={3} size="sm">
                  {stage}
                </Title>
                <Badge tone="neutral" size="sm">
                  {boardD[stage].length}
                </Badge>
              </Cluster>
              {boardD[stage].map((card) => (
                <Kanban.Card key={card.id} id={card.id}>
                  <Card padding="sm">{card.title}</Card>
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
