import { useState } from 'react';
import { Table, Badge } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

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

type SortKey = 'name' | 'amount';
type SortState = { key: SortKey; dir: 'asc' | 'desc' } | null;

function SortableTable() {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = sort
    ? [...ROWS].sort((a, b) => {
        const factor = sort.dir === 'asc' ? 1 : -1;
        if (sort.key === 'amount') return (a.amount - b.amount) * factor;
        return a.name.localeCompare(b.name) * factor;
      })
    : ROWS;

  function dirFor(key: SortKey) {
    if (sort?.key !== key) return 'none' as const;
    return sort.dir;
  }

  // 3-state toggle: unsorted → asc → desc → unsorted → …
  function toggle(key: SortKey) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
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
    <Table hover>
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
      files={getComponentFiles('Table')}
    >
      <Example
        title="Default"
        description="Comfortable density, hover on, no stripes. Native `<table>` semantics throughout."
        code={`import { Badge, Table } from '@eocrm/design-system';

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

export function StaticTable() {
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
            <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}`}
      >
        <StaticTable />
      </Example>

      <Example
        title="Dense"
        description="24px row, 8px cell padding, `font-size-sm`. Useful for inline tables inside cards or narrow side panels."
        code={`import { Table } from '@eocrm/design-system';

const rows = [
  { id: 'a', name: 'Acme Corp', amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', amount: 28_400 },
];

export function Demo() {
  return (
    <Table density="dense">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}`}
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
        description="Zebra stripes on even body rows + opt-in hover affordance. Both default off — use them together when the table represents a list of selectable rows."
        code={`import { Table } from '@eocrm/design-system';

const rows = [
  { id: 'a', name: 'Acme Corp', amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', amount: 800 },
  { id: 'e', name: 'Echo Logistics', amount: 7_900 },
];

export function Demo() {
  return (
    <Table striped hover>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}`}
      >
        <Table striped hover>
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
        title="Bordered"
        description="Full-grid borders (outer + vertical between cells). Default is Atlassian-minimal (just row dividers + header underline); pass `bordered` for the heavier admin-screen look."
        code={`import { Badge, Table } from '@eocrm/design-system';

const rows = [
  { id: 'a', name: 'Acme Corp', status: 'Active' as const, amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', status: 'Pending' as const, amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', status: 'Active' as const, amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', status: 'Archived' as const, amount: 800 },
  { id: 'e', name: 'Echo Logistics', status: 'Active' as const, amount: 7_900 },
];

const STATUS_TONE = {
  Active: 'success',
  Pending: 'warning',
  Archived: 'neutral',
} as const;

export function Demo() {
  return (
    <Table bordered>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>
              <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
            </Table.Cell>
            <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}`}
      >
        <Table bordered>
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
      </Example>

      <Example
        title="Sortable headers"
        description="`<Table.HeaderCell sortDirection>` renders the right chevron + sets `aria-sort`. The primitive only paints — wire `onClick` to your own state. Demo uses the typical 3-state cycle (unsorted → asc → desc → unsorted), but consumers can use any cycle. DataTable will compose this seam."
        code={`import { useState } from 'react';
import { Badge, Table } from '@eocrm/design-system';

const ROWS = [
  { id: 'a', name: 'Acme Corp', status: 'Active' as const, amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', status: 'Pending' as const, amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', status: 'Active' as const, amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', status: 'Archived' as const, amount: 800 },
  { id: 'e', name: 'Echo Logistics', status: 'Active' as const, amount: 7_900 },
];

const STATUS_TONE = {
  Active: 'success',
  Pending: 'warning',
  Archived: 'neutral',
} as const;

type SortKey = 'name' | 'amount';
type SortState = { key: SortKey; dir: 'asc' | 'desc' } | null;

export function SortableTable() {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = sort
    ? [...ROWS].sort((a, b) => {
        const factor = sort.dir === 'asc' ? 1 : -1;
        if (sort.key === 'amount') return (a.amount - b.amount) * factor;
        return a.name.localeCompare(b.name) * factor;
      })
    : ROWS;

  function dirFor(key: SortKey) {
    if (sort?.key !== key) return 'none' as const;
    return sort.dir;
  }

  function toggle(key: SortKey) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
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
            <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}`}
      >
        <SortableTable />
      </Example>

      <Example
        title="Selected row"
        description="`<Table.Row selected>` paints a tinted bg + sets `aria-selected`. Click any row to select it (consumer-owned state)."
        code={`import { useState } from 'react';
import { Table } from '@eocrm/design-system';

const ROWS = [
  { id: 'a', name: 'Acme Corp', amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', amount: 800 },
  { id: 'e', name: 'Echo Logistics', amount: 7_900 },
];

export function SelectableTable() {
  const [selectedId, setSelectedId] = useState<string | null>('c');

  return (
    <Table hover>
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
            <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}`}
      >
        <SelectableTable />
      </Example>

      <Example
        title="Sticky header"
        description="`stickyHeader` keeps the header row visible while body rows scroll. Requires a scrollable ancestor — the default outer wrapper provides one."
        code={`import { Table } from '@eocrm/design-system';

const rows = [
  { id: 'a', name: 'Acme Corp', amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', amount: 800 },
  { id: 'e', name: 'Echo Logistics', amount: 7_900 },
];

export function Demo() {
  return (
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
          {[...rows, ...rows, ...rows].map((row, i) => (
            <Table.Row key={\`\${row.id}-\${i}\`}>
              <Table.Cell>{row.name}</Table.Cell>
              <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}`}
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
        title="Footer with totals"
        description="`<Table.Footer>` (renders `<tfoot>`) is the spot for totals, summary, or pagination chrome. Same `--color-bg-muted` background as the header; doesn't participate in hover/striped."
        code={`import { Badge, Table } from '@eocrm/design-system';

const rows = [
  { id: 'a', name: 'Acme Corp', status: 'Active' as const, amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', status: 'Pending' as const, amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', status: 'Active' as const, amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', status: 'Archived' as const, amount: 800 },
  { id: 'e', name: 'Echo Logistics', status: 'Active' as const, amount: 7_900 },
];

const STATUS_TONE = {
  Active: 'success',
  Pending: 'warning',
  Archived: 'neutral',
} as const;

export function Demo() {
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
        {rows.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>
              <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
            </Table.Cell>
            <Table.Cell align="end">\${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.Cell colSpan={2}>
            <strong>Total</strong>
          </Table.Cell>
          <Table.Cell align="end">
            <strong>\${rows.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</strong>
          </Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table>
  );
}`}
      >
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
          <Table.Footer>
            <Table.Row>
              <Table.Cell colSpan={2}>
                <strong>Total</strong>
              </Table.Cell>
              <Table.Cell align="end">
                <strong>${ROWS.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</strong>
              </Table.Cell>
            </Table.Row>
          </Table.Footer>
        </Table>
      </Example>

      <Example
        title="Grouped header (multi-row, colSpan + rowSpan)"
        description="Native `colSpan` / `rowSpan` work straight through on `<Table.HeaderCell>` and `<Table.Cell>`. Bordered + multi-row header is the typical 'plan vs actual per quarter' shape."
        code={`import { Table } from '@eocrm/design-system';

export function Demo() {
  return (
    <Table bordered>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell rowSpan={2}>Region</Table.HeaderCell>
          <Table.HeaderCell colSpan={2} align="center">
            Q1
          </Table.HeaderCell>
          <Table.HeaderCell colSpan={2} align="center">
            Q2
          </Table.HeaderCell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell align="end">Plan</Table.HeaderCell>
          <Table.HeaderCell align="end">Actual</Table.HeaderCell>
          <Table.HeaderCell align="end">Plan</Table.HeaderCell>
          <Table.HeaderCell align="end">Actual</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>North</Table.Cell>
          <Table.Cell align="end">100</Table.Cell>
          <Table.Cell align="end">95</Table.Cell>
          <Table.Cell align="end">120</Table.Cell>
          <Table.Cell align="end">130</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>South</Table.Cell>
          <Table.Cell align="end">80</Table.Cell>
          <Table.Cell align="end">88</Table.Cell>
          <Table.Cell align="end">90</Table.Cell>
          <Table.Cell align="end">92</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>West</Table.Cell>
          <Table.Cell align="end">60</Table.Cell>
          <Table.Cell align="end">71</Table.Cell>
          <Table.Cell align="end">75</Table.Cell>
          <Table.Cell align="end">68</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}`}
      >
        <Table bordered>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell rowSpan={2}>Region</Table.HeaderCell>
              <Table.HeaderCell colSpan={2} align="center">
                Q1
              </Table.HeaderCell>
              <Table.HeaderCell colSpan={2} align="center">
                Q2
              </Table.HeaderCell>
            </Table.Row>
            <Table.Row>
              <Table.HeaderCell align="end">Plan</Table.HeaderCell>
              <Table.HeaderCell align="end">Actual</Table.HeaderCell>
              <Table.HeaderCell align="end">Plan</Table.HeaderCell>
              <Table.HeaderCell align="end">Actual</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>North</Table.Cell>
              <Table.Cell align="end">100</Table.Cell>
              <Table.Cell align="end">95</Table.Cell>
              <Table.Cell align="end">120</Table.Cell>
              <Table.Cell align="end">130</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>South</Table.Cell>
              <Table.Cell align="end">80</Table.Cell>
              <Table.Cell align="end">88</Table.Cell>
              <Table.Cell align="end">90</Table.Cell>
              <Table.Cell align="end">92</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>West</Table.Cell>
              <Table.Cell align="end">60</Table.Cell>
              <Table.Cell align="end">71</Table.Cell>
              <Table.Cell align="end">75</Table.Cell>
              <Table.Cell align="end">68</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Example>

      <Example
        title="Row grouping (rowSpan in body)"
        description="Use `rowSpan` on a body cell to label a category that owns several rows. Combine with `<th scope='row'>` on the spanning cell if it should be read as a row-header by AT."
        code={`import { Badge, Table } from '@eocrm/design-system';

export function Demo() {
  return (
    <Table bordered>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell rowSpan={3} scope="row">
            <Badge tone="success">Active</Badge>
          </Table.HeaderCell>
          <Table.Cell>Acme Corp</Table.Cell>
          <Table.Cell align="end">$12,500</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Cobalt Studios</Table.Cell>
          <Table.Cell align="end">$28,400</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Echo Logistics</Table.Cell>
          <Table.Cell align="end">$7,900</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">
            <Badge tone="warning">Pending</Badge>
          </Table.HeaderCell>
          <Table.Cell>Beanstalk Ltd</Table.Cell>
          <Table.Cell align="end">$4,200</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row">
            <Badge tone="neutral">Archived</Badge>
          </Table.HeaderCell>
          <Table.Cell>Delta Mfg</Table.Cell>
          <Table.Cell align="end">$800</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}`}
      >
        <Table bordered>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell align="end">Amount</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.HeaderCell rowSpan={3} scope="row">
                <Badge tone="success">Active</Badge>
              </Table.HeaderCell>
              <Table.Cell>Acme Corp</Table.Cell>
              <Table.Cell align="end">$12,500</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Cobalt Studios</Table.Cell>
              <Table.Cell align="end">$28,400</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Echo Logistics</Table.Cell>
              <Table.Cell align="end">$7,900</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.HeaderCell scope="row">
                <Badge tone="warning">Pending</Badge>
              </Table.HeaderCell>
              <Table.Cell>Beanstalk Ltd</Table.Cell>
              <Table.Cell align="end">$4,200</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.HeaderCell scope="row">
                <Badge tone="neutral">Archived</Badge>
              </Table.HeaderCell>
              <Table.Cell>Delta Mfg</Table.Cell>
              <Table.Cell align="end">$800</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Example>

      <Example
        title="Truncated cell"
        description="`<Table.Cell truncate>` ellipsizes overflow text. Requires a constrained cell width — set `style={{ maxWidth }}` on the cell or `<col>` width on the column."
        code={`import { Badge, Table } from '@eocrm/design-system';

export function Demo() {
  return (
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
  );
}`}
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
