import { useState } from 'react';
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
  { id: 'd1', name: 'Acme renewal',       stage: 'Negotiation', amount: 12000, owner: 'Sara' },
  { id: 'd2', name: 'Globex expansion',   stage: 'Lead',        amount: 4500,  owner: 'Marcus' },
  { id: 'd3', name: 'Initech onboarding', stage: 'Won',         amount: 8800,  owner: 'Sara' },
  { id: 'd4', name: 'Hooli pilot',        stage: 'Lost',        amount: 0,     owner: 'Jin' },
];

const dealColumns: ColumnDef<Deal>[] = [
  { id: 'name',   header: 'Deal',   cell: (r) => r.name,                                                         sortable: true, size: 200 },
  { id: 'stage',  header: 'Stage',  cell: (r) => <Badge tone={stageTone(r.stage)}>{r.stage}</Badge>,              size: 140 },
  { id: 'amount', header: 'Amount', cell: (r) => `$${r.amount.toLocaleString()}`, align: 'end', sortable: true,   size: 120 },
  { id: 'owner',  header: 'Owner',  cell: (r) => r.owner,                                                         size: 120 },
];

function stageTone(stage: Deal['stage']) {
  switch (stage) {
    case 'Won':         return 'success' as const;
    case 'Lost':        return 'danger' as const;
    case 'Negotiation': return 'warning' as const;
    default:            return 'info' as const;
  }
}

export function DataTableDemo() {
  return (
    <DemoLayout
      name="DataTable"
      description="Composition over the Table primitive with column ordering / sizing / visibility, row selection, row click, sortable headers, and loading/empty states. Phase 1 — column pinning and expandable rows ship in later phases."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DataTable.tsx"
      scssFilename="DataTable.module.scss"
    >
      <BasicExample />
      <SortableExample />
      <SelectableExample />
      <VisibilityExample />
      <LoadingExample />
      <EmptyExample />
    </DemoLayout>
  );
}

function BasicExample() {
  return (
    <Example
      title="Basic"
      description="Default DataTable with sticky header, hover rows, and resizable + reorderable columns. Click any header label to sort. Hover over a header to reveal the drag grip."
      code={`const instance = useDataTable<Deal>({ data, columns, getRowId: (r) => r.id });
return <DataTable instance={instance} aria-label="Deals" />;`}
    >
      <BasicTable />
    </Example>
  );
}

function BasicTable() {
  const instance = useDataTable<Deal>({
    data: deals,
    columns: dealColumns,
    getRowId: (r) => r.id,
  });
  return <DataTable instance={instance} aria-label="Deals (basic)" />;
}

function SortableExample() {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedDeals = sort
    ? [...deals].sort((a, b) => {
        const va = (a as Record<string, unknown>)[sort.columnId] as string | number;
        const vb = (b as Record<string, unknown>)[sort.columnId] as string | number;
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sort.direction === 'asc' ? cmp : -cmp;
      })
    : deals;

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
      description="The demo sorts on the client for illustration, but in real code your onSortChange callback would refetch from the server with the new sort. DataTable does not transform data — it only manages and emits sort state."
      code={`const [sort, setSort] = useState<SortState | null>(null);
const instance = useDataTable({ data, columns, getRowId, sort, onSortChange: setSort });`}
    >
      <DataTable instance={instance} aria-label="Deals (sortable)" />
    </Example>
  );
}

function SelectableExample() {
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const selectedCount = Object.keys(selection).length;

  const instance = useDataTable<Deal>({
    data: deals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    rowSelection: selection,
    onRowSelectionChange: setSelection,
    onRowClick: (row) => alert(`Row clicked: ${row.name}`),
  });

  return (
    <Example
      title="Selection + row click"
      description="enableRowSelection adds a checkbox column. The header checkbox toggles all rows on the current page (indeterminate when partially selected). Clicking elsewhere on a row fires onRowClick — but clicking the checkbox does not."
      code={`const [selection, setSelection] = useState({});
const instance = useDataTable({
  data, columns, getRowId,
  enableRowSelection: true,
  rowSelection: selection,
  onRowSelectionChange: setSelection,
  onRowClick: (row) => navigate(\`/deals/\${row.id}\`),
});`}
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
  const instance = useDataTable<Deal>({
    data: deals,
    columns: dealColumns,
    getRowId: (r) => r.id,
    defaultColumnVisibility: { owner: false },
  });

  return (
    <Example
      title="Column visibility"
      description="ColumnVisibilityTrigger renders a Button → DropdownMenu of CheckboxItems for every column where enableHide is not false. The last visible hidable column is disabled — DataTable always shows at least one data column."
      code={`<Cluster><ColumnVisibilityTrigger instance={instance} /></Cluster>
<DataTable instance={instance} />`}
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
      description="Pass loading to render skeleton rows. loadingRowCount controls how many (default 10)."
      code={`<DataTable instance={instance} loading loadingRowCount={4} />`}
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
      description="When data is empty (and not loading), DataTable shows a default EmptyState. Pass emptyState for a custom one."
      code={`<DataTable instance={instance} aria-label="Deals" />`}
    >
      <DataTable instance={instance} aria-label="Deals (empty)" />
    </Example>
  );
}
