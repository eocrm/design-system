import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import { Columns3 } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import type { DropdownMenuAlign, DropdownMenuSide } from '../DropdownMenu';
import type { DataTableInstance } from './types';

export interface ColumnVisibilityTriggerProps<T = unknown> extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onChange'
> {
  /** The `useDataTable` instance to read column state from and dispatch visibility changes to. */
  instance: DataTableInstance<T>;
  /**
   * Trigger button label. Defaults to the i18n value at `dataTable.columns`
   * (`'Columns'` in English, `'Столбцы'` in Russian). Pass a node to use a
   * custom label or icon+label combination.
   *
   * An EMPTY string counts as unset, not as an explicit blank: with the icon
   * `aria-hidden`, this is the trigger's only name source (#535).
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
 * Built-in companion for `<DataTable>`: a ghost Button trigger plus a DropdownMenu of column-visibility CheckboxItems.
 * @see docs/components/DataTable.md
 */
function ColumnVisibilityTriggerInner<T>(
  {
    instance,
    label,
    icon = <Columns3 size={14} aria-hidden="true" />,
    side,
    align,
    ...rest
  }: ColumnVisibilityTriggerProps<T>,
  ref: Ref<HTMLButtonElement>,
) {
  const t = useTranslation();
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
          {/* `||`, not `??`: the icon beside it is aria-hidden, so this is the
              trigger's only name source and `label=""` would leave the button
              with no accessible name (#535, next door to this fix). */}
          {label || t('dataTable.columns')}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side={side} align={align}>
        {hidableCols.map((col) => {
          const visible = instance.columnVisibility[col.id] !== false;
          const isLastVisible = visible && visibleHidableCount === 1;
          // Truthiness at BOTH steps, not `??`. The `col.id` tail exists so a
          // column with a non-string header still gets something readable in
          // the menu; `visibilityLabel: ''` — or `header: ''`, equally a string
          // — defeated it and rendered a blank, unidentifiable checkbox row,
          // strictly worse than the raw identifier the code falls back to
          // (#536). `.trim()` matches HeaderCell's `rendersText`: a
          // whitespace-only header renders no text either.
          const itemLabel =
            col.visibilityLabel ||
            (typeof col.header === 'string' && col.header.trim() ? col.header : col.id);
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
