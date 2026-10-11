import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ButtonGroup,
  Card,
  Cluster,
  Stack,
  Switch,
  Text,
  TreeView,
  type TreeViewChildren,
  type TreeViewNode,
  type TreeViewOverflow,
  type TreeViewView,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface Unit {
  id: string;
  label: string;
  members: number;
}

// Org structure: Company -> departments -> teams. Teams are leaves.
const DEPARTMENTS: [string, number, [string, number][]][] = [
  [
    'Sales',
    42,
    [
      ['Inbound', 12],
      ['Outbound', 14],
      ['Key accounts', 9],
      ['Partners', 4],
      ['Renewals', 3],
    ],
  ],
  [
    'Support',
    31,
    [
      ['Tier 1', 14],
      ['Tier 2', 9],
      ['Escalations', 5],
      ['Knowledge base', 3],
    ],
  ],
  [
    'R&D',
    58,
    [
      ['Platform', 16],
      ['Mobile', 12],
      ['Integrations', 11],
      ['Data', 9],
      ['QA', 10],
    ],
  ],
  [
    'Marketing',
    19,
    [
      ['Content', 7],
      ['Events', 5],
      ['Growth', 7],
    ],
  ],
  [
    'Finance',
    11,
    [
      ['Accounting', 6],
      ['Billing', 5],
    ],
  ],
  [
    'People',
    8,
    [
      ['Recruiting', 5],
      ['Payroll', 3],
    ],
  ],
  [
    'Operations',
    16,
    [
      ['Logistics', 9],
      ['Facilities', 7],
    ],
  ],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const TOTAL = DEPARTMENTS.reduce((n, d) => n + d[1], 0);
const COMPANY: Unit = { id: 'company', label: 'Company', members: TOTAL };
const CHILDREN: Record<string, Unit[]> = {
  company: DEPARTMENTS.map(([name, members]) => ({ id: slug(name), label: name, members })),
  ...Object.fromEntries(
    DEPARTMENTS.map(([name, , teams]) => [
      slug(name),
      teams.map(([team, members]) => ({ id: `${slug(name)}/${slug(team)}`, label: team, members })),
    ]),
  ),
};

function toNode(u: Unit): TreeViewNode {
  return {
    id: u.id,
    label: u.label,
    hasChildren: u.id in CHILDREN,
    content: (
      <Stack gap="xs" align="start">
        <Text as="span">{u.label}</Text>
        <Text as="span" size="sm" tone="muted">
          {u.members} members
        </Text>
      </Stack>
    ),
  };
}

const ROOTS = [toNode(COMPANY)];
const staticChildrenOf = (id: string): TreeViewChildren => CHILDREN[id]?.map(toNode);

function toggle(set: ReadonlySet<string>, id: string, open: boolean) {
  const next = new Set(set);
  if (open) next.add(id);
  else next.delete(id);
  return next;
}

const PAGE = 3;
const LATENCY_MS = 800;
type Level = { status: 'loading' | 'error' | 'ready'; shown: number; more?: boolean };

/** Simulates a paged, slow, sometimes failing API for org units. */
function useLazyOrg(failNext: boolean, onFailed: () => void) {
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const failRef = useRef(failNext);
  failRef.current = failNext;
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const fetchLevel = useCallback(
    (id: string, shown: number, more: boolean) => {
      setLevels((l) => ({ ...l, [id]: { status: more ? 'ready' : 'loading', shown, more } }));
      const fail = failRef.current && !more; // decided when the load starts
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        if (fail) {
          onFailed();
          setLevels((l) => ({ ...l, [id]: { status: 'error', shown: 0 } }));
        } else {
          setLevels((l) => ({ ...l, [id]: { status: 'ready', shown: shown + PAGE } }));
        }
      }, LATENCY_MS);
      timers.current.add(timer);
    },
    [onFailed],
  );

  const load = useCallback(
    (id: string) => {
      if (!(id in CHILDREN) || levels[id]?.status === 'ready' || levels[id]?.status === 'loading')
        return;
      fetchLevel(id, 0, false);
    },
    [levels, fetchLevel],
  );

  const retry = useCallback((id: string) => fetchLevel(id, 0, false), [fetchLevel]);

  const childrenOf = (id: string): TreeViewChildren => {
    const lv = levels[id];
    if (lv?.status === 'error') return { error: true };
    if (!lv || lv.status === 'loading') return undefined;
    return CHILDREN[id].slice(0, lv.shown).map(toNode);
  };

  const overflowOf = (parentId: string | null): TreeViewOverflow | null => {
    const lv = parentId ? levels[parentId] : undefined;
    if (!parentId || lv?.status !== 'ready') return null;
    const hidden = CHILDREN[parentId].length - lv.shown;
    if (hidden <= 0 && !lv.more) return null;
    return {
      label: `${hidden} more not shown`,
      loading: lv.more,
      onLoadMore: () => fetchLevel(parentId, lv.shown, true),
    };
  };

  return { load, retry, childrenOf, overflowOf };
}

const views: { value: TreeViewView; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'chart', label: 'Org chart' },
];

export function TreeViewDemo() {
  const [listExpanded, setListExpanded] = useState<ReadonlySet<string>>(() => new Set(['company']));
  const [listSelected, setListSelected] = useState<string | null>('sales');

  const [chartExpanded, setChartExpanded] = useState<ReadonlySet<string>>(
    () => new Set(['company', 'sales']),
  );
  const [chartSelected, setChartSelected] = useState<string | null>(null);

  const [view, setView] = useState<TreeViewView>('list');
  const [failNext, setFailNext] = useState(false);
  const clearFail = useCallback(() => setFailNext(false), []);
  const lazy = useLazyOrg(failNext, clearFail);
  const [lazyExpanded, setLazyExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [lazySelected, setLazySelected] = useState<string | null>(null);

  const [refExpanded, setRefExpanded] = useState<ReadonlySet<string>>(
    () => new Set(['company', 'r-d']),
  );

  return (
    <DemoLayout
      name="TreeView"
      componentName="TreeView"
      description="Lazily loaded hierarchy, as a file-explorer list or a top-down org chart: keyboard, selection, and loading / error / 'N more' rows."
      files={getComponentFiles('TreeView')}
    >
      <Example
        title="List"
        description="Static org data with selection. Arrow keys move, Right / Left expand and collapse, Enter or Space select. content is visual only: name plus a muted member count."
        code={`<TreeView
  aria-label="Organization structure"
  roots={[companyNode]}
  childrenOf={(id) => CHILDREN[id]?.map(toNode)}
  expandedIds={expanded}
  onExpandedChange={(id, open) => setExpanded((s) => toggle(s, id, open))}
  selectedId={selected}
  onSelect={setSelected}
/>

// node.content
<Stack gap="xs" align="start">
  <Text as="span">{u.label}</Text>
  <Text as="span" size="sm" tone="muted">{u.members} members</Text>
</Stack>`}
      >
        <TreeView
          aria-label="Organization structure"
          roots={ROOTS}
          childrenOf={staticChildrenOf}
          expandedIds={listExpanded}
          onExpandedChange={(id, open) => setListExpanded((s) => toggle(s, id, open))}
          selectedId={listSelected}
          onSelect={setListSelected}
        />
      </Example>

      <Example
        title="Org chart"
        fullWidth
        description="The same data with view='chart'. It fills the card's width and scrolls horizontally inside itself; spatial keys: Down into children, Up to the parent, Left / Right between siblings."
        code={`<Card>
  <TreeView view="chart" aria-label="Organization chart" roots={[companyNode]} ... />
</Card>`}
      >
        <Card>
          <TreeView
            view="chart"
            aria-label="Organization chart"
            roots={ROOTS}
            childrenOf={staticChildrenOf}
            expandedIds={chartExpanded}
            onExpandedChange={(id, open) => setChartExpanded((s) => toggle(s, id, open))}
            selectedId={chartSelected}
            onSelect={setChartSelected}
          />
        </Card>
      </Example>

      <Example
        title="Lazy loading"
        fullWidth
        description="Each level loads on first expand (800ms), in pages of 3 with a 'N more not shown' row. Switch on 'Fail next load', then expand a node to see the error row and Retry. The toggle swaps the view and keeps expanded and selected state."
        code={`<TreeView
  view={view}
  aria-label="Organization structure"
  roots={[companyNode]}
  childrenOf={(id) => {
    const level = levels[id];
    if (level?.status === 'error') return { error: true };
    if (!level || level.status === 'loading') return undefined; // "Loading…"
    return CHILDREN[id].slice(0, level.shown).map(toNode);
  }}
  expandedIds={expanded}
  onExpandedChange={(id, open) => {
    setExpanded((s) => toggle(s, id, open));
    if (open) load(id);
  }}
  selectedId={selected}
  onSelect={setSelected}
  onRetry={retry}
  overflowOf={(parentId) => {
    const level = parentId ? levels[parentId] : undefined;
    if (!parentId || level?.status !== 'ready') return null;
    const hidden = CHILDREN[parentId].length - level.shown;
    if (hidden <= 0 && !level.more) return null; // nothing left: no row
    return {
      label: \`\${hidden} more not shown\`,
      loading: level.more,
      onLoadMore: () => fetchLevel(parentId, level.shown, true), // fetchLevel: your paged API call
    };
  }}
/>

// levels, CHILDREN, load, retry, toNode, toggle: see the demo source for the simulated API`}
      >
        <Stack gap="md">
          <Cluster gap="md">
            <ButtonGroup
              aria-label="View"
              value={view}
              onValueChange={(v) => setView(v as TreeViewView)}
            >
              {views.map((v) => (
                <ButtonGroup.Item key={v.value} value={v.value}>
                  {v.label}
                </ButtonGroup.Item>
              ))}
            </ButtonGroup>
            <Switch checked={failNext} onChange={setFailNext}>
              Fail next load
            </Switch>
          </Cluster>
          <Card>
            <TreeView
              view={view}
              aria-label="Organization structure (lazy)"
              roots={ROOTS}
              childrenOf={lazy.childrenOf}
              expandedIds={lazyExpanded}
              onExpandedChange={(id, open) => {
                setLazyExpanded((s) => toggle(s, id, open));
                if (open) lazy.load(id);
              }}
              selectedId={lazySelected}
              onSelect={setLazySelected}
              onRetry={lazy.retry}
              overflowOf={lazy.overflowOf}
            />
          </Card>
        </Stack>
      </Example>

      <Example
        title="Without selection"
        description="Omit onSelect for a reference tree: no aria-selected, rows only expand and collapse."
        code={`<TreeView aria-label="Organization structure" roots={[companyNode]}
  childrenOf={...} expandedIds={expanded} onExpandedChange={...} />`}
      >
        <TreeView
          aria-label="Organization structure (reference)"
          roots={ROOTS}
          childrenOf={staticChildrenOf}
          expandedIds={refExpanded}
          onExpandedChange={(id, open) => setRefExpanded((s) => toggle(s, id, open))}
        />
      </Example>
    </DemoLayout>
  );
}
