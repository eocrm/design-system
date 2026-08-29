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
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useEffect, useRef, useState } from 'react';
import { parse, type AtRule, type Declaration, type Root, type Rule } from 'postcss';
import { compile } from 'sass';
import { Table } from '../Table';
import { DataTable } from './DataTable';
import { useDataTable } from './useDataTable';
import { shiftVarName } from './columnShift';
import type { DataTableProps } from './DataTable';
import type { ColumnDef } from './types';
import styles from './DataTable.module.scss';

/**
 * DataTable owns a polite live region of its own for `loading`, so
 * `getByRole('status')` is ambiguous — it matches that region AND dnd-kit's
 * announcement portal. These assertions are about the drag announcements, so
 * select dnd-kit's explicitly rather than relying on there being exactly one.
 */
function dragLive(): HTMLElement {
  const dnd = screen.getAllByRole('status').filter((el) => !el.className.includes('srStatus'));
  expect(dnd).toHaveLength(1);
  return dnd[0];
}

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

function compiledRule(parent: Root | AtRule, selector: string): Rule | undefined {
  let match: Rule | undefined;
  parent.walkRules((rule) => {
    if (rule.selectors.includes(selector)) match = rule;
  });
  return match;
}

function compiledDeclaration(rule: Rule | undefined, property: string): Declaration | undefined {
  return rule?.nodes.find(
    (node): node is Declaration => node.type === 'decl' && node.prop === property,
  );
}

function Harness(props: Partial<Parameters<typeof useDataTable<Row>>[0]>) {
  const instance = useDataTable<Row>({
    data: rows,
    columns: cols,
    getRowId,
    ...props,
  });
  return <DataTable instance={instance} aria-label="Test" />;
}

describe('DataTable responsive stylesheet', () => {
  const stylesheet = parse(
    compile(resolve(__dirname, 'DataTable.module.scss'), { style: 'expanded' }).css,
  );
  const headerStylesheet = parse(
    compile(resolve(__dirname, 'HeaderCell.module.scss'), { style: 'expanded' }).css,
  );

  it('establishes an inline-size query container', () => {
    expect(
      compiledDeclaration(compiledRule(stylesheet, '.responsiveContainer'), 'container-type'),
    ).toMatchObject({ value: 'inline-size' });
  });

  it('keeps the always-mounted responsive label/value wrappers layout-neutral when wide', () => {
    expect(
      compiledDeclaration(compiledRule(stylesheet, '.responsiveVisualLabel'), 'display'),
    ).toMatchObject({ value: 'none' });
    expect(
      compiledDeclaration(compiledRule(stylesheet, '.responsiveValue'), 'display'),
    ).toMatchObject({ value: 'contents' });
    expect(
      compiledDeclaration(compiledRule(stylesheet, '.responsiveScrollWrap'), 'overflow-x'),
    ).toMatchObject({ value: 'auto' });
  });

  it.each([
    ['collapseSm', '480px'],
    ['collapseMd', '640px'],
    ['collapseLg', '768px'],
  ] as const)('emits the %s card presentation at %s', (collapseClass, threshold) => {
    const queries: AtRule[] = [];
    stylesheet.walkAtRules('container', (query) => {
      if (query.params === `(max-width: ${threshold})`) queries.push(query);
    });
    expect(queries).toHaveLength(1);
    const query = queries[0]!;
    const prefix = `.responsiveContainer > .responsiveScrollWrap.${collapseClass}`;
    const ownedTable = `${prefix} > .root`;

    query.walkRules((rule) => {
      for (const selector of rule.selectors) {
        expect(selector).toMatch(
          new RegExp(
            `^\\.responsiveContainer > \\.responsiveScrollWrap\\.${collapseClass}(?: > \\.root|$)`,
          ),
        );
      }
    });

    const rootRule = compiledRule(query, ownedTable);
    expect(compiledDeclaration(rootRule, 'display')).toMatchObject({ value: 'block' });
    expect(compiledDeclaration(rootRule, 'width')).toMatchObject({ value: '100%' });

    const rowRule = compiledRule(query, `${ownedTable} > tbody > tr`);
    expect(compiledDeclaration(rowRule, 'display')).toMatchObject({ value: 'grid' });
    expect(compiledDeclaration(rowRule, 'border')).toMatchObject({
      value: 'var(--border-width) solid var(--table-border-color)',
    });
    expect(compiledDeclaration(rowRule, 'border-radius')).toMatchObject({
      value: 'var(--data-table-clickable-row-radius)',
    });
    expect(compiledDeclaration(rowRule, 'background')).toMatchObject({ value: 'var(--table-bg)' });

    const labelRule = compiledRule(
      query,
      `${ownedTable} > tbody > tr > .responsiveDataCell > .responsiveVisualLabel`,
    );
    expect(compiledDeclaration(labelRule, 'display')).toMatchObject({ value: 'block' });

    const valueRule = compiledRule(
      query,
      `${ownedTable} > tbody > tr > .responsiveDataCell > .responsiveValue`,
    );
    expect(compiledDeclaration(valueRule, 'display')).toMatchObject({ value: 'block' });
    expect(compiledDeclaration(valueRule, 'min-width')).toMatchObject({ value: '0' });

    const unlabelledValueRule = compiledRule(
      query,
      `${ownedTable} > tbody > tr > .responsiveDataCell > .responsiveVisualLabel:empty + .responsiveValue`,
    );
    expect(compiledDeclaration(unlabelledValueRule, 'grid-column')?.value).toMatch(/^1\s*\/\s*-1$/);

    const fullWidthRule = compiledRule(query, `${ownedTable} > tbody > tr > .responsiveFullWidth`);
    expect(compiledDeclaration(fullWidthRule, 'grid-column')?.value).toMatch(/^1\s*\/\s*-1$/);
    expect(compiledDeclaration(fullWidthRule, 'width')).toMatchObject({ value: '100%' });

    const stickyResetRule = compiledRule(query, `${ownedTable} > tbody > tr > td`);
    for (const [property, value] of [
      ['position', 'static'],
      ['left', 'auto'],
      ['right', 'auto'],
      ['transform', 'none'],
    ] as const) {
      expect(compiledDeclaration(stickyResetRule, property)).toMatchObject({
        value,
        important: true,
      });
    }

    const chromeRule = compiledRule(
      query,
      `${ownedTable} > thead > tr > th > span > span > :is([data-responsive-drag-grip], [data-responsive-resize-handle])`,
    );
    expect(compiledDeclaration(chromeRule, 'display')).toMatchObject({ value: 'none' });
    expect(compiledDeclaration(chromeRule, 'pointer-events')).toMatchObject({ value: 'none' });

    const pinnedHeaderRule = compiledRule(
      query,
      `${ownedTable} > thead > tr > th[data-responsive-pinned=true]`,
    );
    expect(compiledDeclaration(pinnedHeaderRule, 'background')).toMatchObject({
      value: 'transparent',
    });
    expect(compiledDeclaration(pinnedHeaderRule, 'box-shadow')).toMatchObject({ value: 'none' });
    expect(compiledDeclaration(pinnedHeaderRule, 'z-index')).toMatchObject({ value: 'auto' });

    const emptyStripRule = compiledRule(
      query,
      `${ownedTable} > thead[data-responsive-has-items=false] > tr`,
    );
    expect(compiledDeclaration(emptyStripRule, 'padding')).toMatchObject({ value: '0' });
    expect(compiledDeclaration(emptyStripRule, 'border')).toMatchObject({ value: '0' });
    expect(compiledDeclaration(emptyStripRule, 'background')).toMatchObject({
      value: 'transparent',
    });

    const plainHeaderRule = compiledRule(
      query,
      `${ownedTable} > thead > tr > th[data-responsive-plain-label=true]:not([data-responsive-sortable=true])`,
    );
    expect(compiledDeclaration(plainHeaderRule, 'clip-path')).toMatchObject({
      value: 'inset(50%)',
    });
  });

  it('paints a focus-visible ring on the keyboard resize handle', () => {
    const focusRule = compiledRule(headerStylesheet, '.resizeHandle:focus-visible');
    expect(compiledDeclaration(focusRule, 'opacity')).toMatchObject({
      value: 'var(--data-table-header-resize-handle-opacity-visible)',
    });
    expect(compiledDeclaration(focusRule, 'outline')).toMatchObject({ value: 'none' });
    expect(compiledDeclaration(focusRule, 'box-shadow')).toMatchObject({
      value: '0 0 0 var(--ring-width) var(--ring-accent)',
    });
  });
});

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

  describe('skeleton timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-13T12:00:00Z'));
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    function LoadingHarness({
      loading,
      data = [],
      pinnedRows,
      skeletonDelay = 200,
      skeletonMinDuration = 300,
    }: {
      loading: boolean;
      data?: Row[];
      pinnedRows?: Row[];
      skeletonDelay?: number;
      skeletonMinDuration?: number;
    }) {
      const instance = useDataTable<Row>({ data, pinnedRows, columns: cols, getRowId });
      return (
        <DataTable
          instance={instance}
          aria-label="Timed loading"
          loading={loading}
          loadingRowCount={3}
          skeletonDelay={skeletonDelay}
          skeletonMinDuration={skeletonMinDuration}
        />
      );
    }

    it('keeps a fast initial load hidden inside the skeleton delay', () => {
      const { rerender } = render(<LoadingHarness loading />);

      act(() => vi.advanceTimersByTime(100));
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(0);

      rerender(<LoadingHarness loading={false} data={rows} />);
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2);

      act(() => vi.advanceTimersByTime(100));
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('shows skeleton rows only after the configured delay', () => {
      render(<LoadingHarness loading />);

      act(() => vi.advanceTimersByTime(199));
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(0);

      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);
    });

    it('retains skeleton rows for the configured minimum duration', () => {
      const { rerender } = render(
        <LoadingHarness loading skeletonDelay={100} skeletonMinDuration={300} />,
      );

      act(() => vi.advanceTimersByTime(100));
      rerender(<LoadingHarness loading={false} skeletonDelay={100} skeletonMinDuration={300} />);

      act(() => vi.advanceTimersByTime(299));
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);
      expect(screen.queryByText(/no data/i)).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });

    it('never renders arriving rows at the same time as the skeleton tail', () => {
      const pinnedRows = [{ id: 'p1', name: 'Pinned', amount: 30 }];
      const { rerender } = render(
        <LoadingHarness loading skeletonDelay={0} skeletonMinDuration={300} />,
      );
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);

      rerender(
        <LoadingHarness
          loading={false}
          data={rows}
          pinnedRows={pinnedRows}
          skeletonDelay={0}
          skeletonMinDuration={300}
        />,
      );
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);

      act(() => vi.advanceTimersByTime(300));
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Pinned')).toBeInTheDocument();
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);
    });

    it('keeps populated rows mounted throughout a timed refetch', () => {
      const { rerender } = render(<LoadingHarness loading={false} data={rows} />);
      const alphaRow = screen.getByText('Alpha').closest('tr');

      rerender(<LoadingHarness loading data={rows} />);
      act(() => vi.advanceTimersByTime(500));

      expect(screen.getByText('Alpha').closest('tr')).toBe(alphaRow);
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('ties aria-busy to actual loading instead of the skeleton tail', () => {
      const { rerender } = render(
        <LoadingHarness loading skeletonDelay={0} skeletonMinDuration={300} />,
      );
      expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');

      rerender(<LoadingHarness loading={false} skeletonDelay={0} skeletonMinDuration={300} />);
      expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);
    });
  });

  it('keeps populated rows and their focused controls mounted during a refetch', () => {
    function RefetchHarness({ loading }: { loading: boolean }) {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        enableRowSelection: true,
      });
      return <DataTable instance={instance} aria-label="t" loading={loading} />;
    }

    const { rerender } = render(<RefetchHarness loading={false} />);
    const checkbox = screen.getAllByRole('checkbox', { name: /select row/i })[0]!;
    checkbox.focus();

    rerender(<RefetchHarness loading />);

    expect(checkbox).toHaveFocus();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
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

  it('wraps the table for responsive stacking without moving its ref or consumer props', () => {
    const ref = createRef<HTMLTableElement>();
    function ResponsiveHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return (
        <DataTable
          ref={ref}
          instance={instance}
          collapseBelow="sm"
          data-testid="deals"
          className="consumer-table"
        />
      );
    }

    const { container } = render(<ResponsiveHarness />);
    const table = screen.getByTestId('deals');
    expect(ref.current).toBe(table);
    expect(table).toHaveClass('consumer-table');
    const queryContainer = container.querySelector('[data-collapse-below="sm"]')!;
    const breakpointTarget = queryContainer.firstElementChild!;
    expect(queryContainer).toHaveClass(styles.responsiveContainer);
    expect(queryContainer).not.toHaveClass(styles.collapseSm);
    expect(breakpointTarget).toHaveClass(styles.responsiveScrollWrap, styles.collapseSm);
    expect(breakpointTarget.parentElement).toBe(queryContainer);
    expect(table.closest('[data-collapse-below]')).not.toBe(table);
  });

  it.each([
    ['sm', styles.collapseSm],
    ['md', styles.collapseMd],
    ['lg', styles.collapseLg],
  ] as const)(
    'maps collapseBelow="%s" to its responsive CSS-module class',
    (breakpoint, className) => {
      function BreakpointHarness() {
        const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
        return (
          <DataTable instance={instance} aria-label="Responsive table" collapseBelow={breakpoint} />
        );
      }

      const { container } = render(<BreakpointHarness />);
      const wrapper = container.querySelector(`[data-collapse-below="${breakpoint}"]`)!;
      expect(wrapper).toHaveClass(styles.responsiveContainer);
      expect(wrapper).not.toHaveClass(className);
      expect(wrapper.firstElementChild).toHaveClass(styles.responsiveScrollWrap, className);
      expect(screen.getByText('Alpha').closest('td')).toHaveClass(styles.responsiveDataCell);
    },
  );

  it('locks the responsive table to its instance-owned scroll wrapper at runtime', () => {
    const runtimeOnlyTableProps = { scroll: true } as Record<string, unknown>;
    function RuntimeScrollHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return (
        <DataTable
          {...runtimeOnlyTableProps}
          instance={instance}
          aria-label="Locked responsive scroll"
          collapseBelow="sm"
        />
      );
    }

    render(<RuntimeScrollHarness />);

    const table = screen.getByRole('table', { name: 'Locked responsive scroll' });
    const responsiveScrollWrap = table.closest(`.${styles.responsiveScrollWrap}`)!;
    expect(table.parentElement).toBe(responsiveScrollWrap);
    expect(responsiveScrollWrap.firstElementChild).toBe(table);
  });

  it('does not expose the Table scroll prop in the public DataTable props', () => {
    type ScrollIsNotPublic = 'scroll' extends keyof DataTableProps<Row> ? false : true;
    const scrollIsNotPublic: ScrollIsNotPublic = true;
    expect(scrollIsNotPublic).toBe(true);
  });

  it('does not render a responsive wrapper unless collapseBelow is provided', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-collapse-below]')).toBeNull();
    expect(screen.getByText('Alpha').tagName).toBe('TD');
    expect(container.querySelector('[data-responsive-resize-handle]')).toBeNull();
  });

  it('renders visual-only responsive labels and one stable value wrapper per data cell', () => {
    const responsiveColumns: ColumnDef<Row>[] = [
      {
        id: 'preferred',
        header: 'Fallback',
        visibilityLabel: 'Preferred',
        cell: () => <span>A</span>,
      },
      {
        id: 'fallback',
        header: 'Header label',
        sortable: true,
        cell: () => <span>B</span>,
      },
      {
        id: 'absent',
        header: <span>Visual only</span>,
        cell: () => <button>Action</button>,
      },
      {
        id: 'siblings',
        header: 'Multiple values',
        cell: () => (
          <>
            <span>First value</span>
            <span>Second value</span>
          </>
        ),
      },
    ];
    function ResponsiveLabelsHarness() {
      const instance = useDataTable<Row>({
        data: [rows[0]!],
        columns: responsiveColumns,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="Responsive labels" collapseBelow="md" />;
    }

    render(<ResponsiveLabelsHarness />);

    const preferredCell = screen.getByText('A').closest('td')!;
    expect(preferredCell.className).toMatch(/responsiveDataCell/);
    const preferredLabel = preferredCell.querySelector(`.${styles.responsiveVisualLabel}`)!;
    expect(preferredLabel).toHaveAttribute('aria-hidden', 'true');
    expect(preferredLabel).toHaveTextContent('Preferred');
    expect(preferredCell).toHaveAccessibleName('A');
    expect(preferredCell.children).toHaveLength(2);
    expect(preferredCell.querySelector(`.${styles.responsiveValue}`)).toContainElement(
      screen.getByText('A'),
    );

    const fallbackCell = screen.getByText('B').closest('td')!;
    expect(fallbackCell.querySelector(`.${styles.responsiveVisualLabel}`)).toHaveTextContent(
      'Header label',
    );
    expect(fallbackCell).toHaveAccessibleName('B');

    const absentCell = screen.getByRole('button', { name: 'Action' }).closest('td')!;
    const absentLabel = absentCell.querySelector(`.${styles.responsiveVisualLabel}`)!;
    expect(absentLabel).toHaveAttribute('aria-hidden', 'true');
    expect(absentLabel).toBeEmptyDOMElement();
    expect(absentCell.querySelector(`.${styles.responsiveValue}`)).toContainElement(
      screen.getByRole('button', { name: 'Action' }),
    );

    const siblingsCell = screen.getByText('First value').closest('td')!;
    const siblingsValue = siblingsCell.querySelector(`.${styles.responsiveValue}`)!;
    expect(siblingsValue.children).toHaveLength(2);
    expect(siblingsValue).toContainElement(screen.getByText('First value'));
    expect(siblingsValue).toContainElement(screen.getByText('Second value'));
  });

  it('preserves selection, expansion, and row actions in a responsive table', async () => {
    const onRowSelectionChange = vi.fn();
    const onExpandedRowsChange = vi.fn();
    const onAction = vi.fn();
    const responsiveColumns: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', sortable: true, cell: (row) => row.name },
      {
        id: 'actions',
        header: <span>Actions</span>,
        visibilityLabel: 'Actions',
        cell: () => <button onClick={onAction}>Action</button>,
      },
    ];
    function ResponsiveControlsHarness() {
      const instance = useDataTable<Row>({
        data: [rows[0]!],
        columns: responsiveColumns,
        getRowId,
        enableRowSelection: true,
        defaultRowSelection: {},
        onRowSelectionChange,
        renderExpandedRow: () => <div>Detail</div>,
        defaultExpandedRows: {},
        onExpandedRowsChange,
      });
      return <DataTable instance={instance} aria-label="Responsive controls" collapseBelow="md" />;
    }

    const user = userEvent.setup();
    render(<ResponsiveControlsHarness />);

    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
      'data-responsive-sortable',
      'true',
    );
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
      'data-responsive-control',
      'true',
    );
    const selectAll = screen.getByRole('checkbox', { name: /select all/i });
    expect(selectAll.closest('th')).toHaveAttribute('data-responsive-control', 'true');
    expect(document.querySelector('thead')).toHaveAttribute('data-responsive-has-items', 'true');

    const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
    const expansionButtons = screen.getAllByRole('button', { name: /expand row/i });
    const actionButtons = screen.getAllByRole('button', { name: 'Action' });
    expect(rowCheckboxes).toHaveLength(1);
    expect(expansionButtons).toHaveLength(1);
    expect(actionButtons).toHaveLength(1);

    await user.click(rowCheckboxes[0]!);
    await user.click(expansionButtons[0]!);
    await user.click(actionButtons[0]!);
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ r1: true });
    expect(onExpandedRowsChange).toHaveBeenLastCalledWith({ r1: true });
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('retains rich non-sortable and render-function headers in the compact strip', () => {
    const responsiveColumns: ColumnDef<Row>[] = [
      {
        id: 'plain',
        header: 'Plain label',
        cell: () => 'Plain value',
        enableReorder: false,
        enableResize: false,
      },
      {
        id: 'node',
        header: <button>Node header action</button>,
        cell: () => 'Node value',
        enableReorder: false,
        enableResize: false,
      },
      {
        id: 'rendered',
        header: () => <button>Rendered header action</button>,
        cell: () => 'Rendered value',
        enableReorder: false,
        enableResize: false,
      },
    ];
    function RichHeadersHarness() {
      const instance = useDataTable<Row>({
        data: [rows[0]!],
        columns: responsiveColumns,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="Rich headers" collapseBelow="sm" />;
    }

    render(<RichHeadersHarness />);

    const plainHeader = screen.getByRole('columnheader', { name: 'Plain label' });
    expect(plainHeader).toHaveAttribute('data-responsive-plain-label', 'true');
    expect(plainHeader).not.toHaveAttribute('data-responsive-retained-header');

    for (const buttonName of ['Node header action', 'Rendered header action']) {
      const button = screen.getByRole('button', { name: buttonName });
      expect(button.closest('th')).toHaveAttribute('data-responsive-retained-header', 'true');
      expect(button.closest('th')).not.toHaveAttribute('data-responsive-plain-label');
    }
    expect(document.querySelector('thead')).toHaveAttribute('data-responsive-has-items', 'true');
  });

  it('suppresses an empty compact header band and does not retain the blank expansion header', () => {
    const plainColumns: ColumnDef<Row>[] = [
      {
        id: 'name',
        header: 'Name',
        cell: (row) => row.name,
        enableReorder: false,
        enableResize: false,
      },
    ];
    function EmptyStripHarness() {
      const instance = useDataTable<Row>({
        data: [rows[0]!],
        columns: plainColumns,
        getRowId,
        renderExpandedRow: () => <div>Detail</div>,
      });
      return <DataTable instance={instance} aria-label="Empty compact strip" collapseBelow="sm" />;
    }

    render(<EmptyStripHarness />);

    expect(document.querySelector('thead')).toHaveAttribute('data-responsive-has-items', 'false');
    const expansionHeader = screen.getByRole('columnheader', { name: /row expansion/i });
    expect(expansionHeader).not.toHaveAttribute('data-responsive-control');
    expect(expansionHeader).not.toHaveAttribute('data-responsive-retained-header');
  });

  it('keeps a nested Table outside the owning responsive row selectors', () => {
    const nestedColumns: ColumnDef<Row>[] = [
      {
        id: 'nested',
        header: 'Nested table',
        enableReorder: false,
        enableResize: false,
        cell: () => (
          <Table aria-label="Nested Table">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Nested heading</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row>
                <Table.Cell>Nested value</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        ),
      },
    ];
    function NestedTableHarness() {
      const instance = useDataTable<Row>({
        data: [rows[0]!],
        columns: nestedColumns,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="Outer Table" collapseBelow="sm" />;
    }

    render(<NestedTableHarness />);

    const outerTable = screen.getByRole('table', { name: 'Outer Table' }) as HTMLTableElement;
    const nestedTable = screen.getByRole('table', { name: 'Nested Table' }) as HTMLTableElement;
    const outerWrapper = outerTable.closest('[data-collapse-below="sm"]')!;
    const ownedRows = outerWrapper.querySelectorAll(
      `:scope > .${styles.responsiveScrollWrap} > .${styles.root} > tbody > tr`,
    );
    expect(ownedRows).toHaveLength(1);
    expect(ownedRows[0]).toBe(outerTable.tBodies[0]!.rows[0]);
    expect(Array.from(ownedRows)).not.toContain(nestedTable.tBodies[0]!.rows[0]);
  });

  it('keeps a nested DataTable under its own responsive wrapper and selectors', () => {
    const innerRows: Row[] = [{ id: 'inner', name: 'Inner value', amount: 1 }];
    const innerColumns: ColumnDef<Row>[] = [
      {
        id: 'name',
        header: 'Inner name',
        cell: (row) => row.name,
        enableReorder: false,
        enableResize: false,
      },
    ];
    function NestedDataTable() {
      const instance = useDataTable<Row>({
        data: innerRows,
        columns: innerColumns,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="Inner DataTable" collapseBelow="lg" />;
    }
    const outerColumns: ColumnDef<Row>[] = [
      {
        id: 'nested',
        header: 'Nested data table',
        enableReorder: false,
        enableResize: false,
        cell: () => <NestedDataTable />,
      },
    ];
    function NestedDataTableHarness() {
      const instance = useDataTable<Row>({
        data: [rows[0]!],
        columns: outerColumns,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="Outer DataTable" collapseBelow="sm" />;
    }

    render(<NestedDataTableHarness />);

    const outerTable = screen.getByRole('table', { name: 'Outer DataTable' }) as HTMLTableElement;
    const innerTable = screen.getByRole('table', { name: 'Inner DataTable' }) as HTMLTableElement;
    const outerWrapper = outerTable.closest('[data-collapse-below="sm"]')!;
    const ownedRows = outerWrapper.querySelectorAll(
      `:scope > .${styles.responsiveScrollWrap} > .${styles.root} > tbody > tr`,
    );
    expect(ownedRows).toHaveLength(1);
    expect(ownedRows[0]).toBe(outerTable.tBodies[0]!.rows[0]);
    expect(Array.from(ownedRows)).not.toContain(innerTable.tBodies[0]!.rows[0]);
    expect(innerTable.closest('[data-collapse-below]')).toHaveAttribute(
      'data-collapse-below',
      'lg',
    );
  });

  it('names responsive resize separators by visibility label, string header, then id', () => {
    const namedColumns: ColumnDef<Row>[] = [
      {
        id: 'preferred-id',
        header: <span>Rich preferred</span>,
        visibilityLabel: 'Preferred resize name',
        cell: () => 'A',
        enableReorder: false,
      },
      {
        id: 'string-id',
        header: 'String resize name',
        cell: () => 'B',
        enableReorder: false,
        maxSize: 240,
      },
      {
        id: 'id-fallback',
        header: <span>Rich fallback</span>,
        cell: () => 'C',
        enableReorder: false,
      },
    ];
    function ResizeNamesHarness() {
      const instance = useDataTable<Row>({
        data: [rows[0]!],
        columns: namedColumns,
        getRowId,
      });
      return <DataTable instance={instance} aria-label="Resize names" collapseBelow="md" />;
    }

    render(<ResizeNamesHarness />);

    // Named for the ACTION, not the column alone — a keyboard user tabbing
    // here used to hear "Preferred resize name, separator" with no hint that
    // it resizes anything (#500).
    const defaultRange = screen.getByRole('separator', {
      name: 'Resize Preferred resize name column',
    });
    expect(defaultRange).toHaveAttribute('aria-valuemin', '40');
    expect(defaultRange).toHaveAttribute('aria-valuenow', '120');
    expect(defaultRange).toHaveAttribute('aria-valuemax', String(Number.MAX_SAFE_INTEGER));
    expect(Number(defaultRange.getAttribute('aria-valuemax'))).toBeGreaterThanOrEqual(
      Number(defaultRange.getAttribute('aria-valuenow')),
    );

    const explicitRange = screen.getByRole('separator', {
      name: 'Resize String resize name column',
    });
    expect(explicitRange).toHaveAttribute('aria-valuenow', '120');
    expect(explicitRange).toHaveAttribute('aria-valuemax', '240');
    expect(Number(explicitRange.getAttribute('aria-valuemax'))).toBeGreaterThanOrEqual(
      Number(explicitRange.getAttribute('aria-valuenow')),
    );
    expect(
      screen.getByRole('separator', { name: 'Resize id-fallback column' }),
    ).toBeInTheDocument();
  });

  it('exposes stable responsive hooks for wide-table drag and resize controls', () => {
    function ResponsiveHooksHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="Responsive hooks" collapseBelow="sm" />;
    }
    render(<ResponsiveHooksHarness />);

    const dataHeaders = screen
      .getAllByRole('columnheader')
      .filter((header) => header.hasAttribute('data-dt-column-id'));
    expect(dataHeaders).toHaveLength(2);
    for (const header of dataHeaders) {
      const tableChildrenWrapper = header.firstElementChild?.firstElementChild;
      const headerContent = header.querySelector('[data-responsive-header-content]');
      const dragGrip = header.querySelector('[data-responsive-drag-grip]');
      const resizeHandle = header.querySelector('[data-responsive-resize-handle]');
      expect(headerContent?.parentElement).toBe(tableChildrenWrapper);
      expect(dragGrip?.parentElement).toBe(tableChildrenWrapper);
      expect(resizeHandle?.parentElement).toBe(tableChildrenWrapper);
    }
  });

  it('preserves legacy label-key resizing and a non-focusable handle by default', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('col')).toHaveStyle({ width: '120px' });

    fireEvent.keyDown(screen.getByRole('button', { name: 'Name' }), { key: 'ArrowRight' });

    expect(container.querySelector('col')).toHaveStyle({ width: '128px' });
    const header = screen.getByRole('columnheader', { name: /name/i });
    expect(within(header).queryByRole('separator')).not.toBeInTheDocument();
    const resizeHandle = header.querySelector('span[aria-hidden="true"]')!;
    expect(resizeHandle).toHaveAttribute('aria-hidden', 'true');
    expect(resizeHandle).not.toHaveAttribute('tabindex');
  });

  it('moves keyboard resizing to a dedicated handle only for responsive tables', () => {
    function ResponsiveResizeHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="Responsive resize" collapseBelow="sm" />;
    }
    const { container } = render(<ResponsiveResizeHarness />);
    const label = screen.getByRole('button', { name: 'Name' });
    const resizeHandle = within(screen.getByRole('columnheader', { name: /name/i })).getByRole(
      'separator',
      { name: 'Resize Name column' },
    );
    expect(resizeHandle).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(label, { key: 'ArrowRight' });
    expect(container.querySelector('col')).toHaveStyle({ width: '120px' });

    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });

    expect(container.querySelector('col')).toHaveStyle({ width: '128px' });
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '128');
    expect(resizeHandle).toHaveAttribute('aria-valuetext', '128px');
  });

  it('keeps sortable labels keyboard-accessible when responsive resize uses the handle', () => {
    const onSortChange = vi.fn();
    function ResponsiveSortHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        onSortChange,
      });
      return <DataTable instance={instance} aria-label="Responsive sort" collapseBelow="sm" />;
    }
    render(<ResponsiveSortHarness />);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Name' }), { key: 'Enter' });

    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'asc' });
  });

  it('marks skeleton and empty-state cells as responsive full-width content', () => {
    function PlaceholderHarness({ loading }: { loading?: boolean }) {
      const instance = useDataTable<Row>({ data: [], columns: cols, getRowId });
      return (
        <DataTable
          instance={instance}
          aria-label="Placeholder rows"
          loading={loading}
          collapseBelow="sm"
        />
      );
    }

    const { container, rerender } = render(<PlaceholderHarness loading />);
    expect(container.querySelector('tbody td')?.className).toMatch(/responsiveFullWidth/);

    rerender(<PlaceholderHarness />);
    expect(container.querySelector('tbody td')?.className).toMatch(/responsiveFullWidth/);
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

  it('marks pinned headers with a stable responsive paint hook', () => {
    function ResponsivePinnedHarness() {
      const instance = useDataTable<Row>({
        data: rows,
        columns: cols,
        getRowId,
        defaultColumnPinning: { left: ['name'], right: [] },
      });
      return <DataTable instance={instance} aria-label="Pinned hooks" collapseBelow="sm" />;
    }
    render(<ResponsivePinnedHarness />);
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute(
      'data-responsive-pinned',
      'true',
    );
    expect(screen.getByRole('columnheader', { name: /amount/i })).not.toHaveAttribute(
      'data-responsive-pinned',
    );
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
    expect(dragLive().textContent).toBe('Dropped Name at position 2 of 2.');
  });

  it('announces the slot it commits when the release resolves no target at all', () => {
    renderWithRects(pinnedRightCols, rightRects);
    dragTo(/drag to reorder name/i, 200, 5000);
    fireEvent.pointerUp(document);
    expect(dragLive().textContent).toBe('Dropped Name at position 2 of 2.');
  });

  it('DOES announce "nothing moved" on the dragWholeColumn={false} path, which discards', () => {
    // The mirror of the two above: that path keeps its discard, so the honest
    // announcement is the one the others would have been wrong to make.
    renderWithRects(pinnedRightCols, rightRects, { dragWholeColumn: false });
    dragTo(/drag to reorder name/i, 200);
    // Clear of the header row entirely: `over` goes non-null → null, which is
    // the one transition that fires an `onDragOver` with no target at all.
    fireEvent.pointerMove(document, { clientX: 200, clientY: 5000 });
    expect(dragLive().textContent).toBe('Name is not over a drop target.');
    fireEvent.pointerUp(document);
    expect(dragLive().textContent).toBe('Released Name. Nothing moved.');
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
    expect(dragLive().textContent).toBe('Dropped Name at position 2 of 3.');
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

    const live = dragLive().textContent ?? '';
    expect(live).toMatch(/^Amount due, position \d of 3\.$/);
    expect(live).not.toMatch(/col_/);

    fireEvent.pointerUp(document, { clientX: -130, clientY: 0 });
    expect(dragLive().textContent).toMatch(/^Dropped Amount due at position \d of 3\.$/);
  });
});

describe('loading state reaches assistive tech (#488)', () => {
  // dnd-kit's portal region is the other role=status in this tree, which is
  // why this filters by class — the same ambiguity dragLive() handles above.
  const ownRegion = (el: HTMLElement) =>
    [...el.querySelectorAll('[role="status"]')].filter((n) => n.className.includes('srStatus'));

  function Harness4({ data, loading }: { data: Row[]; loading: boolean }) {
    const instance = useDataTable<Row>({ data, columns: cols, getRowId });
    return <DataTable instance={instance} aria-label="t" loading={loading} />;
  }

  it('announces an initial empty load, and its resolution', () => {
    const { rerender, container } = render(<Harness4 data={[]} loading={false} />);
    expect(ownRegion(container)).toHaveLength(1);
    expect(ownRegion(container)[0].textContent).toBe('');

    rerender(<Harness4 data={[]} loading />);
    expect(ownRegion(container)[0].textContent).toBe('Loading rows…');

    // Resolution must be announced too — going straight from "Loading rows…"
    // to populated in silence is the same half-finished shape the region
    // exists to fix.
    rerender(<Harness4 data={rows} loading={false} />);
    expect(ownRegion(container)[0].textContent).toBe('Rows loaded');
  });

  it('announces the outcome, not just completion, when a load returns nothing', () => {
    // "Rows loaded" over an empty table was the bug: the region said one thing
    // and the screen said "No data".
    const { rerender, container } = render(<Harness4 data={[]} loading={false} />);
    rerender(<Harness4 data={[]} loading />);
    expect(ownRegion(container)[0].textContent).toBe('Loading rows…');
    rerender(<Harness4 data={[]} loading={false} />);
    expect(ownRegion(container)[0].textContent).toBe('No rows loaded');
  });

  it('stays silent for a refetch over rows that are already rendered', () => {
    // The table keeps existing rows mounted during a refetch and shows no
    // skeleton, so nothing changes on screen. Announcing anyway would
    // interrupt a reader on every poll of a 30s-refresh table.
    const { rerender, container } = render(<Harness4 data={rows} loading={false} />);
    rerender(<Harness4 data={rows} loading />);
    expect(ownRegion(container)[0].textContent).toBe('');
  });
});

describe('collapseBelow does not duplicate the column header name (#500)', () => {
  function NameHarness({ collapseBelow }: { collapseBelow?: 'md' }) {
    const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
    return <DataTable instance={instance} aria-label="t" collapseBelow={collapseBelow} />;
  }

  it('names the header once, with and without collapseBelow', () => {
    // Setting collapseBelow flipped the resize handle from aria-hidden to a
    // NAMED role="separator" inside the <th>, and its name was the column's
    // own header text — so name-from-content computed "Name Name" at every
    // width, not just while stacked. The <th> now takes its name from the
    // label span by id, which excludes the handle and the drag grip.
    const { unmount } = render(<NameHarness />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    unmount();

    render(<NameHarness collapseBelow="md" />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Name Name' })).toBeNull();
  });

  it('names an icon-only header instead of leaving it nameless', () => {
    // The first fix pointed the <th> at its label span unconditionally. For a
    // ReactNode header whose content is aria-hidden that span is empty, so the
    // columnheader ended up with NO name — a worse axe violation than the
    // duplicate it replaced.
    const iconCols: ColumnDef<Row>[] = [
      {
        id: 'starred',
        header: <span aria-hidden="true">★</span>,
        visibilityLabel: 'Starred',
        cell: () => 'x',
      },
    ];
    function IconHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: iconCols, getRowId });
      return <DataTable instance={instance} aria-label="t" collapseBelow="md" />;
    }
    render(<IconHarness />);
    expect(screen.getByRole('columnheader', { name: 'Starred' })).toBeInTheDocument();
  });

  it.each([
    [
      'a select-all checkbox',
      <input type="checkbox" aria-label="Select all" readOnly />,
      'Select all',
    ],
    ['an img with alt', <img src="x.png" alt="Vendor logo" />, 'Vendor logo'],
  ])('names a header labelled by a descendant: %s', (_what, node, expected) => {
    // Text is not the only source of an accessible name. Measuring textContent
    // alone found these empty and fell back to `column.id`, so a select-all
    // column — the commonest ReactNode header in a table — announced as
    // "select_all_col" while the correct name sat in the DOM unused.
    const cols: ColumnDef<Row>[] = [{ id: 'select_all_col', header: node, cell: () => 'x' }];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    expect(screen.getByRole('columnheader', { name: expected })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'select_all_col' })).toBeNull();
  });

  it.each([
    ['resolves to real text', 'ext-label', true],
    ['points at nothing', 'no-such-id', false],
  ])('descendant aria-labelledby that %s', (_what, target, shouldName) => {
    // Presence proves nothing — #500 was caused by an aria-labelledby pointing
    // at an EMPTY element — so the reference is resolved. One that resolves
    // does name the header; one that does not must fall back.
    const cols: ColumnDef<Row>[] = [
      {
        id: 'internal_id_col',
        header: <span aria-labelledby={target} />,
        visibilityLabel: 'Fallback',
        cell: () => 'x',
      },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return (
        <>
          <span id="ext-label">Revenue</span>
          <DataTable instance={instance} aria-label="t" />
        </>
      );
    }
    render(<Harness />);
    const th = screen.getAllByRole('columnheader')[0]!;
    if (shouldName) {
      expect(th.getAttribute('aria-labelledby')).not.toBeNull();
      expect(th.getAttribute('aria-label')).toBeNull();
    } else {
      expect(th.getAttribute('aria-label')).toBe('Fallback');
    }
  });

  it.each([
    // svg is why the allow-list version had to go: lucide forwards props onto
    // a bare <svg>, making this the commonest icon-only header there is.
    ['svg with aria-label', <svg aria-label="Revenue" key="s" />, true],
    ['summary with aria-label', <summary aria-label="Revenue" key="m" />, true],
    ['div with role=img', <div role="img" aria-label="Revenue" key="d" />, true],
    // role="presentation" wins over alt, so this names nothing.
    [
      'img alt under role=presentation',
      <img src="x.png" alt="Revenue" role="presentation" key="p" />,
      false,
    ],
    // A name-prohibited role. Invisible to jsdom, which honours it.
    [
      'role=paragraph with aria-label',
      <span role="paragraph" aria-label="Revenue" key="g" />,
      false,
    ],
  ])('descendant naming: %s', (_what, node, shouldName) => {
    const cols: ColumnDef<Row>[] = [
      { id: 'internal_id_col', header: node, visibilityLabel: 'Fallback', cell: () => 'x' },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    const th = screen.getAllByRole('columnheader')[0]!;
    // Asserts WHICH mechanism was chosen, not the name jsdom computes — jsdom
    // disagrees with browsers on two of these.
    if (shouldName) {
      expect(th.getAttribute('aria-labelledby')).not.toBeNull();
      expect(th.getAttribute('aria-label')).toBeNull();
    } else {
      expect(th.getAttribute('aria-label')).toBe('Fallback');
    }
  });

  it('names the sort control on an icon-only header', () => {
    // The label span is role="button" tabIndex=0 when the column is sortable.
    // With nothing nameable inside it was a focusable button with no
    // accessible name at all — beside a <th> six rounds had been busy naming.
    const cols: ColumnDef<Row>[] = [
      {
        id: 'starred_col',
        header: <span aria-hidden="true">★</span>,
        visibilityLabel: 'Starred',
        sortable: true,
        cell: () => 'x',
      },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Starred' })).toBeInTheDocument();
  });

  it('ignores aria-label on a role=generic element, which browsers do not honour', () => {
    // ARIA 1.2 prohibits naming role="generic", so a bare <span aria-label>
    // names NOTHING in a browser. Counting it chose aria-labelledby and left
    // real users with an unnamed column header.
    //
    // This case is invisible to an accessible-name assertion here: jsdom's
    // dom-accessibility-api honours aria-label on a bare span, so such a test
    // would pass while the browser behaviour stayed broken. The assertion is
    // therefore on WHICH mechanism the component chose, not on the name jsdom
    // computes from it.
    const cols: ColumnDef<Row>[] = [
      {
        id: 'internal_id_col',
        header: <span aria-label="Revenue" />,
        visibilityLabel: 'Revenue',
        cell: () => 'x',
      },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    const th = screen.getAllByRole('columnheader')[0]!;
    expect(th.getAttribute('aria-label')).toBe('Revenue');
    expect(th.getAttribute('aria-labelledby')).toBeNull();
  });

  it('still counts aria-label on an element whose role permits naming', () => {
    const cols: ColumnDef<Row>[] = [
      {
        id: 'internal_id_col',
        header: <span role="img" aria-label="Revenue" />,
        visibilityLabel: 'Ignored',
        cell: () => 'x',
      },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    const th = screen.getAllByRole('columnheader')[0]!;
    expect(th.getAttribute('aria-labelledby')).not.toBeNull();
    expect(th.getAttribute('aria-label')).toBeNull();
  });

  it('ignores alt on an element that alt cannot name', () => {
    // `alt` names only img, area and input[type=image]. On a <div> it is an
    // unknown attribute, so counting it chose aria-labelledby and pointed at a
    // span computing to nothing — the unnamed columnheader again.
    //
    // Spread, because TSX rejects `<div alt="Vendor" />` outright. Worth
    // knowing: the type system already blocks the direct form, so this only
    // arrives via a spread of consumer props — which is exactly how `{...rest}`
    // reaches a header in practice.
    const spread = { alt: 'Vendor' } as Record<string, string>;
    const cols: ColumnDef<Row>[] = [
      {
        id: 'vendor_col',
        header: <div {...spread} />,
        visibilityLabel: 'Vendor',
        cell: () => 'x',
      },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    expect(screen.getByRole('columnheader', { name: 'Vendor' })).toBeInTheDocument();
  });

  it('does not treat a bare title as a name — it computes to nothing', () => {
    // `title` alone yields an EMPTY accessible name, so counting it as
    // evidence the header names itself chose aria-labelledby and produced an
    // unnamed columnheader — the defect the fallback exists to prevent.
    // Verified with computeAccessibleName rather than assumed.
    const cols: ColumnDef<Row>[] = [
      {
        id: 'rev_internal',
        header: (
          <span title="Sort by revenue">
            <i aria-hidden="true">*</i>
          </span>
        ),
        visibilityLabel: 'Revenue',
        cell: () => 'x',
      },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    expect(screen.getByRole('columnheader', { name: 'Revenue' })).toBeInTheDocument();
  });

  it('leaves a [hidden] header unnamed rather than falsely named', () => {
    // `hidden` counts in textContent and not in the accessible name, so
    // measuring text alone chose aria-labelledby and produced an EMPTY name —
    // the unnamed columnheader the fallback exists to prevent.
    const cols: ColumnDef<Row>[] = [
      {
        id: 'rev_col',
        header: <span hidden>Revenue</span>,
        visibilityLabel: 'Revenue',
        cell: () => 'x',
      },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    expect(screen.getByRole('columnheader', { name: 'Revenue' })).toBeInTheDocument();
  });

  it('re-measures when [hidden] is lifted asynchronously', async () => {
    // The observer watched only `aria-hidden`, but `measure` also reads
    // `hidden` — so a header revealed at a breakpoint stayed named by its
    // column id.
    function AsyncHidden() {
      const [h, setH] = useState(true);
      useEffect(() => {
        const id = setTimeout(() => setH(false), 0);
        return () => clearTimeout(id);
      }, []);
      return <span hidden={h}>Revenue</span>;
    }
    const cols: ColumnDef<Row>[] = [{ id: 'revenue_id', header: <AsyncHidden />, cell: () => 'x' }];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByText('Revenue')).not.toHaveAttribute('hidden');
    });
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Revenue' })).toBeInTheDocument();
    });
  });

  it('re-measures when [alt] is filled in asynchronously', async () => {
    // Same gap for the descendant name sources: an `alt` arriving after a
    // fetch changed the accessible name with nothing observing it.
    function AsyncAlt() {
      const [a, setA] = useState('');
      useEffect(() => {
        const id = setTimeout(() => setA('Vendor logo'), 0);
        return () => clearTimeout(id);
      }, []);
      return <img src="x.png" alt={a} />;
    }
    const cols: ColumnDef<Row>[] = [{ id: 'logo_id', header: <AsyncAlt />, cell: () => 'x' }];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: cols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByAltText('Vendor logo')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Vendor logo' })).toBeInTheDocument();
    });
  });

  it('re-measures a header that renders its text asynchronously', async () => {
    // A `header` ReactNode owning its own state updates its subtree WITHOUT
    // re-rendering HeaderCell, so a per-commit measurement read it once as
    // empty and never looked again — the header displayed "Revenue" and
    // announced "revenue_id" forever. That is the same defect the icon-only
    // fix introduced, resurrected for a narrower input, which is why the
    // measurement observes the subtree instead of sampling it on commit.
    function AsyncHeader() {
      const [text, setText] = useState('');
      useEffect(() => {
        const id = setTimeout(() => setText('Revenue'), 0);
        return () => clearTimeout(id);
      }, []);
      return <span>{text}</span>;
    }
    const asyncCols: ColumnDef<Row>[] = [
      { id: 'revenue_id', header: <AsyncHeader />, cell: () => 'x' },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: asyncCols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    await screen.findByText('Revenue');
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Revenue' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('columnheader', { name: 'revenue_id' })).toBeNull();
  });

  it('warns in dev when a header would announce as its column id', () => {
    // The fallback is a last resort and it degrades to a raw identifier, which
    // has no visible symptom — the column looks fine and only a screen-reader
    // user hears the bug. So it warns once.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const iconOnly: ColumnDef<Row>[] = [
      { id: 'internal_star_id', header: <span aria-hidden="true">★</span>, cell: () => 'x' },
    ];
    function Harness() {
      const instance = useDataTable<Row>({ data: rows, columns: iconOnly, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<Harness />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('internal_star_id'));
    warn.mockRestore();
  });

  it('names a JSX header by its rendered text, not by the column id', () => {
    // The icon-only fix keyed off `typeof header === 'string'`, which made
    // EVERY ReactNode header take `aria-label={columnLabel}` — and with no
    // `visibilityLabel` that falls all the way back to `column.id`. So
    // `<strong>Revenue</strong>` announced as "revenue", at every width, not
    // just under collapseBelow. Both attributes are unconditional.
    const jsxCols: ColumnDef<Row>[] = [
      { id: 'revenue', header: <strong>Revenue</strong>, cell: () => 'x' },
    ];
    function JsxHarness() {
      const instance = useDataTable<Row>({ data: rows, columns: jsxCols, getRowId });
      return <DataTable instance={instance} aria-label="t" />;
    }
    render(<JsxHarness />);
    expect(screen.getByRole('columnheader', { name: 'Revenue' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'revenue' })).toBeNull();
  });

  it('still exposes the resize handle, named for what it does', () => {
    render(<NameHarness collapseBelow="md" />);
    expect(screen.getByRole('separator', { name: 'Resize Name column' })).toBeInTheDocument();
  });
});
