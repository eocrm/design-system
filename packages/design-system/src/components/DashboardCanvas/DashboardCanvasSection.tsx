import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { GripVertical } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { Accordion } from '../Accordion';
import type { ContainerRef, DashboardSection } from './engine';
import { DashboardCanvasItem, sortByPosition } from './DashboardCanvasItem';
import type { CanvasGestures } from './DashboardCanvasItem';
import styles from './DashboardCanvas.module.scss';

interface DashboardCanvasSectionProps {
  section: DashboardSection;
  renderItem: (id: string | number) => ReactNode;
  renderSectionHeader?: (id: string | number) => ReactNode;
  gestures: CanvasGestures;
  /** True while this band is being pointer-reordered (styling hook). */
  dragging: boolean;
  /** Band-reorder drag zone: the dedicated grip handle only (see remarks below). */
  onHeaderPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    sectionId: string | number,
  ) => void;
  /** Keyboard band reorder: Shift+ArrowUp/Down while the trigger button has focus. */
  onHeaderKeyDown: (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    sectionId: string | number,
  ) => void;
  /** Registers the body grid in the cross-container drop-target registry. */
  setContainerEl: (cref: ContainerRef, el: HTMLElement | null) => void;
  /** Registers the band root for reorder insertion-index hit-testing. */
  setBandEl: (id: string | number, el: HTMLElement | null) => void;
}

/**
 * Internal — one full-width collapsible band, composed from the DS
 * `Accordion` for its header/chevron/panel look and open↔close animation:
 * `Accordion.Item` is the band root, `Accordion.Trigger` the title + chevron
 * (its accessible name is overridden with the toggle's full i18n'd label),
 * `Accordion.Content` the animated body. Open state is driven entirely by
 * `section.collapsed` from the parent's shared `<Accordion type="multiple">` —
 * this component never toggles itself.
 *
 * `Accordion.Content` never unmounts its body (its collapse is a CSS height
 * animation, not a DOM removal), unlike the pre-Accordion custom header this
 * replaces. Two things that invariant used to buy for free are now explicit:
 * `inert` on the body while `collapsed` removes it (and anything the
 * consumer's `renderItem` puts inside it) from focus and the accessibility
 * tree, and `DashboardCanvas.tsx` filters collapsed containers out of both
 * the pointer drop-target hit-test and the keyboard container order.
 *
 * Band drag-reorder gets its own explicit grip handle (`GripVertical`, same
 * icon `Sortable.Handle` uses) instead of "grab anywhere in the header": the
 * Accordion trigger button spans the header's full width by construction
 * (the title lives inside it, for a single accessible name), so there's no
 * separate row surface left to grab without either doubling the toggle as a
 * drag source or reaching into Accordion's private layout. The handle rides
 * in `Accordion.Trigger`'s `actions` slot alongside `renderSectionHeader`
 * extras — both are outside the toggle button by Accordion's own contract,
 * so neither ever starts nor is mistaken for a collapse click.
 */
export function DashboardCanvasSection({
  section,
  renderItem,
  renderSectionHeader,
  gestures,
  dragging,
  onHeaderPointerDown,
  onHeaderKeyDown,
  setContainerEl,
  setBandEl,
}: DashboardCanvasSectionProps) {
  const t = useTranslation();
  const { id, title, collapsed, items } = section;
  const containerRef: ContainerRef = { kind: 'section', id };
  // Collapsed content stays mounted (Accordion's animation needs real height
  // to animate from/to) but must behave exactly like readOnly: not
  // draggable, not resizable, not keyboard-editable. `inert` below covers
  // consumer-rendered content too; this covers our own item chrome/wiring.
  const itemGestures: CanvasGestures = collapsed ? { ...gestures, readOnly: true } : gestures;
  // #353: while a move (pointer drag or keyboard pick) is in flight, an empty
  // expanded body advertises itself as a drop target. When the drag preview
  // hovers this section the previewed item mounts here, `items` stops being
  // empty, and the hint yields to the regular drop-preview cell.
  const showDropHint =
    !collapsed &&
    items.length === 0 &&
    !gestures.readOnly &&
    (gestures.movingId != null || gestures.pickedId != null);

  return (
    <Accordion.Item
      value={String(id)}
      ref={(el) => setBandEl(id, el)}
      data-dc-section={String(id)}
      data-dragging={dragging ? '' : undefined}
    >
      <Accordion.Trigger
        aria-label={t(
          collapsed ? 'dashboardCanvas.sectionExpand' : 'dashboardCanvas.sectionCollapse',
          { title },
        )}
        onKeyDown={gestures.readOnly ? undefined : (e) => onHeaderKeyDown(e, id)}
        actions={
          <>
            {renderSectionHeader != null && (
              <div data-dc-section-actions>{renderSectionHeader(id)}</div>
            )}
            {!gestures.readOnly && (
              <div
                className={styles.sectionDragHandle}
                data-dc-section-handle
                aria-hidden="true"
                onPointerDown={(e) => onHeaderPointerDown(e, id)}
              >
                <GripVertical size={14} aria-hidden="true" />
              </div>
            )}
          </>
        }
      >
        {title}
      </Accordion.Trigger>
      <Accordion.Content>
        {/* .sizer: the square-cell measuring box, INSIDE Accordion.Content's
            body padding — its width is the grid's own width, so the `cqw`
            row unit stays square in section bodies too (same wrapper as the
            top-level grid; see DashboardCanvas.tsx). */}
        <div className={styles.sizer}>
          <div
            className={styles.container}
            data-dc-container={String(id)}
            data-dc-empty={items.length === 0 ? '' : undefined}
            inert={collapsed}
            ref={(el) => setContainerEl(containerRef, el)}
          >
            {sortByPosition(items).map((item) => (
              <DashboardCanvasItem
                key={item.id}
                placement={item}
                container={containerRef}
                gestures={itemGestures}
              >
                {renderItem(item.id)}
              </DashboardCanvasItem>
            ))}
            {showDropHint && (
              <div className={styles.dropHint} data-dc-drop-hint aria-hidden="true">
                {t('dashboardCanvas.dropHint')}
              </div>
            )}
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
