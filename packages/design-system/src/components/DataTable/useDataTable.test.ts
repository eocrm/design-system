import { renderHook, act } from '@testing-library/react';
import { useDataTable } from './useDataTable';
import type { ColumnDef } from './types';

type Row = { id: string; name: string; amount: number };

const cols: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', cell: (r) => r.name },
  { id: 'amount', header: 'Amount', cell: (r) => r.amount, sortable: true },
];

const rows: Row[] = [
  { id: 'r1', name: 'Alpha', amount: 10 },
  { id: 'r2', name: 'Bravo', amount: 20 },
];

const getRowId = (r: Row) => r.id;

describe('useDataTable — state resolution', () => {
  it('echoes data, columns, getRowId', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.data).toBe(rows);
    expect(result.current.columns).toBe(cols);
    expect(result.current.getRowId).toBe(getRowId);
    expect(result.current.pinnedRows).toEqual([]);
  });

  it('defaults enableRowSelection to false and hasExpansion to false', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.enableRowSelection).toBe(false);
    expect(result.current.hasExpansion).toBe(false);
  });

  it('reports hasExpansion=true when renderExpandedRow is provided', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: () => null,
      }),
    );
    expect(result.current.hasExpansion).toBe(true);
  });

  it('initialises columnOrder from defaultColumnOrder', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        defaultColumnOrder: ['amount', 'name'],
      }),
    );
    expect(result.current.columnOrder).toEqual(['amount', 'name']);
  });

  it('falls back to columns order when no default given', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.columnOrder).toEqual(['name', 'amount']);
  });

  it('controlled columnOrder overrides default', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        columnOrder: ['amount', 'name'],
        onColumnOrderChange: onChange,
      }),
    );
    expect(result.current.columnOrder).toEqual(['amount', 'name']);
    act(() => result.current.setColumnOrder(['name', 'amount']));
    expect(onChange).toHaveBeenCalledWith(['name', 'amount']);
  });

  it('initialises all other state pieces with sensible defaults', () => {
    const { result } = renderHook(() => useDataTable({ data: rows, columns: cols, getRowId }));
    expect(result.current.columnSizing).toEqual({});
    expect(result.current.columnVisibility).toEqual({});
    expect(result.current.columnPinning).toEqual({ left: [], right: [] });
    expect(result.current.rowSelection).toEqual({});
    expect(result.current.expandedRows).toEqual({});
    expect(result.current.sort).toBeNull();
  });

  it('derives initial columnPinning from ColumnDef.pin when no defaultColumnPinning given', () => {
    const colsWithPin: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name, pin: 'left' },
      { id: 'amount', header: 'Amount', cell: (r) => r.amount, pin: 'right' },
    ];
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: colsWithPin, getRowId }),
    );
    expect(result.current.columnPinning).toEqual({ left: ['name'], right: ['amount'] });
  });

  it('derived pinning skips columns where enablePin === false', () => {
    const colsWithPin: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name, pin: 'left' },
      { id: 'amount', header: 'Amount', cell: (r) => r.amount, pin: 'right', enablePin: false },
    ];
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: colsWithPin, getRowId }),
    );
    expect(result.current.columnPinning).toEqual({ left: ['name'], right: [] });
  });

  it('defaultColumnPinning overrides ColumnDef.pin', () => {
    const colsWithPin: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name, pin: 'left' },
      { id: 'amount', header: 'Amount', cell: (r) => r.amount },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: colsWithPin,
        getRowId,
        defaultColumnPinning: { left: [], right: ['amount'] },
      }),
    );
    expect(result.current.columnPinning).toEqual({ left: [], right: ['amount'] });
  });
});

describe('useDataTable — derived view-models', () => {
  it('visibleColumns excludes columns where columnVisibility[id] === false', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        defaultColumnVisibility: { amount: false },
      }),
    );
    expect(result.current.visibleColumns.map((c) => c.id)).toEqual(['name']);
  });

  it('visibleColumns honours columnOrder', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        defaultColumnOrder: ['amount', 'name'],
      }),
    );
    expect(result.current.visibleColumns.map((c) => c.id)).toEqual(['amount', 'name']);
  });

  it('columnSizesPx resolves: sizing state > ColumnDef.size > default 120', () => {
    const colsWithSize: ColumnDef<Row>[] = [
      { id: 'name', header: 'Name', cell: (r) => r.name },
      { id: 'amount', header: 'Amount', cell: (r) => r.amount, size: 80 },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: colsWithSize,
        getRowId,
        defaultColumnSizing: { name: 200 },
      }),
    );
    expect(result.current.columnSizesPx).toEqual({ name: 200, amount: 80 });
  });

  it('groups columns by pinning side', () => {
    const threeCols: ColumnDef<Row>[] = [
      { id: 'a', header: 'A', cell: (r) => r.id },
      { id: 'b', header: 'B', cell: (r) => r.id },
      { id: 'c', header: 'C', cell: (r) => r.id },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: threeCols,
        getRowId,
        defaultColumnPinning: { left: ['a'], right: ['c'] },
      }),
    );
    expect(result.current.leftPinnedColumns.map((c) => c.id)).toEqual(['a']);
    expect(result.current.rightPinnedColumns.map((c) => c.id)).toEqual(['c']);
    expect(result.current.unpinnedColumns.map((c) => c.id)).toEqual(['b']);
  });

  it('leftPinOffsets accumulates widths in pin order', () => {
    const threeCols: ColumnDef<Row>[] = [
      { id: 'a', header: 'A', cell: (r) => r.id, size: 50 },
      { id: 'b', header: 'B', cell: (r) => r.id, size: 80 },
      { id: 'c', header: 'C', cell: (r) => r.id },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: threeCols,
        getRowId,
        defaultColumnPinning: { left: ['a', 'b'], right: [] },
      }),
    );
    expect(result.current.leftPinOffsets).toEqual({ a: 0, b: 50 });
  });

  it('rightPinOffsets accumulates widths from the right side inward', () => {
    const threeCols: ColumnDef<Row>[] = [
      { id: 'a', header: 'A', cell: (r) => r.id, size: 50 },
      { id: 'b', header: 'B', cell: (r) => r.id, size: 80 },
      { id: 'c', header: 'C', cell: (r) => r.id, size: 60 },
    ];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: threeCols,
        getRowId,
        defaultColumnPinning: { left: [], right: ['b', 'c'] },
      }),
    );
    // right pinning: rightmost column gets right: 0, next inward stacks past it
    expect(result.current.rightPinOffsets).toEqual({ c: 0, b: 60 });
  });
});

describe('useDataTable — selection helpers', () => {
  it('toggleRowSelection toggles a single row', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        enableRowSelection: true,
        onRowSelectionChange: onChange,
      }),
    );
    act(() => result.current.toggleRowSelection('r1'));
    expect(onChange).toHaveBeenCalledWith({ r1: true });
    act(() => result.current.toggleRowSelection('r1'));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('toggleAllOnPage selects all rows in data (ignoring pinnedRows)', () => {
    const onChange = vi.fn();
    const pinned: Row[] = [{ id: 'p1', name: 'Pin', amount: 1 }];
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        pinnedRows: pinned,
        columns: cols,
        getRowId,
        enableRowSelection: true,
        onRowSelectionChange: onChange,
      }),
    );
    act(() => result.current.toggleAllOnPage());
    expect(onChange).toHaveBeenCalledWith({ r1: true, r2: true });
  });

  it('toggleAllOnPage deselects when all are selected', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        enableRowSelection: true,
        defaultRowSelection: { r1: true, r2: true },
        onRowSelectionChange: onChange,
      }),
    );
    act(() => result.current.toggleAllOnPage());
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('isAllOnPageSelected / isSomeOnPageSelected reflect data only', () => {
    const { result, rerender } = renderHook(
      (sel: { r1?: boolean; r2?: boolean }) =>
        useDataTable({
          data: rows,
          columns: cols,
          getRowId,
          enableRowSelection: true,
          rowSelection: sel,
          onRowSelectionChange: () => {},
        }),
      { initialProps: {} },
    );
    expect(result.current.isAllOnPageSelected()).toBe(false);
    expect(result.current.isSomeOnPageSelected()).toBe(false);

    rerender({ r1: true });
    expect(result.current.isAllOnPageSelected()).toBe(false);
    expect(result.current.isSomeOnPageSelected()).toBe(true);

    rerender({ r1: true, r2: true });
    expect(result.current.isAllOnPageSelected()).toBe(true);
    expect(result.current.isSomeOnPageSelected()).toBe(false); // "some but not all" semantics
  });
});

describe('useDataTable — sort helpers', () => {
  it('toggleSort cycles null → asc → desc → null', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      (sort: any) =>
        useDataTable({
          data: rows,
          columns: cols,
          getRowId,
          sort,
          onSortChange: onChange,
        }),
      { initialProps: null as any },
    );
    act(() => result.current.toggleSort('amount'));
    expect(onChange).toHaveBeenLastCalledWith({ columnId: 'amount', direction: 'asc' });

    rerender({ columnId: 'amount', direction: 'asc' });
    act(() => result.current.toggleSort('amount'));
    expect(onChange).toHaveBeenLastCalledWith({ columnId: 'amount', direction: 'desc' });

    rerender({ columnId: 'amount', direction: 'desc' });
    act(() => result.current.toggleSort('amount'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('toggleSort on a different column starts asc from scratch', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        sort: { columnId: 'amount', direction: 'desc' },
        onSortChange: onChange,
      }),
    );
    act(() => result.current.toggleSort('name'));
    expect(onChange).toHaveBeenLastCalledWith({ columnId: 'name', direction: 'asc' });
  });
});

describe('useDataTable — column helpers', () => {
  it('toggleColumnVisibility flips visibility for an id', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        onColumnVisibilityChange: onChange,
      }),
    );
    act(() => result.current.toggleColumnVisibility('amount'));
    expect(onChange).toHaveBeenCalledWith({ amount: false });
    act(() => result.current.toggleColumnVisibility('amount'));
    expect(onChange).toHaveBeenLastCalledWith({ amount: true });
  });

  it('pinColumn moves a column to left, right, or unpins it', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        onColumnPinningChange: onChange,
      }),
    );
    act(() => result.current.pinColumn('name', 'left'));
    expect(onChange).toHaveBeenLastCalledWith({ left: ['name'], right: [] });
    act(() => result.current.pinColumn('amount', 'right'));
    expect(onChange).toHaveBeenLastCalledWith({ left: ['name'], right: ['amount'] });
    act(() => result.current.pinColumn('name', false));
    expect(onChange).toHaveBeenLastCalledWith({ left: [], right: ['amount'] });
  });

  it('toggleRowExpanded flips expansion for a row id', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: rows,
        columns: cols,
        getRowId,
        renderExpandedRow: () => null,
        onExpandedRowsChange: onChange,
      }),
    );
    act(() => result.current.toggleRowExpanded('r1'));
    expect(onChange).toHaveBeenCalledWith({ r1: true });
    act(() => result.current.toggleRowExpanded('r1'));
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});
