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
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: cols, getRowId }),
    );
    expect(result.current.data).toBe(rows);
    expect(result.current.columns).toBe(cols);
    expect(result.current.getRowId).toBe(getRowId);
    expect(result.current.pinnedRows).toEqual([]);
  });

  it('defaults enableRowSelection to false and hasExpansion to false', () => {
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: cols, getRowId }),
    );
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
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: cols, getRowId }),
    );
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
    const { result } = renderHook(() =>
      useDataTable({ data: rows, columns: cols, getRowId }),
    );
    expect(result.current.columnSizing).toEqual({});
    expect(result.current.columnVisibility).toEqual({});
    expect(result.current.columnPinning).toEqual({ left: [], right: [] });
    expect(result.current.rowSelection).toEqual({});
    expect(result.current.expandedRows).toEqual({});
    expect(result.current.sort).toBeNull();
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
