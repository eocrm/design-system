import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import type { DashboardSection } from './engine';
import { DashboardCanvasItem, sortByPosition } from './DashboardCanvasItem';
import styles from './DashboardCanvas.module.scss';

interface DashboardCanvasSectionProps {
  section: DashboardSection;
  renderItem: (id: string | number) => ReactNode;
  renderSectionHeader?: (id: string | number) => ReactNode;
  /** Fires the toggle — always active, including in `readOnly` (Task 2 spec). */
  onToggle: () => void;
}

/**
 * Internal — one full-width collapsible band: a header (collapse toggle +
 * title + optional `renderSectionHeader` slot) and a body that is the
 * section's own container grid. Collapsing unmounts the body; the section's
 * item geometry stays in `value` untouched.
 */
export function DashboardCanvasSection({
  section,
  renderItem,
  renderSectionHeader,
  onToggle,
}: DashboardCanvasSectionProps) {
  const t = useTranslation();
  const { id, title, collapsed, items } = section;

  return (
    <div className={styles.section} data-dc-section={String(id)}>
      <div className={styles.sectionHeader}>
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
          <div className={styles.sectionActions}>{renderSectionHeader(id)}</div>
        )}
      </div>
      {!collapsed && (
        <div className={styles.container}>
          {sortByPosition(items).map((item) => (
            <DashboardCanvasItem key={item.id} placement={item}>
              {renderItem(item.id)}
            </DashboardCanvasItem>
          ))}
        </div>
      )}
    </div>
  );
}
