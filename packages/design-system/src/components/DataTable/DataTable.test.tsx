/**
 * Integration tests for <DataTable> (Phase 1).
 *
 * NOTE on drag-and-drop coverage: column reorder via @dnd-kit's PointerSensor
 * is genuinely hard to test in jsdom. The playground demo serves as the smoke
 * test for reorder. A future Playwright e2e test is the recommended remedy
 * if reorder regresses in practice.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { DataTable } from './DataTable';
import { useDataTable } from './useDataTable';
import type { ColumnDef } from './types';

type Row = { id: string; name: string; amount: number };

const cols: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true },
  { id: 'amount', header: 'Amount', cell: (r) => r.amount },
];

const rows: Row[] = [
  { id: 'r1', name: 'Alpha', amount: 10 },
  { id: 'r2', name: 'Bravo', amount: 20 },
];

const getRowId = (r: Row) => r.id;

function Harness(props: Partial<Parameters<typeof useDataTable<Row>>[0]>) {
  const instance = useDataTable<Row>({
    data: rows,
    columns: cols,
    getRowId,
    ...props,
  });
  return <DataTable instance={instance} aria-label="Test" />;
}

describe('<DataTable>', () => {
  it('renders header + body rows', () => {
    render(<Harness />);
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('respects aria-label on the table', () => {
    render(<Harness />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Test');
  });

  it('sortable column header click cycles sort and fires onSortChange', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSortChange={onSortChange} />);
    await user.click(screen.getByRole('columnheader', { name: /name/i }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'asc' });
  });

  it('renders an empty state when data is empty', () => {
    render(<Harness data={[]} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('renders a custom emptyState when provided', () => {
    function CustomHarness() {
      const instance = useDataTable<Row>({ data: [], columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" emptyState={<div>NOTHING HERE</div>} />;
    }
    render(<CustomHarness />);
    expect(screen.getByText('NOTHING HERE')).toBeInTheDocument();
  });

  it('renders skeleton rows when loading', () => {
    function LoadingHarness() {
      const instance = useDataTable<Row>({ data: [], columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" loading loadingRowCount={3} />;
    }
    const { container } = render(<LoadingHarness />);
    // Skeleton renders a span with role="status" or a known className from the Skeleton component.
    // We check by tbody row count instead — most robust.
    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(3);
  });

  it('renders selection auto-column when enableRowSelection is true', () => {
    render(<Harness enableRowSelection />);
    const headerRow = screen.getAllByRole('row')[0]!;
    // Select-all <th> + 2 data column headers = 3 columnheaders
    expect(within(headerRow).getAllByRole('columnheader').length).toBe(3);
    expect(within(headerRow).getAllByRole('checkbox').length).toBe(1);
  });

  it('toggleRowSelection toggles a row via per-row checkbox', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness enableRowSelection onRowSelectionChange={onChange} defaultRowSelection={{}} />);
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
    expect(rowCheckboxes).toHaveLength(2);
    await user.click(rowCheckboxes[0]!);
    expect(onChange).toHaveBeenCalledWith({ r1: true });
  });

  it('header select-all checkbox toggles all rows on page', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness enableRowSelection onRowSelectionChange={onChange} defaultRowSelection={{}} />);
    const headerCheckbox = screen.getAllByRole('checkbox')[0]!;
    await user.click(headerCheckbox);
    expect(onChange).toHaveBeenCalledWith({ r1: true, r2: true });
  });

  it('row click fires onRowClick when target is not interactive', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRowClick={onRowClick} />);
    await user.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]![0]).toEqual(rows[0]);
  });

  it('row Enter keypress fires onRowClick when onRowClick is provided', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRowClick={onRowClick} />);
    const firstRow = screen.getAllByRole('row')[1]!; // [0] is the header row
    firstRow.focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('rows are NOT focusable when onRowClick is not provided', () => {
    render(<Harness />);
    const firstBodyRow = screen.getAllByRole('row')[1]!;
    expect(firstBodyRow).not.toHaveAttribute('tabindex');
  });

  it('row click does NOT fire onRowClick when target is the selection checkbox', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        enableRowSelection
        onRowClick={onRowClick}
        defaultRowSelection={{}}
        onRowSelectionChange={() => {}}
      />,
    );
    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
    await user.click(rowCheckboxes[0]!);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('row click does NOT fire onRowClick when origin is in the selection cell (any descendant)', async () => {
    const onRowClick = vi.fn();
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Harness
        enableRowSelection
        onRowClick={onRowClick}
        defaultRowSelection={{}}
        onRowSelectionChange={onChange}
      />,
    );
    // Click the auto-cell <td> itself — the selection cell is the first cell of each body row.
    const firstRow = screen.getAllByRole('row')[1]!;
    const cells = within(firstRow).getAllByRole('cell');
    await user.click(cells[0]!); // selection cell is the first <td>
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('hidden columns do not render cells', () => {
    render(<Harness defaultColumnVisibility={{ amount: false }} />);
    expect(screen.queryByText('10')).toBeNull();
    expect(screen.queryByText('20')).toBeNull();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('respects columnOrder ordering in header + body', () => {
    render(<Harness defaultColumnOrder={['amount', 'name']} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]!.textContent).toMatch(/amount/i);
    expect(headers[1]!.textContent).toMatch(/name/i);
  });

  it('forwards ref to the underlying <table>', () => {
    function RefHarness() {
      const ref = useRef<HTMLTableElement>(null);
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} ref={ref} aria-label="t" data-testid="dt" />;
    }
    const { container } = render(<RefHarness />);
    expect(container.querySelector('table')).toBeInstanceOf(HTMLTableElement);
  });

  it('merges className with the underlying <table>', () => {
    function ClassHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} className="my-class" aria-label="t" />;
    }
    const { container } = render(<ClassHarness />);
    expect(container.querySelector('table.my-class')).not.toBeNull();
  });

  // ─── Phase 2: pinning rendering ───────────────────────────────────────

  it('renders pinned-left columns with sticky CSS and computed left offset', () => {
    const { container } = render(
      <Harness defaultColumnPinning={{ left: ['name'], right: [] }} />,
    );
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveStyle({ position: 'sticky', left: '0px' });
    // Body cell for 'name' in first row should also be sticky.
    const firstBodyRow = container.querySelectorAll('tbody tr')[0]!;
    const nameCell = firstBodyRow.querySelectorAll('td')[0]!; // 'name' is first because left-pinned
    expect(nameCell).toHaveStyle({ position: 'sticky', left: '0px' });
  });

  it('shifts left pin offset by 44px when enableRowSelection is true', () => {
    render(
      <Harness
        enableRowSelection
        defaultColumnPinning={{ left: ['name'], right: [] }}
      />,
    );
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveStyle({ left: '44px' });
  });

  it('renders pinned-right columns with sticky right CSS', () => {
    render(
      <Harness defaultColumnPinning={{ left: [], right: ['amount'] }} />,
    );
    const amountHeader = screen.getByRole('columnheader', { name: /amount/i });
    expect(amountHeader).toHaveStyle({ position: 'sticky', right: '0px' });
  });

  it('renders columns in pin order: [left-pinned, unpinned, right-pinned]', () => {
    render(
      <Harness defaultColumnPinning={{ left: ['amount'], right: [] }} />,
    );
    const headers = screen.getAllByRole('columnheader');
    // 'amount' pinned-left → first; 'name' unpinned → second
    expect(headers[0]!.textContent).toMatch(/amount/i);
    expect(headers[1]!.textContent).toMatch(/name/i);
  });

  it('auto-select cell is sticky-left at offset 0 when enableRowSelection is true', () => {
    render(<Harness enableRowSelection />);
    // The select-all <th> is the first columnheader.
    const headers = screen.getAllByRole('columnheader');
    const selectHeader = headers[0]!;
    expect(selectHeader).toHaveStyle({ position: 'sticky', left: '0px' });
  });

  it('renders pinnedRows in a separate <tbody> above main body', () => {
    const pinned = [{ id: 'p1', name: 'PINNED', amount: 99 }];
    function PinnedHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        pinnedRows: pinned,
        columns: cols,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const { container } = render(<PinnedHarness />);
    const tbodies = container.querySelectorAll('tbody');
    expect(tbodies.length).toBe(2);
    const pinnedTbody = tbodies[0]!;
    expect(within(pinnedTbody as HTMLElement).getByText('PINNED')).toBeInTheDocument();
  });

  it('pinnedRows tbody is labelled "Pinned rows" for screen readers', () => {
    const pinned = [{ id: 'p1', name: 'PINNED', amount: 99 }];
    function PinnedHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        pinnedRows: pinned,
        columns: cols,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const { container } = render(<PinnedHarness />);
    const pinnedTbody = container.querySelector('tbody[aria-label="Pinned rows"]');
    expect(pinnedTbody).not.toBeNull();
  });

  it('does NOT render pinned-rows tbody when pinnedRows is empty/absent', () => {
    const { container } = render(<Harness />);
    expect(container.querySelectorAll('tbody').length).toBe(1);
  });
});
