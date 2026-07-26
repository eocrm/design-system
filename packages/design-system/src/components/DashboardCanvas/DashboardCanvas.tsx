import { forwardRef, useCallback } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { toggleSection } from './engine';
import type { DashboardCanvasValue, DashboardItemConstraints } from './engine';
import { DashboardCanvasItem, sortByPosition } from './DashboardCanvasItem';
import { DashboardCanvasSection } from './DashboardCanvasSection';
import styles from './DashboardCanvas.module.scss';

/**
 * Per-item size constraints lookup passed to {@link DashboardCanvas}. Either a
 * plain record keyed by item id, or a function for computed/dynamic limits.
 * An item with no entry (and no matching key) gets `minW: 1`, `minH: 1`, no
 * `maxH`.
 */
export type DashboardCanvasConstraintsProp =
  | Record<string, DashboardItemConstraints>
  | ((id: string | number) => DashboardItemConstraints | undefined);

export interface DashboardCanvasProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * The controlled layout: top-level items plus an ordered array of
   * collapsible sections. `DashboardCanvas` never mutates this value — every
   * change flows out through `onChange`.
   */
  value: DashboardCanvasValue;
  /**
   * Fires once per completed gesture — a drop, a resize end, a collapse
   * toggle, a section reorder, or a cross-container move — with the whole
   * next `value`. Omit for a read-only or fully static canvas; without it,
   * collapse toggles (and, from Task 3 on, drags/resizes) have no effect.
   */
  onChange?: (next: DashboardCanvasValue) => void;
  /** Renders the body of an item by id. Called once per visible item, every render. */
  renderItem: (id: string | number) => ReactNode;
  /**
   * Optional extra controls in a section's header (a title editor, a
   * `DropdownMenu` trigger) rendered by section id, to the right of the
   * title. Keep it small — the header row is not a general-purpose toolbar.
   */
  renderSectionHeader?: (id: string | number) => ReactNode;
  /** Per-item size constraints, consulted by resize gestures (Task 3) and keyboard resize (Task 4). */
  constraints?: DashboardCanvasConstraintsProp;
  /**
   * View-only mode: identical geometry, but no drag/resize wiring (Task 3)
   * and no keyboard editing (Task 4) — the canvas renders `value` and lets
   * section collapse toggles keep working. @default false
   */
  readOnly?: boolean;
}

/**
 * Datadog-style 2D snap-grid dashboard: items placed on a 12-column grid with
 * a fixed row unit, full-width collapsible sections with their own
 * sub-grids, drag-to-move with push-down collision + compaction, and E/S/SE
 * resize (Task 3). Always controlled — there is no uncontrolled mode.
 *
 * @example
 * // Static/read-only layout — no onChange, geometry only.
 * <DashboardCanvas
 *   value={{ items: [{ id: 'kpi', x: 0, y: 0, w: 4, h: 2 }], sections: [] }}
 *   renderItem={(id) => <Card>{id}</Card>}
 *   readOnly
 * />
 *
 * @example
 * // Controlled layout with a section; onChange persists collapse toggles
 * // now, and drag/resize/reorder once Task 3 lands.
 * const [value, setValue] = useState<DashboardCanvasValue>(initialLayout);
 * <DashboardCanvas
 *   value={value}
 *   onChange={setValue}
 *   renderItem={(id) => <Card>{widgets[id].title}</Card>}
 * />
 */
export const DashboardCanvas = forwardRef<HTMLDivElement, DashboardCanvasProps>(
  function DashboardCanvas(
    {
      value,
      onChange,
      renderItem,
      renderSectionHeader,
      // Resolved for resize clamping starting in Task 3; the props interface
      // (locked API) carries it from Task 2 on.
      constraints: _constraints,
      readOnly = false,
      className,
      ...rest
    },
    ref,
  ) {
    const t = useTranslation();

    const handleToggleSection = useCallback(
      (sectionId: string | number) => {
        // Collapse stays active in readOnly — it's navigation, not editing.
        onChange?.(toggleSection(value, sectionId));
      },
      [value, onChange],
    );

    return (
      // {...rest} last so consumer overrides win (Pattern A).
      <div
        ref={ref}
        role="group"
        aria-label={t('dashboardCanvas.canvas')}
        className={clsx(styles.canvas, className)}
        data-readonly={readOnly ? '' : undefined}
        {...rest}
      >
        <div className={styles.container}>
          {sortByPosition(value.items).map((item) => (
            <DashboardCanvasItem key={item.id} placement={item}>
              {renderItem(item.id)}
            </DashboardCanvasItem>
          ))}
        </div>
        {value.sections.map((section) => (
          <DashboardCanvasSection
            key={section.id}
            section={section}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            onToggle={() => handleToggleSection(section.id)}
          />
        ))}
      </div>
    );
  },
);
