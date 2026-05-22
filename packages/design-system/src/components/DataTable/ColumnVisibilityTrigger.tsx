import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import { Columns3 } from 'lucide-react';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import type {
  DropdownMenuAlign,
  DropdownMenuSide,
} from '../DropdownMenu';
import type { DataTableInstance } from './types';

export interface ColumnVisibilityTriggerProps<T = unknown>
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onChange'> {
  /** The `useDataTable` instance to read column state from and dispatch visibility changes to. */
  instance: DataTableInstance<T>;
  /**
   * Trigger button label. Defaults to `"Columns"`.
   * Pass a node to use a custom label or icon+label combination.
   */
  label?: ReactNode;
  /**
   * Trigger icon rendered to the left of the label. Defaults to a `Columns3`
   * lucide icon (14px). Pass `null` to suppress the icon.
   */
  icon?: ReactNode;
  /** Preferred side of the trigger for the menu. Defaults to `'bottom'`. Auto-flips on collision. */
  side?: DropdownMenuSide;
  /** Edge alignment of the menu relative to the trigger. Defaults to `'start'`. */
  align?: DropdownMenuAlign;
}

/**
 * Built-in companion for `<DataTable>`. Renders a ghost Button trigger + DropdownMenu
 * of CheckboxItems — one per column where `enableHide !== false`.
 *
 * Guards against hiding the last visible hidable column: when only one
 * hidable column is currently visible, its menu item renders as disabled so
 * the table can never reach a zero-column state.
 *
 * Pair with `useDataTable` — pass the same `instance` to both `<DataTable>` and
 * `<ColumnVisibilityTrigger>` so visibility state stays in sync.
 *
 * @example
 * const instance = useDataTable<Row>({ columns, data, getRowId });
 * // Render the trigger somewhere above or beside the table.
 * <Cluster justify="end">
 *   <ColumnVisibilityTrigger instance={instance} />
 * </Cluster>
 * <DataTable instance={instance} />
 *
 * @example
 * // Custom label + right-aligned menu:
 * <ColumnVisibilityTrigger
 *   instance={instance}
 *   label="Manage columns"
 *   align="end"
 * />
 *
 * @example
 * // Icon-only trigger:
 * <ColumnVisibilityTrigger instance={instance} label={null} />
 *
 * @remarks When NOT to use
 * - When the consumer wants a different visibility UI (e.g. a settings drawer,
 *   a multi-select combobox, or a Popover with column grouping). Build it
 *   directly against `instance.columns`, `instance.columnVisibility`, and
 *   `instance.toggleColumnVisibility` — `ColumnVisibilityTrigger` is a
 *   convenience wrapper, not the only way to drive visibility state.
 * - When all columns have `enableHide: false`. The menu will be empty; don't
 *   render this component at all in that case.
 *
 * @remarks Anti-patterns
 * - ❌ Passing a different `instance` to `<ColumnVisibilityTrigger>` than to
 *   `<DataTable>`. Both must receive the same instance reference; split instances
 *   means visibility changes in the trigger won't reflect in the table (and
 *   vice versa).
 * - ❌ Rendering `<ColumnVisibilityTrigger>` when every column has
 *   `enableHide: false`. The dropdown will be empty — check `instance.columns`
 *   first and conditionally suppress the trigger.
 */
function ColumnVisibilityTriggerInner<T>(
  {
    instance,
    label = 'Columns',
    icon = <Columns3 size={14} aria-hidden="true" />,
    side,
    align,
    ...rest
  }: ColumnVisibilityTriggerProps<T>,
  ref: Ref<HTMLButtonElement>,
) {
  const hidableCols = instance.columns.filter((c) => c.enableHide !== false);

  // Count visible hidable columns so we can disable the last one.
  const visibleHidableCount = hidableCols.reduce(
    (n, c) => n + (instance.columnVisibility[c.id] === false ? 0 : 1),
    0,
  );

  return (
    <DropdownMenu>
      {/* DropdownMenu.Trigger clones its child and merges refs — the forwarded ref
          will be preserved alongside the trigger's internal positioning ref. */}
      <DropdownMenu.Trigger>
        {/* {...rest} last so consumer overrides win (Pattern A). */}
        <Button ref={ref} variant="ghost" size="sm" {...rest}>
          {icon}
          {label}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side={side} align={align}>
        {hidableCols.map((col) => {
          const visible = instance.columnVisibility[col.id] !== false;
          const isLastVisible = visible && visibleHidableCount === 1;
          const itemLabel =
            col.visibilityLabel ?? (typeof col.header === 'string' ? col.header : col.id);
          return (
            <DropdownMenu.CheckboxItem
              key={col.id}
              checked={visible}
              disabled={isLastVisible}
              onCheckedChange={() => instance.toggleColumnVisibility(col.id)}
            >
              {itemLabel}
            </DropdownMenu.CheckboxItem>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

export const ColumnVisibilityTrigger = forwardRef(ColumnVisibilityTriggerInner) as <T>(
  props: ColumnVisibilityTriggerProps<T> & { ref?: Ref<HTMLButtonElement> },
) => ReturnType<typeof ColumnVisibilityTriggerInner>;
