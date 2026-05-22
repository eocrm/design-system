import {
  forwardRef,
  useMemo,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Table } from '../Table';
import type { TableDensity } from '../Table';
import { Checkbox } from '../Checkbox';
import { Skeleton } from '../Skeleton';
import { EmptyState } from '../EmptyState';
import { HeaderCell } from './HeaderCell';
import { BodyRow } from './BodyRow';
import { ColumnVisibilityTrigger } from './ColumnVisibilityTrigger';
import type { DataTableInstance } from './types';
import styles from './DataTable.module.scss';

export interface DataTableProps<T> {
  instance: DataTableInstance<T>;
  density?: TableDensity;
  striped?: boolean;
  /** Hover highlight on body rows. Defaults TRUE (DataTable rows are usually interactive). */
  hover?: boolean;
  bordered?: boolean;
  loading?: boolean;
  /** Number of skeleton rows when `loading`. Defaults 10. */
  loadingRowCount?: number;
  /** Element shown when `data` is empty and not loading. Defaults to a stock <EmptyState>. */
  emptyState?: ReactNode;
  /** Required for a11y when no caption is provided. */
  'aria-label'?: string;
  caption?: ReactNode;
  className?: string;
}

const AUTO_CELL_WIDTH = 44;

/**
 * Tabular data component built on the `<Table>` primitive. Owns the column-axis
 * state machine (order / sizing / visibility / pinning) and row-axis state
 * (selection, expansion). Sort/search/pagination are server-driven — DataTable
 * fires `onSortChange` and exposes selection state for the consumer to act on.
 *
 * Accepts a `DataTableInstance<T>` from `useDataTable` (the only state-owning
 * surface). Pass companion components like `<DataTable.ColumnVisibilityTrigger>`
 * the same `instance`.
 *
 * @example
 * function Example() {
 *   const instance = useDataTable<Row>({
 *     data, columns, getRowId,
 *     enableRowSelection: true,
 *     onSortChange: setSort,
 *     sort,
 *   });
 *   return (
 *     <>
 *       <DataTable.ColumnVisibilityTrigger instance={instance} />
 *       <DataTable instance={instance} aria-label="Deals" />
 *     </>
 *   );
 * }
 *
 * @remarks When NOT to use
 * - For a static read-only table without column features — use `<Table>` directly.
 * - For huge datasets (10k+ rows on screen at once) — Phase 1 doesn't virtualize;
 *   this'll get slow. Future phase will add a virtualization escape hatch.
 * - For Excel-like cell editing or cell selection — out of scope; consumer composes.
 *
 * @remarks Anti-patterns
 * - ❌ Pre-sorting / pre-filtering `data` client-side then ALSO passing `sort`.
 *   DataTable assumes `data` is the server's pre-paginated, pre-sorted slice.
 *   Mixing creates ghost rows.
 * - ❌ Mutating `columns` identity across renders. The hook captures
 *   `defaultColumnOrder` from `columns` once; later identity changes won't
 *   trigger a re-derive. Pass a stable reference (e.g. defined outside render
 *   or memoized).
 */
function DataTableInner<T>(
  {
    instance,
    density = 'comfortable',
    striped,
    hover = true,
    bordered,
    loading = false,
    loadingRowCount = 10,
    emptyState,
    caption,
    className,
    ...rest
  }: DataTableProps<T>,
  ref: Ref<HTMLTableElement>,
) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleIds = useMemo(
    () => instance.visibleColumns.map((c) => c.id),
    [instance.visibleColumns],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    instance.setColumnOrder((prev) => {
      // Map dnd-kit's visible-list-result back into the full columnOrder array
      // by replacing visible-column slots one-by-one in their absolute positions.
      const visible = prev.filter((id) => visibleIds.includes(id));
      const fromIdx = visible.indexOf(activeId);
      const toIdx = visible.indexOf(overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const reorderedVisible = [...visible];
      const [moved] = reorderedVisible.splice(fromIdx, 1);
      reorderedVisible.splice(toIdx, 0, moved!);

      // Splice reorderedVisible back into prev at the same absolute positions.
      let cursor = 0;
      return prev.map((id) => {
        if (visibleIds.includes(id)) {
          return reorderedVisible[cursor++]!;
        }
        return id;
      });
    });
  };

  const totalColCount =
    instance.visibleColumns.length + (instance.enableRowSelection ? 1 : 0);
  const dataIsEmpty =
    !loading && instance.data.length === 0 && instance.pinnedRows.length === 0;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleIds} strategy={horizontalListSortingStrategy}>
        {/* {...rest} last so consumer overrides win (Pattern A). */}
        <Table
          ref={ref}
          stickyHeader
          hover={hover}
          density={density}
          striped={striped}
          bordered={bordered}
          aria-rowcount={instance.rowCount}
          className={clsx(styles.root, className)}
          {...rest}
        >
          {caption && <Table.Caption>{caption}</Table.Caption>}

          <colgroup>
            {instance.enableRowSelection && (
              <col style={{ width: AUTO_CELL_WIDTH }} />
            )}
            {instance.visibleColumns.map((col) => (
              <col
                key={col.id}
                style={{ width: instance.columnSizesPx[col.id] ?? 120 }}
              />
            ))}
          </colgroup>

          <Table.Header>
            <Table.Row>
              {instance.enableRowSelection && (
                <Table.HeaderCell
                  align="center"
                  scope="col"
                  className={styles.autoCell}
                >
                  <Checkbox
                    checked={instance.isAllOnPageSelected()}
                    indeterminate={instance.isSomeOnPageSelected()}
                    onChange={() => instance.toggleAllOnPage()}
                    aria-label="Select all rows on page"
                  />
                </Table.HeaderCell>
              )}
              {instance.visibleColumns.map((col) => (
                <HeaderCell key={col.id} column={col} instance={instance} />
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {loading ? (
              <SkeletonRows
                count={loadingRowCount}
                totalColCount={totalColCount}
              />
            ) : dataIsEmpty ? (
              <EmptyRow totalColCount={totalColCount} content={emptyState} />
            ) : (
              instance.data.map((row) => (
                <BodyRow
                  key={instance.getRowId(row)}
                  row={row}
                  instance={instance}
                />
              ))
            )}
          </Table.Body>
        </Table>
      </SortableContext>
    </DndContext>
  );
}

function SkeletonRows({
  count,
  totalColCount,
}: {
  count: number;
  totalColCount: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Table.Row key={`sk-${i}`}>
          {Array.from({ length: totalColCount }, (_, j) => (
            <Table.Cell key={j} className={styles.skeletonCell}>
              <Skeleton variant="text" />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </>
  );
}

function EmptyRow({
  totalColCount,
  content,
}: {
  totalColCount: number;
  content?: ReactNode;
}) {
  return (
    <Table.Row>
      <Table.Cell colSpan={totalColCount} className={styles.emptyCell}>
        {content ?? <EmptyState title="No data" />}
      </Table.Cell>
    </Table.Row>
  );
}

/**
 * Generic forwardRef wrapper — TypeScript erases the `T` generic in a normal
 * forwardRef so we re-type via assertion. This is the standard pattern for
 * generic forwardRef components.
 */
export const DataTable = forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: Ref<HTMLTableElement> },
) => ReturnType<typeof DataTableInner>;

// Attach companion components as a Radix-style compound API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(DataTable as any).ColumnVisibilityTrigger = ColumnVisibilityTrigger;
