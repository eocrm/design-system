import { useMemo, useState } from 'react';
import {
  Badge,
  Cluster,
  ColumnVisibilityTrigger,
  DataTable,
  Stack,
  useDataTable,
  type ColumnDef,
  type SortState,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DataTable/DataTable.tsx?raw';
import scssSource from '@lib-source/components/DataTable/DataTable.module.scss?raw';

type Deal = {
  id: string;
  name: string;
  stage: 'Lead' | 'Negotiation' | 'Won' | 'Lost';
  amount: number;
  owner: string;
};

const deals: Deal[] = [
  { id: 'd1', name: 'Acme renewal', stage: 'Negotiation', amount: 12000, owner: 'Sara' },
  { id: 'd2', name: 'Globex expansion', stage: 'Lead', amount: 4500, owner: 'Marcus' },
  { id: 'd3', name: 'Initech onboarding', stage: 'Won', amount: 8800, owner: 'Sara' },
  { id: 'd4', name: 'Hooli pilot', stage: 'Lost', amount: 0, owner: 'Jin' },
];

const dealColumns: ColumnDef<Deal>[] = [
  { id: 'name', header: 'Deal', cell: (r) => r.name, sortable: true, size: 200 },
  {
    id: 'stage',
    header: 'Stage',
    cell: (r) => <Badge tone={stageTone(r.stage)}>{r.stage}</Badge>,
    size: 140,
  },
  {
    id: 'amount',
    header: 'Amount',
    cell: (r) => `$${r.amount.toLocaleString()}`,
    align: 'end',
    sortable: true,
    size: 120,
  },
  { id: 'owner', header: 'Owner', cell: (r) => r.owner, size: 120 },
];

function stageTone(stage: Deal['stage']) {
  switch (stage) {
    case 'Won':
      return 'success' as const;
    case 'Lost':
      return 'danger' as const;
    case 'Negotiation':
      return 'warning' as const;
    default:
      return 'info' as const;
  }
}

// Simulates the server-side sort consumers would wire in real code. Returns
// `data` unchanged when no sort is set; otherwise a stable copy sorted by the
// active column. The DataTable instance receives this presorted slice — the
// component itself never reorders rows.
function useClientSort<T>(data: T[], sort: SortState | null): T[] {
  return useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const va = (a as Record<string, unknown>)[sort.columnId] as string | number;
      const vb = (b as Record<string, unknown>)[sort.columnId] as string | number;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);
}

export function DataTableDemo() {
  return (
    <DemoLayout
      name="DataTable"
      componentName="DataTable"
      description="Composition over the Table primitive with column ordering / sizing / visibility, row selection, row click, sortable headers, loading/empty states, plus left/right column pinning and pinned rows (Phase 2). Expandable rows ship in Phase 3."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DataTable.tsx"
      scssFilename="DataTable.module.scss"
    >
      <BasicExample />
      <BorderedExample />
      <DenseExample />
      <SortableExample />
      <SelectableExample />
      <VisibilityExample />
      <LoadingExample />
      <EmptyExample />
      <PinningExample />
      <WidePinningExample />
      <PinnedRowsExample />
    </DemoLayout>
  );
}

// Shared columns snippet repeated in every example's `code` prop so the
// "Show code" panel for each variant displays the full table instance setup,
// not just the prop being demonstrated.
const COLUMNS_SNIPPET = `const dealColumns: ColumnDef<Deal>[] = [
  { id: 'name',   header: 'Deal',   cell: (r) => r.name, sortable: true, size: 200 },
  { id: 'stage',  header: 'Stage',  cell: (r) => <Badge tone={stageTone(r.stage)}>{r.stage}</Badge>, size: 140 },
  { id: 'amount', header: 'Amount', cell: (r) => \`$\${r.amount.toLocaleString()}\`, align: 'end', sortable: true, size: 120 },
  { id: 'owner',  header: 'Owner',  cell: (r) => r.owner, size: 120 },
];`;

function BasicExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);
  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    sort,
    onSortChange: setSort,
  });
  return (
    <Example
      title="Basic"
      description="Default DataTable with sticky header, hover rows, resizable + reorderable columns, and click-to-sort on `Deal` / `Amount`. Hover a header to reveal the drag grip."
      code={`${COLUMNS_SNIPPET}

const [sort, setSort] = useState<SortState | null>(null);
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  sort, onSortChange: setSort,
});

return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <DataTable instance={instance} aria-label="Deals (basic)" />
    </Example>
  );
}

function BorderedExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);
  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    sort,
    onSortChange: setSort,
  });
  return (
    <Example
      title="Bordered"
      description="Pass `bordered` for a full grid of cell borders. Useful for data-dense numeric tables or surfaces without zebra striping."
      code={`${COLUMNS_SNIPPET}

const [sort, setSort] = useState<SortState | null>(null);
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  sort, onSortChange: setSort,
});

return <DataTable instance={instance} bordered aria-label="Deals" />;`}
    >
      <DataTable instance={instance} bordered aria-label="Deals (bordered)" />
    </Example>
  );
}

function DenseExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);
  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    sort,
    onSortChange: setSort,
  });
  return (
    <Example
      title="Dense"
      description="`density='dense'` reduces row height and cell padding — useful for data-heavy screens where vertical space is at a premium."
      code={`${COLUMNS_SNIPPET}

const [sort, setSort] = useState<SortState | null>(null);
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  sort, onSortChange: setSort,
});

return <DataTable instance={instance} density="dense" aria-label="Deals" />;`}
    >
      <DataTable instance={instance} density="dense" aria-label="Deals (dense)" />
    </Example>
  );
}

function SortableExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);

  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    sort,
    onSortChange: setSort,
  });

  return (
    <Example
      title="Server-driven sort (simulated)"
      description="The demo sorts on the client for illustration, but in real code your `onSortChange` callback would refetch from the server with the new sort. DataTable does not transform data — it only manages and emits sort state."
      code={`${COLUMNS_SNIPPET}

const [sort, setSort] = useState<SortState | null>(null);

// In real code: refetch from the server with { sort } on change.
// Demo: sort on the client so the effect is visible without a backend.
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  sort, onSortChange: setSort,
});

return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <DataTable instance={instance} aria-label="Deals (sortable)" />
    </Example>
  );
}

function SelectableExample() {
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const selectedCount = Object.keys(selection).length;
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);

  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    rowSelection: selection,
    onRowSelectionChange: setSelection,
    sort,
    onSortChange: setSort,
    onRowClick: (row) => alert(`Row clicked: ${row.name}`),
  });

  return (
    <Example
      title="Selection + row click"
      description="`enableRowSelection` adds a checkbox column. The header checkbox toggles all rows on the current page (indeterminate when partially selected). Clicking elsewhere on a row fires `onRowClick` — but clicking the checkbox does not."
      code={`${COLUMNS_SNIPPET}

const [selection, setSelection] = useState({});
const [sort, setSort] = useState<SortState | null>(null);
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  enableRowSelection: true,
  rowSelection: selection,
  onRowSelectionChange: setSelection,
  sort, onSortChange: setSort,
  onRowClick: (row) => navigate(\`/deals/\${row.id}\`),
});

return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <Stack gap="sm">
        <Cluster gap="sm">
          <span>{selectedCount} selected</span>
        </Cluster>
        <DataTable instance={instance} aria-label="Deals (selectable)" />
      </Stack>
    </Example>
  );
}

function VisibilityExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);
  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    defaultColumnVisibility: { owner: false },
    sort,
    onSortChange: setSort,
  });

  return (
    <Example
      title="Column visibility"
      description="`ColumnVisibilityTrigger` renders a Button → DropdownMenu of CheckboxItems for every column where `enableHide` is not false. The last visible hidable column is disabled — DataTable always shows at least one data column."
      code={`${COLUMNS_SNIPPET}

const [sort, setSort] = useState<SortState | null>(null);
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  defaultColumnVisibility: { owner: false },
  sort, onSortChange: setSort,
});

return (
  <Stack gap="sm">
    <Cluster gap="sm">
      <ColumnVisibilityTrigger instance={instance} />
    </Cluster>
    <DataTable instance={instance} aria-label="Deals" />
  </Stack>
);`}
    >
      <Stack gap="sm">
        <Cluster gap="sm">
          <ColumnVisibilityTrigger instance={instance} />
        </Cluster>
        <DataTable instance={instance} aria-label="Deals (visibility)" />
      </Stack>
    </Example>
  );
}

function LoadingExample() {
  const instance = useDataTable<Deal>({
    data: [],
    columns: dealColumns,
    getRowId: (r) => r.id,
  });
  return (
    <Example
      title="Loading"
      description="Pass `loading` to render skeleton rows. `loadingRowCount` controls how many (default 10)."
      code={`${COLUMNS_SNIPPET}

const instance = useDataTable<Deal>({
  data: [], // server hasn't responded yet
  columns: dealColumns,
  getRowId: (r) => r.id,
});

return <DataTable instance={instance} loading loadingRowCount={4} aria-label="Deals" />;`}
    >
      <DataTable instance={instance} loading loadingRowCount={4} aria-label="Loading" />
    </Example>
  );
}

function EmptyExample() {
  const instance = useDataTable<Deal>({
    data: [],
    columns: dealColumns,
    getRowId: (r) => r.id,
  });
  return (
    <Example
      title="Empty"
      description="When `data` is empty and `loading` is false, DataTable shows a default `<EmptyState>`. Pass `emptyState` for a custom one."
      code={`${COLUMNS_SNIPPET}

const instance = useDataTable<Deal>({
  data: [],
  columns: dealColumns,
  getRowId: (r) => r.id,
});

return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <DataTable instance={instance} aria-label="Deals (empty)" />
    </Example>
  );
}

function PinningExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);
  const instance = useDataTable<Deal>({
    data: sortedDeals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    defaultColumnPinning: { left: ['name'], right: ['amount'] },
    sort,
    onSortChange: setSort,
  });

  return (
    <Example
      title="Column pinning (left + right)"
      description="Pin a column to the left or right with `columnPinning`. Left-pinned columns stick to the left edge during horizontal scroll; right-pinned to the right. The selection auto-column is always sticky-left at offset 0. Pinned columns are locked in position (no drag grip) but `Amount` sort still works. No built-in pin/unpin UI — wire your own via `instance.pinColumn(id, side)`."
      code={`${COLUMNS_SNIPPET}

const [sort, setSort] = useState<SortState | null>(null);
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,
  columns: dealColumns,
  getRowId: (r) => r.id,
  enableRowSelection: true,
  defaultColumnPinning: { left: ['name'], right: ['amount'] },
  sort, onSortChange: setSort,
});

return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <DataTable instance={instance} aria-label="Deals (pinning)" />
    </Example>
  );
}

// --- Wide-table fixture for the pinning-in-action example ---------------

type WideDeal = {
  id: string;
  name: string;
  stage: Deal['stage'];
  amount: number;
  owner: string;
  region: string;
  source: string;
  closeDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  lastActivity: string;
  priority: 'Low' | 'Med' | 'High';
  nextStep: string;
  actions: string;
};

const wideDeals: WideDeal[] = [
  {
    id: 'w1',
    name: 'Acme renewal',
    stage: 'Negotiation',
    amount: 12000,
    owner: 'Sara',
    region: 'EMEA',
    source: 'Inbound',
    closeDate: '2026-06-14',
    contactName: 'Wile E. Coyote',
    contactEmail: 'wile@acme.test',
    contactPhone: '+1 555 0101',
    lastActivity: '2d ago',
    priority: 'High',
    nextStep: 'Send contract',
    actions: '⋯',
  },
  {
    id: 'w2',
    name: 'Globex expansion',
    stage: 'Lead',
    amount: 4500,
    owner: 'Marcus',
    region: 'NA',
    source: 'Referral',
    closeDate: '2026-07-02',
    contactName: 'Hank Scorpio',
    contactEmail: 'hank@globex.test',
    contactPhone: '+1 555 0102',
    lastActivity: '5h ago',
    priority: 'Med',
    nextStep: 'Discovery call',
    actions: '⋯',
  },
  {
    id: 'w3',
    name: 'Initech onboarding',
    stage: 'Won',
    amount: 8800,
    owner: 'Sara',
    region: 'NA',
    source: 'Event',
    closeDate: '2026-05-30',
    contactName: 'Bill Lumbergh',
    contactEmail: 'bill@initech.test',
    contactPhone: '+1 555 0103',
    lastActivity: '1d ago',
    priority: 'Med',
    nextStep: 'Kickoff scheduling',
    actions: '⋯',
  },
  {
    id: 'w4',
    name: 'Hooli pilot',
    stage: 'Lost',
    amount: 0,
    owner: 'Jin',
    region: 'APAC',
    source: 'Outbound',
    closeDate: '2026-05-10',
    contactName: 'Gavin Belson',
    contactEmail: 'gavin@hooli.test',
    contactPhone: '+1 555 0104',
    lastActivity: '3w ago',
    priority: 'Low',
    nextStep: 'Send post-mortem',
    actions: '⋯',
  },
];

const wideDealColumns: ColumnDef<WideDeal>[] = [
  { id: 'name', header: 'Deal', cell: (r) => r.name, sortable: true, size: 220 },
  {
    id: 'stage',
    header: 'Stage',
    cell: (r) => <Badge tone={stageTone(r.stage)}>{r.stage}</Badge>,
    size: 140,
  },
  { id: 'owner', header: 'Owner', cell: (r) => r.owner, size: 120 },
  { id: 'region', header: 'Region', cell: (r) => r.region, size: 100 },
  { id: 'source', header: 'Source', cell: (r) => r.source, size: 140 },
  { id: 'closeDate', header: 'Close date', cell: (r) => r.closeDate, size: 130 },
  { id: 'contactName', header: 'Contact', cell: (r) => r.contactName, size: 180 },
  { id: 'contactEmail', header: 'Email', cell: (r) => r.contactEmail, size: 200 },
  { id: 'contactPhone', header: 'Phone', cell: (r) => r.contactPhone, size: 150 },
  { id: 'lastActivity', header: 'Last activity', cell: (r) => r.lastActivity, size: 140 },
  { id: 'priority', header: 'Priority', cell: (r) => r.priority, size: 100 },
  { id: 'nextStep', header: 'Next step', cell: (r) => r.nextStep, size: 200 },
  {
    id: 'amount',
    header: 'Amount',
    cell: (r) => `$${r.amount.toLocaleString()}`,
    align: 'end',
    sortable: true,
    size: 130,
  },
  { id: 'actions', header: '', cell: (r) => r.actions, align: 'center', size: 56 },
];

function WidePinningExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedWideDeals = useClientSort(wideDeals, sort);
  const instance = useDataTable<WideDeal>({
    data: sortedWideDeals,
    columns: wideDealColumns,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    defaultColumnPinning: { left: ['name'], right: ['amount', 'actions'] },
    sort,
    onSortChange: setSort,
  });

  return (
    <Example
      title="Column pinning — wide table (scroll horizontally)"
      description="With ~14 columns totalling well past viewport width, the underlying `<Table>` scroll wrapper kicks in and you can drag the scrollbar horizontally. The left-pinned `Deal` column and the right-pinned `Amount` + `actions` columns stay locked while the middle scrolls. Selection auto-column is sticky-left at offset 0 — left-pinned data columns stack to the right of it. `Deal` and `Amount` are still click-to-sort."
      code={`// 14-column WideDeal type with id, name, stage, amount, owner, region,
// source, closeDate, contactName, contactEmail, contactPhone,
// lastActivity, priority, nextStep, actions.
const wideDealColumns: ColumnDef<WideDeal>[] = [
  { id: 'name',   header: 'Deal',   cell: (r) => r.name, sortable: true, size: 220 },
  { id: 'stage',  header: 'Stage',  cell: (r) => <Badge ...>{r.stage}</Badge>, size: 140 },
  /* ... 10 more middle columns ... */
  { id: 'amount', header: 'Amount', cell: (r) => \`$\${r.amount}\`, align: 'end', sortable: true, size: 130 },
  { id: 'actions', header: '', cell: (r) => r.actions, align: 'center', size: 56 },
];

const [sort, setSort] = useState<SortState | null>(null);
const sortedWideDeals = useClientSort(wideDeals, sort);

const instance = useDataTable<WideDeal>({
  data: sortedWideDeals,
  columns: wideDealColumns,
  getRowId: (r) => r.id,
  enableRowSelection: true,
  defaultColumnPinning: { left: ['name'], right: ['amount', 'actions'] },
  sort, onSortChange: setSort,
});

return <DataTable instance={instance} aria-label="Wide deals" />;`}
    >
      <DataTable instance={instance} aria-label="Wide deals (pinning)" />
    </Example>
  );
}

const STARRED_DEALS: Deal[] = [
  { id: 's1', name: '⭐ Starred deal', stage: 'Won', amount: 50000, owner: 'Sara' },
];

function PinnedRowsExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = useClientSort(deals, sort);

  const instance = useDataTable<Deal>({
    data: sortedDeals,
    pinnedRows: STARRED_DEALS,
    columns: dealColumns,
    getRowId: (r) => r.id,
    sort,
    onSortChange: setSort,
  });

  return (
    <Example
      title="Row pinning (starred-row pattern)"
      description="Pinned rows render in a separate `<tbody>` above the main body and stay anchored across sort and pagination. Sort the `Deal` or `Amount` column — the starred row stays put while the main body reshuffles. Consumer supplies `pinnedRows` as a separate array, typically from a separate server query. Selection inside the pinned section is per-row; the header select-all only touches `data` (the current page)."
      code={`${COLUMNS_SNIPPET}

const starredDeals: Deal[] = [
  { id: 's1', name: '⭐ Starred deal', stage: 'Won', amount: 50000, owner: 'Sara' },
];

const [sort, setSort] = useState<SortState | null>(null);
// In real code: refetch \`data\` from the server with { sort } on change.
const sortedDeals = useClientSort(deals, sort);

const instance = useDataTable<Deal>({
  data: sortedDeals,         // current page from server (sorted)
  pinnedRows: starredDeals,  // separate query — stays put across sort
  columns: dealColumns,
  getRowId: (r) => r.id,
  sort, onSortChange: setSort,
});

return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <DataTable instance={instance} aria-label="Deals (pinned rows)" />
    </Example>
  );
}
