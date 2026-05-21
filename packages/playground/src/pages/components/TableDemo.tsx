import { useState } from 'react';
import { Table, Badge } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Table/Table.tsx?raw';
import scssSource from '@lib-source/components/Table/Table.module.scss?raw';

interface Row {
  id: string;
  name: string;
  status: 'Active' | 'Pending' | 'Archived';
  amount: number;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Acme Corp', status: 'Active', amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', status: 'Pending', amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', status: 'Active', amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', status: 'Archived', amount: 800 },
  { id: 'e', name: 'Echo Logistics', status: 'Active', amount: 7_900 },
];

const STATUS_TONE: Record<Row['status'], 'success' | 'warning' | 'neutral'> = {
  Active: 'success',
  Pending: 'warning',
  Archived: 'neutral',
};

function StaticTable() {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {ROWS.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>
              <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
            </Table.Cell>
            <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function SortableTable() {
  const [sortKey, setSortKey] = useState<'name' | 'amount'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...ROWS].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'amount') return (a.amount - b.amount) * dir;
    return a.name.localeCompare(b.name) * dir;
  });

  function dirFor(key: 'name' | 'amount') {
    if (sortKey !== key) return 'none' as const;
    return sortDir;
  }

  function toggle(key: 'name' | 'amount') {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell sortDirection={dirFor('name')} onClick={() => toggle('name')}>
            Company
          </Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell
            align="end"
            sortDirection={dirFor('amount')}
            onClick={() => toggle('amount')}
          >
            Amount
          </Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sorted.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>
              <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
            </Table.Cell>
            <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function SelectableTable() {
  const [selectedId, setSelectedId] = useState<string | null>('c');

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {ROWS.map((row) => (
          <Table.Row
            key={row.id}
            selected={selectedId === row.id}
            onClick={() => setSelectedId(row.id)}
            style={{ cursor: 'pointer' }}
          >
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

export function TableDemo() {
  return (
    <DemoLayout
      name="Table"
      componentName="Table"
      description="Tabular data primitive — compound subcomponents (Table.Header, Table.Body, Table.Row, Table.Cell, Table.HeaderCell, Table.Caption, Table.Footer) over native HTML semantics. Density, hover, striped, sticky-header, and sort-indicator visuals; data behavior (sort/filter/pagination) is the consumer's job."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Table.tsx"
      scssFilename="Table.module.scss"
    >
      <Example
        title="Default"
        description="Comfortable density, hover on, no stripes. Native `<table>` semantics throughout."
        code={`<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Company</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
      <Table.HeaderCell align="end">Amount</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {rows.map((r) => (
      <Table.Row key={r.id}>
        <Table.Cell>{r.name}</Table.Cell>
        <Table.Cell><Badge tone={...}>{r.status}</Badge></Table.Cell>
        <Table.Cell align="end">\${r.amount.toLocaleString()}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>`}
      >
        <StaticTable />
      </Example>

      <Example
        title="Dense"
        description="24px row, 8px cell padding, `font-size-sm`. Useful for inline tables inside cards or narrow side panels."
        code={`<Table density="dense">{...}</Table>`}
      >
        <Table density="dense">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell align="end">Amount</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ROWS.slice(0, 3).map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Example>

      <Example
        title="Striped + hover"
        description="Zebra stripes on even body rows. Hover is on by default; pass `hover={false}` to disable."
        code={`<Table striped>{...}</Table>`}
      >
        <Table striped>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell align="end">Amount</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ROWS.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Example>

      <Example
        title="Sortable headers"
        description="`<Table.HeaderCell sortDirection>` renders a chevron + sets `aria-sort`. The primitive only paints the indicator — wire `onClick` to your own sort state. (DataTable will compose this seam.)"
        code={`<Table.HeaderCell
  sortDirection={sortKey === 'amount' ? sortDir : 'none'}
  onClick={() => toggleSort('amount')}
>
  Amount
</Table.HeaderCell>`}
      >
        <SortableTable />
      </Example>

      <Example
        title="Selected row"
        description="`<Table.Row selected>` paints a tinted bg + sets `aria-selected`. Click any row to select it (consumer-owned state)."
        code={`<Table.Row selected={isSelected(row.id)} onClick={() => select(row.id)}>
  {...}
</Table.Row>`}
      >
        <SelectableTable />
      </Example>

      <Example
        title="Sticky header"
        description="`stickyHeader` keeps the header row visible while body rows scroll. Requires a scrollable ancestor — the default outer wrapper provides one."
        code={`<div style={{ maxHeight: 200, overflow: 'auto' }}>
  <Table stickyHeader scroll={false}>{...}</Table>
</div>`}
      >
        <div
          style={{
            maxHeight: 200,
            overflow: 'auto',
            border: 'var(--border-width) solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Table stickyHeader scroll={false}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Company</Table.HeaderCell>
                <Table.HeaderCell align="end">Amount</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {[...ROWS, ...ROWS, ...ROWS].map((row, i) => (
                <Table.Row key={`${row.id}-${i}`}>
                  <Table.Cell>{row.name}</Table.Cell>
                  <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Example>

      <Example
        title="Truncated cell"
        description="`<Table.Cell truncate>` ellipsizes overflow text. Requires a constrained cell width — set `style={{ maxWidth }}` on the cell or `<col>` width on the column."
        code={`<Table.Cell truncate style={{ maxWidth: 180 }}>{longString}</Table.Cell>`}
      >
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell style={{ width: 180 }}>Subject</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell truncate style={{ maxWidth: 180 }}>
                Q4 strategy: revisit the long-tail growth bets and align with platform launches
              </Table.Cell>
              <Table.Cell>
                <Badge tone="warning">Pending</Badge>
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell truncate style={{ maxWidth: 180 }}>
                Short subject
              </Table.Cell>
              <Table.Cell>
                <Badge tone="success">Active</Badge>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Example>
    </DemoLayout>
  );
}
