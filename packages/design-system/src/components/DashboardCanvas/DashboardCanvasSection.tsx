import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import type { ContainerRef, DashboardSection } from './engine';
import { DashboardCanvasItem, sortByPosition } from './DashboardCanvasItem';
import type { CanvasGestures } from './DashboardCanvasItem';
import styles from './DashboardCanvas.module.scss';

interface DashboardCanvasSectionProps {
  section: DashboardSection;
  renderItem: (id: string | number) => ReactNode;
  renderSectionHeader?: (id: string | number) => ReactNode;
  /** Fires the toggle — always active, including in `readOnly` (Task 2 spec). */
  onToggle: () => void;
  gestures: CanvasGestures;
  /** True while this band is being pointer-reordered (styling hook). */
  dragging: boolean;
  /**
   * Band-reorder drag zone: the header row, minus the collapse button and any
   * `renderSectionHeader` extras (the handler itself excludes them by target).
   */
  onHeaderPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    sectionId: string | number,
  ) => void;
  /** Registers the body grid in the cross-container drop-target registry. */
  setContainerEl: (cref: ContainerRef, el: HTMLElement | null) => void;
  /** Registers the band root for reorder insertion-index hit-testing. */
  setBandEl: (id: string | number, el: HTMLElement | null) => void;
}

/**
 * Internal — one full-width collapsible band: a header (collapse toggle +
 * title + optional `renderSectionHeader` slot) and a body that is the
 * section's own container grid. Collapsing unmounts the body; the section's
 * item geometry stays in `value` untouched. A collapsed body is therefore
 * never registered as a drop target — dragging an item over a collapsed
 * band cannot drop into it (v1; no hover-to-expand).
 */
export function DashboardCanvasSection({
  section,
  renderItem,
  renderSectionHeader,
  onToggle,
  gestures,
  dragging,
  onHeaderPointerDown,
  setContainerEl,
  setBandEl,
}: DashboardCanvasSectionProps) {
  const t = useTranslation();
  const { id, title, collapsed, items } = section;

  return (
    <div
      className={styles.section}
      data-dc-section={String(id)}
      data-dragging={dragging ? '' : undefined}
      ref={(el) => setBandEl(id, el)}
    >
      <div
        className={styles.sectionHeader}
        onPointerDown={gestures.readOnly ? undefined : (e) => onHeaderPointerDown(e, id)}
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={t(
            collapsed ? 'dashboardCanvas.sectionExpand' : 'dashboardCanvas.sectionCollapse',
            { title },
          )}
          onClick={onToggle}
          className={styles.sectionToggle}
        >
          <ChevronDown size={16} aria-hidden="true" className={styles.sectionIndicator} />
        </button>
        <span className={styles.sectionTitle}>{title}</span>
        {renderSectionHeader != null && (
          <div className={styles.sectionActions} data-dc-section-actions>
            {renderSectionHeader(id)}
          </div>
        )}
      </div>
      {!collapsed && (
        <div
          className={styles.container}
          data-dc-container={String(id)}
          ref={(el) => setContainerEl({ kind: 'section', id }, el)}
        >
          {sortByPosition(items).map((item) => (
            <DashboardCanvasItem
              key={item.id}
              placement={item}
              container={{ kind: 'section', id }}
              gestures={gestures}
            >
              {renderItem(item.id)}
            </DashboardCanvasItem>
          ))}
        </div>
      )}
    </div>
  );
}
