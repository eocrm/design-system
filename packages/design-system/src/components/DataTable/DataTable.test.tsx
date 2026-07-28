/**
 * Integration tests for <DataTable> (Phase 1).
 *
 * NOTE on drag-and-drop coverage: jsdom 29 implements PointerEvent, so a real
 * drag CAN be driven through DataTable's own DndContext and PointerSensor —
 * see the 'whole-column drag preview' block, which fires pointerdown /
 * pointermove / pointerup and asserts against the resulting styles. What jsdom
 * still cannot do is lay anything out: every getBoundingClientRect is zero, so
 * by default dnd-kit never resolves an `over` target. A test that needs one
 * stubs getBoundingClientRect on the header cells (see the non-reorderable
 * column test). Drag aesthetics remain playground/e2e territory; what is
 * covered here is the styling contract (which cells carry a shift transform,
 * which must never, and which columns the driver is told about).
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  // Three columns, one pinned — so the two unpinned ones have somewhere to go.
  // With a single unpinned column the drag clamp (#381) correctly pins it in
  // place, which would make the shift assertions below vacuous.
  const pinnedCols: ColumnDef<Row>[] = [
    { id: 'name', header: 'Name', cell: (r) => r.name },
    { id: 'amount', header: 'Amount', cell: (r) => r.amount },
    { id: 'extra', header: 'Extra', cell: () => '—' },
  ];

  function PinnedHarness({ dragWholeColumn }: { dragWholeColumn?: boolean }) {
    const instance = useDataTable<Row>({
      data: rows,
      columns: pinnedCols,
      getRowId,
      defaultColumnPinning: { left: ['name'], right: [] },
    });
    return <DataTable instance={instance} aria-label="Pinned" dragWholeColumn={dragWholeColumn} />;
  }

  // (Three tests that rendered without a drag lived here — two reading a
  // `data-drag-whole-column` attribute and one asserting no row/body transform.
  // All passed for reasons unrelated to their names. The real-drag tests below
  // cover the same ground meaningfully: default-true, the `false` opt-out, and
  // the "transform only on unpinned cells" invariant.)

  /**
   * Give every header cell a real rect, `width` px wide and laid left to right.
   *
   * Mandatory for any drag assertion since #381: the clamp measures the header
   * cells' RENDERED geometry at drag start, and jsdom reports every rect as
   * zero — which the clamp correctly reads as "nowhere to go", pinning the
   * column and making the assertion vacuous.
   */
  function stubHeaderRects(table: HTMLElement, width = 120) {
    table.querySelectorAll('th').forEach((th, i) => {
      th.getBoundingClientRect = () => new DOMRect(i * width, 0, width, 32);
    });
  }

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

  /** Drives a real drag on the 'amount' column through DataTable's own
   *  DndContext + PointerSensor. First move clears the 6px activation
   *  constraint; the second produces the delta the driver publishes. */
  function dragAmountColumn() {
    const grip = screen.getByLabelText(/drag to reorder amount/i);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    fireEvent.pointerMove(document, { clientX: 30, clientY: 0 });
    fireEvent.pointerMove(document, { clientX: 60, clientY: 0 });
  }

  it('during a real drag, shifts unpinned cells and leaves pinned cells alone', () => {
    render(<PinnedHarness />);
    const table = screen.getByRole('table');
    // Unpinned band is ['amount', 'extra'] at x=120 and x=240, so 'amount' may
    // travel 0..+120 — the 60px drag below lands inside it.
    stubHeaderRects(table);
    // 'name' is pinned left (no grip); 'amount' is the reorderable column.
    dragAmountColumn();
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

  it('during a real drag, a NON-reorderable column the drag passes over is shifted too', () => {
    // Regression guard for the two-column overlap: the shift driver must be fed
    // EVERY unpinned column, not just the reorderable ones. A column with
    // `enableReorder: false` still occupies space and is still displaced by the
    // drop, so if it is omitted from `orderedIds` it never moves and renders on
    // top of its neighbour. Wiring the driver to `sortableIds` (which filters
    // `enableReorder === false` out — correct for SortableContext, wrong here)
    // makes this test fail: 'stage' gets no shift variable at all.
    const gapCols: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name },
      { id: 'stage', header: 'Stage', cell: () => 'Won', enableReorder: false },
      { id: 'owner', header: 'Owner', cell: (r) => r.amount },
    ];
    function GapHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: gapCols, getRowId });
      return <DataTable instance={instance} aria-label="Gap" />;
    }
    render(<GapHarness />);
    const table = screen.getByRole('table');

    // jsdom lays nothing out, so every rect is zero and dnd-kit can never
    // resolve an `over` target — and with `over` null the driver only publishes
    // the active column's offset, which would make this assertion vacuous.
    // Give the header cells real rects (each 120px wide, matching the default
    // column size) so collision detection has something to hit.
    stubHeaderRects(table);

    const grip = screen.getByLabelText(/drag to reorder name/i);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    // First move clears the 6px activation constraint; the second lands the
    // dragged column squarely on 'owner', two positions to the right.
    fireEvent.pointerMove(document, { clientX: 20, clientY: 0 });
    fireEvent.pointerMove(document, { clientX: 200, clientY: 0 });
    // Third move because dnd-kit's `over` lags one frame: the collision found
    // on the previous move is what the monitor sees on this one. Both moves
    // stay under the 240px clamp ceiling (#381) — past it the delta stops
    // changing, dnd-kit emits no further move, and `over` never resolves.
    fireEvent.pointerMove(document, { clientX: 230, clientY: 0 });

    // Sanity: the drag really did resolve a target two columns over, so the
    // displacement assertions below are not vacuous.
    expect(table.style.getPropertyValue(shiftVarName('name'))).toBe('230px');
    expect(table.style.getPropertyValue(shiftVarName('owner'))).toBe('-120px');
    // The point of the test — the skipped-over non-reorderable column moves by
    // exactly the same amount. With `sortableIds` this reads ''.
    expect(table.style.getPropertyValue(shiftVarName('stage'))).toBe('-120px');

    fireEvent.pointerUp(document);
  });

  it('during a real drag with dragWholeColumn={false}, the body never moves', () => {
    // The opt-out is now the road less travelled, so it gets the same real
    // drag rather than a data-attribute check: the driver must publish nothing
    // and no body cell may be transformed. Only the dragged header moves —
    // dnd-kit's historical behavior.
    render(<PinnedHarness dragWholeColumn={false} />);
    const table = screen.getByRole('table');
    stubHeaderRects(table);
    dragAmountColumn();

    expect(table.style.getPropertyValue(shiftVarName('amount'))).toBe('');
    expect(table.style.getPropertyValue(shiftVarName('name'))).toBe('');
    expect(screen.getByText('10').closest('td')!.style.transform).toBe('');
    expect(screen.getByText('Alpha').closest('td')!.style.transform).toBe('');
    // And no body cell reads a shift variable it was never given.
    for (const td of table.querySelectorAll('tbody td')) {
      expect((td as HTMLElement).style.transform).not.toContain('--dt-shift-');
    }

    fireEvent.pointerUp(document);
  });
});

describe('<DataTable> — a drop over a pinned column lands in the band (#383)', () => {
  /**
   * The scenario from the issue, reduced to geometry.
   *
   * `owner` is pinned right. It is `position: sticky`, so on a scrolled table
   * its rect sits ON TOP of the band's last columns rather than after them —
   * that is what the stubs below reproduce, and it is the whole bug. A boolean
   * `disabled` on `useSortable` normalizes to `{ draggable: true, droppable:
   * false }`, i.e. it stands down the DRAGGABLE and leaves the droppable
   * registered, so the pinned column is still a collision target. Park the
   * dragged column at the band's right edge (#382's clamp puts it exactly
   * there) and the pinned column wins the intersection outright — a target
   * `reorderRespectingPins` must reject as cross-boundary.
   *
   * The preview collapsed and the drop evaporated. Both now resolve to the last
   * slot the BAND itself matched, which is the slot on screen.
   *
   * Widths are deliberately uneven: the dragged column is narrow and the last
   * band column is wide, so the clamped collision rect fits inside the pinned
   * column's rect and cannot also cover most of the band column. Equal widths
   * make the band column win on area and the bug never appears.
   */
  const pinnedRightCols: ColumnDef<Row>[] = [
    { id: 'name', header: 'Name', cell: (r) => r.name, size: 100 },
    { id: 'mid', header: 'Mid', cell: () => '—', size: 400 },
    { id: 'owner', header: 'Owner', cell: (r) => r.amount, size: 100, pin: 'right' },
  ];

  /** Mirror image: the left-pinned column covers the START of the band. */
  const pinnedLeftCols: ColumnDef<Row>[] = [
    { id: 'owner', header: 'Owner', cell: (r) => r.amount, size: 100, pin: 'left' },
    { id: 'mid', header: 'Mid', cell: () => '—', size: 400 },
    { id: 'name', header: 'Name', cell: (r) => r.name, size: 100 },
  ];

  function Harness3({
    columns,
    dragWholeColumn,
  }: {
    columns: ColumnDef<Row>[];
    dragWholeColumn?: boolean;
  }) {
    const instance = useDataTable<Row>({ data: rows, columns, getRowId });
    return <DataTable instance={instance} aria-label="Pinned" dragWholeColumn={dragWholeColumn} />;
  }

  /**
   * Lay the header cells out by id rather than by index, because the pinned
   * cell must OVERLAP its neighbours — which an index-derived strip cannot
   * express, and which is exactly what `position: sticky` does on a scrolled
   * table.
   */
  function renderWithRects(
    columns: ColumnDef<Row>[],
    rects: Record<string, [number, number]>,
    props: { dragWholeColumn?: boolean } = {},
  ) {
    render(<Harness3 columns={columns} {...props} />);
    const table = screen.getByRole('table');
    table.querySelectorAll('th').forEach((th) => {
      const [left, right] = rects[th.getAttribute('data-dt-column-id')!]!;
      th.getBoundingClientRect = () => new DOMRect(left, 0, right - left, 32);
    });
    return table;
  }

  // 'owner' floats over the last 100px of 'mid'.
  const rightRects: Record<string, [number, number]> = {
    name: [0, 100],
    mid: [100, 500],
    owner: [400, 500],
  };
  // ...and here over the FIRST 100px of it.
  const leftRects: Record<string, [number, number]> = {
    owner: [100, 200],
    mid: [100, 500],
    name: [500, 600],
  };

  const orderOf = (table: HTMLElement) =>
    [...table.querySelectorAll('thead th[data-dt-column-id]')].map((th) =>
      th.getAttribute('data-dt-column-id'),
    );

  /** Drag `label`'s grip to `clientX` (and optionally `clientY`), pointer down. */
  function dragTo(label: RegExp, clientX: number, clientY = 0) {
    const grip = screen.getByLabelText(label);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    // First move clears the 6px activation constraint. The second parks the
    // column mid-band so a band slot is resolved at all; the third is the one
    // that carries it onto the pinned column. dnd-kit's `over` lags a frame, so
    // the middle stop has to be a move of its own.
    fireEvent.pointerMove(document, { clientX: clientX > 0 ? 20 : -20, clientY: 0 });
    fireEvent.pointerMove(document, { clientX: clientX > 0 ? 200 : -100, clientY: 0 });
    fireEvent.pointerMove(document, { clientX, clientY });
  }

  it('holds the previewed gap open while the pinned column owns the collision', () => {
    // Half one of "the drop equals the preview". `computeColumnShifts` finds no
    // index for a pinned id, so reading `over` raw returned the dragged
    // column's own offset alone: both neighbours snapped back and the column
    // was left overlapping the slot it was about to take.
    const table = renderWithRects(pinnedRightCols, rightRects);
    dragTo(/drag to reorder name/i, 5000);
    // One more frame, nudged on the y axis. Necessary: at the clamp ceiling the
    // x translate stops changing, so dnd-kit emits no further move and the
    // variables written on the way in would stand unexamined. A y nudge keeps
    // the translate changing while the collision stays on the pinned column,
    // which is what makes the preview recompute with an unusable target.
    fireEvent.pointerMove(document, { clientX: 5000, clientY: 4 });
    // Clamped to the band: 'mid' ends at 500, 'name' at 100, so 400px of travel.
    expect(table.style.getPropertyValue(shiftVarName('name'))).toBe('400px');
    // The gap is still open at 'mid' — one 'name'-width, from the DECLARED size.
    expect(table.style.getPropertyValue(shiftVarName('mid'))).toBe('-100px');
    // And the pinned column is never given an offset at all.
    expect(table.style.getPropertyValue(shiftVarName('owner'))).toBe('');
    fireEvent.pointerUp(document);
  });

  it('commits that slot on release instead of discarding the drop', () => {
    const table = renderWithRects(pinnedRightCols, rightRects);
    expect(orderOf(table)).toEqual(['name', 'mid', 'owner']);
    dragTo(/drag to reorder name/i, 5000);
    fireEvent.pointerUp(document);
    // Last slot of the unpinned band — the slot the preview was showing — and
    // the pinned column has not moved.
    expect(orderOf(table)).toEqual(['mid', 'name', 'owner']);
  });

  it('does the same against a left-pinned column', () => {
    const table = renderWithRects(pinnedLeftCols, leftRects);
    expect(orderOf(table)).toEqual(['owner', 'mid', 'name']);
    dragTo(/drag to reorder name/i, -5000);
    fireEvent.pointerUp(document);
    expect(orderOf(table)).toEqual(['owner', 'name', 'mid']);
  });

  it('keeps the discard on the dragWholeColumn={false} path, because that preview retracts', () => {
    // NOT parity, and deliberately so. The opt-out's preview is dnd-kit's own:
    // it displaces via `overIndex` against `SortableContext items={sortableIds}`,
    // which excludes pinned columns, so the moment the pinned column wins the
    // collision the index is -1 and EVERY transform resolves to null — the
    // dragged header snaps back home and the gap closes. Committing against a
    // preview that has just retracted its promise would be the same lie as
    // discarding against one that still holds it, only pointing the other way.
    const table = renderWithRects(pinnedRightCols, rightRects, { dragWholeColumn: false });
    const header = () => screen.getByRole('columnheader', { name: /name/i });

    dragTo(/drag to reorder name/i, 200); // mid-band: a band slot resolves
    expect(header().style.transform).toContain('200px');

    fireEvent.pointerMove(document, { clientX: 5000, clientY: 0 });
    // Parked on the pinned column — the header is back at its origin.
    expect(header().style.transform).toBe('');

    fireEvent.pointerUp(document);
    expect(orderOf(table)).toEqual(['name', 'mid', 'owner']);
    // ...and the body was never touched on this path either way.
    expect(table.style.getPropertyValue(shiftVarName('name'))).toBe('');
  });

  it('commits the previewed slot when the release resolves no target at all', () => {
    // The other way dnd-kit hands back something unusable: `over` null. In a
    // browser that is what horizontal auto-scroll produces (the scroll
    // adjustment is applied to the translate AFTER modifiers run, so the
    // collision rect desyncs from the droppable rects); here, dragging clear of
    // the header row produces it directly, since only the x axis is clamped.
    //
    // Committing — rather than cancelling, the way an outside-the-board Kanban
    // release does — is what matches the preview: a column drag has one axis and
    // one legal band, the whole-column preview discards the y translate outright,
    // so the column stays visibly parked in a slot however far the pointer roams.
    // Escape is still the way to cancel.
    const table = renderWithRects(pinnedRightCols, rightRects);
    dragTo(/drag to reorder name/i, 200, 5000);
    expect(table.style.getPropertyValue(shiftVarName('mid'))).toBe('-100px');
    fireEvent.pointerUp(document);
    expect(orderOf(table)).toEqual(['mid', 'name', 'owner']);
  });

  // --- and the announcement has to agree with the commit (#390) -------------
  // The announcement resolves `over` through the SAME fallback the drop does.
  // Reading raw `over` here emits "Released Name. Nothing moved." over each of
  // the two reorders below — which is the #390 defect with the sign flipped.

  it('announces the slot it commits when a pinned column owns the collision', () => {
    renderWithRects(pinnedRightCols, rightRects);
    dragTo(/drag to reorder name/i, 5000);
    fireEvent.pointerUp(document);
    // Band is [name, mid]; the commit put 'name' in the last band slot.
    expect(screen.getByRole('status').textContent).toBe('Dropped Name at position 2 of 2.');
  });

  it('announces the slot it commits when the release resolves no target at all', () => {
    renderWithRects(pinnedRightCols, rightRects);
    dragTo(/drag to reorder name/i, 200, 5000);
    fireEvent.pointerUp(document);
    expect(screen.getByRole('status').textContent).toBe('Dropped Name at position 2 of 2.');
  });

  it('DOES announce "nothing moved" on the dragWholeColumn={false} path, which discards', () => {
    // The mirror of the two above: that path keeps its discard, so the honest
    // announcement is the one the others would have been wrong to make.
    renderWithRects(pinnedRightCols, rightRects, { dragWholeColumn: false });
    dragTo(/drag to reorder name/i, 200);
    // Clear of the header row entirely: `over` goes non-null → null, which is
    // the one transition that fires an `onDragOver` with no target at all.
    fireEvent.pointerMove(document, { clientX: 200, clientY: 5000 });
    expect(screen.getByRole('status').textContent).toBe('Name is not over a drop target.');
    fireEvent.pointerUp(document);
    expect(screen.getByRole('status').textContent).toBe('Released Name. Nothing moved.');
  });

  it('does not let one drag inherit the previous drag’s target', () => {
    // The remembered slot is cleared at drag START, not at drag end, so a drag
    // that never resolves a slot of its own commits nothing.
    const table = renderWithRects(pinnedRightCols, rightRects);
    dragTo(/drag to reorder name/i, 5000);
    fireEvent.pointerUp(document);
    expect(orderOf(table)).toEqual(['mid', 'name', 'owner']);

    const grip = screen.getByLabelText(/drag to reorder name/i);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    fireEvent.pointerMove(document, { clientX: 20, clientY: 5000 });
    fireEvent.pointerUp(document);
    expect(orderOf(table)).toEqual(['mid', 'name', 'owner']);
  });

  it('still resolves an `enableReorder: false` column as an ordinary slot', () => {
    // Non-reorderable is NOT the same as non-droppable, and must not become so:
    // `reorderRespectingPins` moves such a column happily, so its slot is a
    // legal landing spot and dnd-kit resolves it directly — no fallback needed.
    // Were it excluded, [stage, name, owner] would be unreachable by dragging.
    const gapCols: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name },
      { id: 'stage', header: 'Stage', cell: () => 'Won', enableReorder: false },
      { id: 'owner', header: 'Owner', cell: (r) => r.amount },
    ];
    function GapHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: gapCols, getRowId });
      return <DataTable instance={instance} aria-label="Gap" />;
    }
    render(<GapHarness />);
    const table = screen.getByRole('table');
    table.querySelectorAll('th').forEach((th, i) => {
      th.getBoundingClientRect = () => new DOMRect(i * 200, 0, 200, 32);
    });
    expect(screen.queryByLabelText(/drag to reorder stage/i)).toBeNull();

    const grip = screen.getByLabelText(/drag to reorder name/i);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    fireEvent.pointerMove(document, { clientX: 20, clientY: 0 });
    fireEvent.pointerMove(document, { clientX: 150, clientY: 0 });
    fireEvent.pointerMove(document, { clientX: 160, clientY: 0 });
    fireEvent.pointerUp(document);
    expect(orderOf(table)).toEqual(['stage', 'name', 'owner']);
    // ...and the announcement has to see it as a slot too (#390). Deciding
    // "in band" from `sortableIds` — the SortableContext list, which excludes
    // `enableReorder: false` — announced "Released Name. Nothing moved." over
    // exactly this reorder. The position is 1-based in the VISIBLE unpinned
    // band, which is the order asserted on the line above.
    expect(screen.getByRole('status').textContent).toBe('Dropped Name at position 2 of 3.');
  });
});

describe('<DataTable> — column drag is clamped to the unpinned band (#381)', () => {
  // Two clamps, one measured range (taken from the header rects at drag start):
  //  - `useColumnDragShift` clamps `event.delta.x`, which is what the shift
  //    variables — and therefore the whole-column preview — are built from.
  //  - a `DndContext` modifier clamps `modifiedTranslate`, which is the
  //    collision rect AND the transform the header-only path rides.
  const threeCols: ColumnDef<Row>[] = [
    { id: 'name', header: 'Name', cell: (r) => r.name },
    { id: 'mid', header: 'Mid', cell: () => '—' },
    { id: 'owner', header: 'Owner', cell: (r) => r.amount },
  ];

  function ThreeHarness({ dragWholeColumn }: { dragWholeColumn?: boolean }) {
    const instance = useDataTable<Row>({ data: rows, columns: threeCols, getRowId });
    return <DataTable instance={instance} aria-label="Three" dragWholeColumn={dragWholeColumn} />;
  }

  /**
   * Render with header cells RENDERED 200px wide while their DECLARED size is
   * the 120px default.
   *
   * That gap is the whole point. `table-layout: fixed; width: max-content;
   * min-width: 100%` makes the table stretch to fill its scroll wrap, so real
   * columns are wider than the `<col>` elements claim. A clamp built on
   * declared widths stops the first column at 240px — short of the last slot,
   * which it can then never reach.
   */
  function renderStretched(props: { dragWholeColumn?: boolean } = {}) {
    render(<ThreeHarness {...props} />);
    const table = screen.getByRole('table');
    table.querySelectorAll('th').forEach((th, i) => {
      th.getBoundingClientRect = () => new DOMRect(i * 200, 0, 200, 32);
    });
    return table;
  }

  /** Drag `columnLabel`'s grip to `clientX`, leaving the pointer down. */
  function dragTo(columnLabel: RegExp, clientX: number) {
    const grip = screen.getByLabelText(columnLabel);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    fireEvent.pointerMove(document, { clientX: clientX > 0 ? 20 : -20, clientY: 0 });
    fireEvent.pointerMove(document, { clientX, clientY: 0 });
  }

  /**
   * Assert the column did not move, and that the drag was genuinely running
   * when it didn't. A fully-clamped drag publishes NO variable rather than
   * '0px': dnd-kit's move effect is keyed on the (already clamped) translate,
   * so a translate pinned at 0 emits nothing after the start. Without the
   * liveness anchor this would also pass if the drag had never activated.
   */
  function expectPinnedInPlace(table: HTMLElement, columnId: string, cellText: string) {
    const published = table.style.getPropertyValue(shiftVarName(columnId));
    expect(['', '0px']).toContain(published);
    // Liveness: cells only carry the shift transform while a drag is active.
    const cell = screen.getAllByText(cellText)[0]!.closest('td')!;
    expect(cell.style.transform).toBe(`translateX(var(${shiftVarName(columnId)}, 0px))`);
  }

  it('stops the first column at the LAST slot, measured from rendered widths', () => {
    // The regression guard for the declared-width clamp: 'name' must travel the
    // full 400px to reach the last slot. Summing the declared 120px sizes gives
    // 240 — third of three, with the last slot unreachable.
    const table = renderStretched();
    dragTo(/drag to reorder name/i, 5000);
    expect(table.style.getPropertyValue(shiftVarName('name'))).toBe('400px');
    fireEvent.pointerUp(document);
  });

  it('does not let the first column travel left at all', () => {
    const table = renderStretched();
    dragTo(/drag to reorder name/i, -5000);
    expectPinnedInPlace(table, 'name', 'Alpha');
    fireEvent.pointerUp(document);
  });

  it('does not let the last column travel right at all', () => {
    const table = renderStretched();
    dragTo(/drag to reorder owner/i, 5000);
    expectPinnedInPlace(table, 'owner', '10');
    fireEvent.pointerUp(document);
  });

  it('bounds a middle column by the rendered geometry on each side', () => {
    const table = renderStretched();
    dragTo(/drag to reorder mid/i, -5000);
    expect(table.style.getPropertyValue(shiftVarName('mid'))).toBe('-200px');
    fireEvent.pointerUp(document);

    cleanup();
    const table2 = renderStretched();
    dragTo(/drag to reorder mid/i, 5000);
    expect(table2.style.getPropertyValue(shiftVarName('mid'))).toBe('200px');
    fireEvent.pointerUp(document);
  });

  it('clamps the header transform on the dragWholeColumn={false} path too', () => {
    // There the header rides dnd-kit's own transform, so the modifier — not the
    // delta clamp — is what bounds it. Same measured range either way.
    renderStretched({ dragWholeColumn: false });
    dragTo(/drag to reorder name/i, 5000);
    const header = screen.getByRole('columnheader', { name: /name/i });
    expect(header.style.transform).toContain('400px');
    expect(header.style.transform).not.toContain('5000px');
    fireEvent.pointerUp(document);
  });

  it('hides the grip on a lone unpinned column — it has nowhere to be dropped', () => {
    // With every other column pinned, `reorderRespectingPins` would reject any
    // drop this column could reach and the measured range is zero, so the drag
    // could only ever snap back. A grip that visibly does nothing is worse than
    // no grip — pinned columns already hide theirs for the same reason.
    function LoneHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: threeCols,
        getRowId,
        defaultColumnPinning: { left: ['name'], right: ['owner'] },
      });
      return <DataTable instance={instance} aria-label="Lone" />;
    }
    render(<LoneHarness />);
    expect(screen.queryByLabelText(/drag to reorder mid/i)).toBeNull();
    // Sanity: the column still renders, it just cannot be picked up.
    expect(screen.getByRole('columnheader', { name: /mid/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Column-reorder announcements (#390)
// ---------------------------------------------------------------------------
describe('<DataTable> — drag announcements', () => {
  // Ids and headers deliberately differ: dnd-kit's default would read
  // "col_amount", which tells a listener nothing.
  const labelledCols: ColumnDef<Row>[] = [
    { id: 'col_name', header: 'Customer', cell: (r) => r.name },
    { id: 'col_amount', header: 'Amount due', cell: (r) => r.amount },
    { id: 'col_extra', header: 'Notes', cell: () => '—' },
  ];

  function Harness() {
    const instance = useDataTable<Row>({ data: rows, columns: labelledCols, getRowId });
    return <DataTable instance={instance} aria-label="Labelled" />;
  }

  it('announces the column header and slot, not the column id', () => {
    render(<Harness />);
    const table = screen.getByRole('table');
    table.querySelectorAll('th').forEach((th, i) => {
      th.getBoundingClientRect = () => new DOMRect(i * 120, 0, 120, 32);
    });

    const grip = screen.getByLabelText(/drag to reorder amount due/i);
    fireEvent.pointerDown(grip, { clientX: 0, clientY: 0, button: 0, isPrimary: true });
    fireEvent.pointerMove(document, { clientX: 30, clientY: 0 });
    fireEvent.pointerMove(document, { clientX: -130, clientY: 0 });

    const live = screen.getByRole('status').textContent ?? '';
    expect(live).toMatch(/^Amount due, position \d of 3\.$/);
    expect(live).not.toMatch(/col_/);

    fireEvent.pointerUp(document, { clientX: -130, clientY: 0 });
    expect(screen.getByRole('status').textContent).toMatch(
      /^Dropped Amount due at position \d of 3\.$/,
    );
  });
});
