/**
 * Integration tests for <DataTable> (Phase 1).
 *
 * NOTE on drag-and-drop coverage: column reorder via @dnd-kit's PointerSensor
 * is genuinely hard to test in jsdom. The playground demo serves as the smoke
 * test for reorder. A future Playwright e2e test is the recommended remedy
 * if reorder regresses in practice.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { DataTable } from './DataTable';
import { useDataTable } from './useDataTable';
import { shiftVarName } from './columnShift';
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

function HarnessWithProps(props: { dragWholeColumn?: boolean }) {
  const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
  return <DataTable instance={instance} aria-label="Test" {...props} />;
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
    const { container } = render(<Harness defaultColumnPinning={{ left: ['name'], right: [] }} />);
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveStyle({ position: 'sticky', left: '0px' });
    // Body cell for 'name' in first row should also be sticky.
    const firstBodyRow = container.querySelectorAll('tbody tr')[0]!;
    const nameCell = firstBodyRow.querySelectorAll('td')[0]!; // 'name' is first because left-pinned
    expect(nameCell).toHaveStyle({ position: 'sticky', left: '0px' });
  });

  it('shifts left pin offset by 44px when enableRowSelection is true', () => {
    render(<Harness enableRowSelection defaultColumnPinning={{ left: ['name'], right: [] }} />);
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveStyle({ left: '44px' });
  });

  it('renders pinned-right columns with sticky right CSS', () => {
    render(<Harness defaultColumnPinning={{ left: [], right: ['amount'] }} />);
    const amountHeader = screen.getByRole('columnheader', { name: /amount/i });
    expect(amountHeader).toHaveStyle({ position: 'sticky', right: '0px' });
  });

  it('renders columns in pin order: [left-pinned, unpinned, right-pinned]', () => {
    render(<Harness defaultColumnPinning={{ left: ['amount'], right: [] }} />);
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

  // NOTE: hover and selected cascade on pinned cells is NOT unit-tested here.
  // The CSS rule (`.root tbody tr:not(.pinnedRow):hover .pinnedLeft { ... }`)
  // is verified in the playground and via manual cascade reasoning; testing
  // the cascade in jsdom requires mocking computed styles which is fragile.

  it('pinned columns have no drag grip (locked in position)', () => {
    render(<Harness defaultColumnPinning={{ left: ['name'], right: ['amount'] }} />);
    // The grip is a span with aria-label="Drag to reorder <header>". It's
    // only rendered when reorderable; pinned columns set reorderable=false.
    expect(screen.queryByLabelText(/drag to reorder name/i)).toBeNull();
    expect(screen.queryByLabelText(/drag to reorder amount/i)).toBeNull();
    // Sanity: the SortableContext still includes the columns logically (their
    // headers render), but they're excluded from drag interaction.
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument();
  });

  it('unpinned columns still get the drag grip when reorderable', () => {
    render(<Harness />);
    // No pinning configured → both columns are reorderable → grips render.
    expect(screen.getByLabelText(/drag to reorder name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/drag to reorder amount/i)).toBeInTheDocument();
  });

  it('column.align="end" applies end-alignment class to the header inner', () => {
    // The "amount" column in `cols` is unpinned; if we change its align to
    // 'end', the header's .inner div should pick up the alignment class so
    // the label + sort indicator sit at the right end of the column.
    const alignedCols: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name, sortable: true },
      { id: 'amount', header: 'Amount', cell: (r) => r.amount, sortable: true, align: 'end' },
    ];
    function AlignedHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: alignedCols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const { container } = render(<AlignedHarness />);
    // The .inner div is the first child div inside the <th>. CSS Modules
    // hashes its class; verify by querying for a class that *contains*
    // 'innerAlignEnd' so we don't have to import the styles module.
    const amountHeader = screen.getByRole('columnheader', { name: /amount/i });
    const inner = amountHeader.querySelector('div');
    expect(inner?.className).toMatch(/innerAlignEnd/);
    // And the default column shouldn't get the alignment class.
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    const nameInner = nameHeader.querySelector('div');
    expect(nameInner?.className).not.toMatch(/innerAlignEnd/);
    // Suppress unused-var warning if container is unread.
    void container;
  });

  // ─── Phase 3: expandable rows ──────────────────────────────────────────

  it('renders expand auto-column when renderExpandedRow is provided', () => {
    function ExpandableHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: (r) => <div>Detail of {r.name}</div>,
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const { container } = render(<ExpandableHarness />);
    // Each body row should have an expand button (per-row aria-expanded toggle).
    const expandButtons = container.querySelectorAll('button[aria-expanded]');
    expect(expandButtons.length).toBe(rows.length);
  });

  it('does NOT render expand auto-column when renderExpandedRow is omitted', () => {
    const { container } = render(<Harness />);
    expect(container.querySelectorAll('button[aria-expanded]').length).toBe(0);
  });

  it('clicking the expand chevron toggles expandedRows', async () => {
    const onChange = vi.fn();
    function ExpandableHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: (r) => <div>Detail of {r.name}</div>,
        defaultExpandedRows: {},
        onExpandedRowsChange: onChange,
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const user = userEvent.setup();
    render(<ExpandableHarness />);
    const firstChevron = screen.getAllByRole('button', { name: /expand row/i })[0]!;
    await user.click(firstChevron);
    expect(onChange).toHaveBeenLastCalledWith({ r1: true });
  });

  it('toggling the expand chevron mounts and unmounts the detail row in the DOM', async () => {
    function ExpandableHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: (r) => <div data-testid="detail-content">Detail of {r.name}</div>,
        defaultExpandedRows: {},
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const user = userEvent.setup();
    render(<ExpandableHarness />);
    // No detail row at rest.
    expect(screen.queryByTestId('detail-content')).toBeNull();

    const firstChevron = screen.getAllByRole('button', { name: /expand row/i })[0]!;
    await user.click(firstChevron);
    // Detail row mounts.
    expect(screen.getByTestId('detail-content')).toHaveTextContent('Detail of Alpha');

    await user.click(firstChevron);
    // Detail row unmounts.
    expect(screen.queryByTestId('detail-content')).toBeNull();
  });

  it('renders the detail row beneath an expanded row with correct colSpan + aria', () => {
    function ExpandableHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: (r) => <div data-testid="detail-content">Detail of {r.name}</div>,
        defaultExpandedRows: { r1: true },
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<ExpandableHarness />);
    // Detail content present
    expect(screen.getByTestId('detail-content')).toHaveTextContent('Detail of Alpha');
    // The detail cell spans all columns: 2 data columns + 1 expand auto-cell = 3
    const detailCell = screen.getByTestId('detail-content').closest('td');
    expect(detailCell).not.toBeNull();
    expect(Number(detailCell!.getAttribute('colspan'))).toBe(3);
  });

  it('expand button has aria-expanded reflecting the row state', () => {
    function ExpandableHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: () => null,
        defaultExpandedRows: { r1: true },
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<ExpandableHarness />);
    const buttons = screen.getAllByRole('button', { name: /expand row/i });
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
  });

  it('expand button aria-controls points to the detail row id', () => {
    function ExpandableHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: () => <div>x</div>,
        defaultExpandedRows: { r1: true },
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const { container } = render(<ExpandableHarness />);
    const firstButton = screen.getAllByRole('button', { name: /expand row/i })[0]!;
    const controlsId = firstButton.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(container.querySelector(`#${controlsId}`)).not.toBeNull();
  });

  it('clicking the expand button does NOT fire onRowClick', async () => {
    const onRowClick = vi.fn();
    function ExpandableHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: () => <div>x</div>,
        onRowClick,
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    const user = userEvent.setup();
    render(<ExpandableHarness />);
    const firstChevron = screen.getAllByRole('button', { name: /expand row/i })[0]!;
    await user.click(firstChevron);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('shifts left-pin offsets by 2 × AUTO_CELL_WIDTH when both selection and expansion are active', () => {
    function BothHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        enableRowSelection: true,
        renderExpandedRow: () => null,
        defaultColumnPinning: { left: ['name'], right: [] },
      });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<BothHarness />);
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    // 44px (select) + 44px (expand) = 88px
    expect(nameHeader).toHaveStyle({ left: '88px' });
  });
});

describe('<DataTable> — whole-column drag preview', () => {
  // The transform is applied only while a drag is active. The last test in
  // this block drives a REAL drag through DataTable's own DndContext and
  // PointerSensor (jsdom 29 implements PointerEvent, so `pointerdown` +
  // `pointermove` activate the sensor for real); the others assert the static
  // wiring around it.
  function PinnedHarness({ dragWholeColumn }: { dragWholeColumn?: boolean }) {
    const instance = useDataTable<Row>({
      data: rows,
      columns: cols,
      getRowId,
      defaultColumnPinning: { left: ['name'], right: [] },
    });
    return <DataTable instance={instance} aria-label="Pinned" dragWholeColumn={dragWholeColumn} />;
  }

  it('defaults dragWholeColumn to true', () => {
    render(<Harness />);
    // The table element carries the mode as a data attribute so the mode is
    // observable without simulating a drag.
    expect(screen.getByRole('table')).toHaveAttribute('data-drag-whole-column', 'true');
  });

  it('reflects dragWholeColumn={false}', () => {
    render(<HarnessWithProps dragWholeColumn={false} />);
    expect(screen.getByRole('table')).not.toHaveAttribute('data-drag-whole-column');
  });

  it('never puts a transform on a pinned cell', () => {
    render(<PinnedHarness />);
    // 'name' is pinned left; its cells must carry sticky positioning and no
    // transform, because a transform would break position: sticky.
    const nameCells = screen.getAllByText(/Alpha|Bravo/);
    for (const cell of nameCells) {
      const td = cell.closest('td')!;
      expect(td.style.position).toBe('sticky');
      expect(td.style.transform).toBe('');
    }
  });

  it('never puts a transform on a row or body element', () => {
    render(<Harness />);
    const table = screen.getByRole('table');
    for (const el of table.querySelectorAll('tr, tbody, thead')) {
      expect((el as HTMLElement).style.transform).toBe('');
    }
  });

  it('exposes the table element to the shift driver via the forwarded ref', () => {
    function RefHarness() {
      const ref = useRef<HTMLTableElement>(null);
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return (
        <>
          <DataTable ref={ref} instance={instance} aria-label="Reffed" />
          <button onClick={() => ref.current?.setAttribute('data-ref-ok', 'yes')}>probe</button>
        </>
      );
    }
    render(<RefHarness />);
    screen.getByRole('button', { name: 'probe' }).click();
    // The consumer's ref must still reach the <table> after the internal
    // merge added for the shift driver.
    expect(screen.getByRole('table')).toHaveAttribute('data-ref-ok', 'yes');
  });

  it('during a real drag, shifts unpinned cells and leaves pinned cells alone', () => {
    render(<PinnedHarness />);
    // 'name' is pinned left (no grip); 'amount' is the reorderable column.
    const grip = screen.getByLabelText(/drag to reorder amount/i);

    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    // First move clears the 6px activation constraint; the second produces the
    // delta the driver publishes.
    fireEvent.pointerMove(document, { clientX: 30, clientY: 0 });
    fireEvent.pointerMove(document, { clientX: 60, clientY: 0 });

    const table = screen.getByRole('table');
    // The driver published the offset onto the <table>, never onto an ancestor
    // of a sticky cell as a transform.
    expect(table.style.getPropertyValue(shiftVarName('amount'))).toBe('60px');
    expect(table.style.transform).toBe('');

    const shift = `var(${shiftVarName('amount')}, 0px)`;

    // Unpinned body cells read the shift variable...
    const amountCell = screen.getByText('10').closest('td')!;
    expect(amountCell.style.transform).toBe(`translateX(${shift})`);
    // ...and so does the unpinned header cell — same variable, so they cannot
    // desync.
    const amountHeader = screen.getByRole('columnheader', { name: /amount/i });
    expect(amountHeader.style.transform).toBe(`translateX(${shift})`);

    // Pinned cells must NOT be transformed — a transform breaks position:sticky.
    const nameCell = screen.getByText('Alpha').closest('td')!;
    expect(nameCell.style.position).toBe('sticky');
    expect(nameCell.style.transform).toBe('');
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader.style.position).toBe('sticky');
    expect(nameHeader.style.transform).toBe('');

    // And no ancestor of a sticky cell may be transformed either.
    for (const el of table.querySelectorAll('tr, tbody, thead, colgroup')) {
      expect((el as HTMLElement).style.transform).toBe('');
    }

    // Drop clears both the variable and the transforms.
    fireEvent.pointerUp(document);
    expect(table.style.getPropertyValue(shiftVarName('amount'))).toBe('');
    expect(screen.getByText('10').closest('td')!.style.transform).toBe('');
  });
});
