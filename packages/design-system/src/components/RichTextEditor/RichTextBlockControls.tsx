// RichTextBlockControls.tsx — the per-block gutter overlay. Absolutely positioned
// inside the editor shell (position: relative), aligned to the active block's box.
// Lives OUTSIDE the contentEditable so it is never editable content.
import { useLayoutEffect, useState, type RefObject } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { Button } from '../Button';
import { useTranslation } from '../../i18n';
import { RichTextBlockMenu, type BlockAction } from './RichTextBlockMenu';
import type { BlockChoice } from './RichTextToolbar';
import type { BlockType } from '../RichText/engine/model';
import { GearIcon, PlusIcon } from './icons';
import { gapIndexFromY } from './blockDrop';
import styles from './RichTextEditor.module.scss';

export interface RichTextBlockControlsProps {
  /** The editor shell element ref — used to locate block boxes + anchor overlays. */
  rootRef: RefObject<HTMLElement | null>;
  /** Block currently hovered or holding the caret; null hides the gutter. */
  activeBlockId: string | null;
  /** Type of the active block (gates the menu's "Turn into" — hidden for voids). */
  activeBlockType?: BlockType;
  /** Controlled open state of the block menu. */
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onInsertBelow: (blockId: string) => void;
  onAction: (blockId: string, action: BlockAction) => void;
  onTurnInto: (blockId: string, choice: BlockChoice) => void;
  /**
   * Open the block's configuration affordance (e.g. attachment settings). When
   * set, a ⚙ Configure button appears in the gutter and a Configure item is added
   * to the block menu; both fire with the active block id. Omit for blocks that
   * have nothing to configure.
   */
  onConfigure?: (blockId: string) => void;
  /**
   * Reorder the active block to land at `targetIndex` — a "gap" (0..N) in the
   * CURRENT block array. Fired when a grip drag is dropped. Wired by the editor
   * to the subtree-aware `moveBlockUnitToIndex` engine transform.
   */
  onReorder: (blockId: string, targetIndex: number) => void;
}

const GUTTER_ROW_HEIGHT = 24;
// Stable draggable id — there is only ever one active grip in the gutter at a
// time, so a constant id is sufficient.
const GRIP_DRAGGABLE_ID = 'rte-block-grip';

/** Read each block box's vertical geometry, relative to the shell's top edge. */
function blockRects(root: HTMLElement): { top: number; height: number }[] {
  const shellTop = root.getBoundingClientRect().top;
  return Array.from(root.querySelectorAll<HTMLElement>('[data-block-id]')).map((el) => {
    const box = el.getBoundingClientRect();
    return { top: box.top - shellTop, height: box.height };
  });
}

/**
 * Wraps the grip (the `⠿` menu trigger) in a dnd-kit draggable. Pointer-move
 * past the activation distance starts a drag; a plain click falls through to the
 * menu trigger underneath (the 4px constraint guarantees a click never becomes a
 * drag). Renders its children — the real `<RichTextBlockMenu>` `<button>` — so
 * the menu's role/aria/click handling is untouched.
 */
function DraggableGrip({ children }: { children: React.ReactNode }) {
  // Only the pointer `listeners` — deliberately NOT dnd-kit's `attributes`, which
  // add role="button" + tabIndex=0 and would (a) make this span a tab stop,
  // breaking the "gutter is not in the tab order" contract, and (b) nest a button
  // role around the real grip <button>. Keyboard reorder is the editor's
  // ⌘/Ctrl+⇧↑/↓ shortcuts, so the drag handle stays pointer-only.
  const { setNodeRef, listeners } = useDraggable({ id: GRIP_DRAGGABLE_ID });
  return (
    // A thin wrapper whose pointer listeners feed the PointerSensor. The grip
    // button stays the live menu trigger; spreading drag {...listeners} on this
    // span (not the button) means a sub-4px click reaches the button normally
    // while a drag is intercepted by the sensor before it becomes a click.
    <span ref={setNodeRef} className={styles.gripDrag} {...listeners}>
      {children}
    </span>
  );
}

/**
 * Internal: the gutter overlay for the active block. Measures the block element's
 * vertical offset within the shell and renders the `＋` insert button + the block
 * menu there. Renders nothing when there is no active block. The grip doubles as
 * a drag handle: dragging it reorders the active block to the drop gap, while a
 * plain click still opens the block menu.
 */
export function RichTextBlockControls({
  rootRef,
  activeBlockId,
  activeBlockType,
  menuOpen,
  onMenuOpenChange,
  onInsertBelow,
  onAction,
  onTurnInto,
  onConfigure,
  onReorder,
}: RichTextBlockControlsProps) {
  const t = useTranslation();
  const [top, setTop] = useState<number | null>(null);
  // Bumped to re-run measurement when the root ref / block element is not yet
  // attached on the first layout-effect pass (the parent's element ref can attach
  // after this child's effect runs on mount).
  const [retry, setRetry] = useState(0);
  // The candidate drop gap (0..N) tracked during an active grip drag; null when
  // not dragging. Drives the absolutely-positioned drop indicator line.
  const [dropGap, setDropGap] = useState<number | null>(null);
  const [dropY, setDropY] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useLayoutEffect(() => {
    if (!activeBlockId) {
      setTop(null);
      setRetry(0); // fresh retry budget for the next activation
      return;
    }
    const root = rootRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(activeBlockId)}"]`);
    if (!root || !el) {
      setTop(null);
      // The root or block element isn't measurable yet; retry once it mounts.
      if (retry < 2) setRetry((n) => n + 1);
      return;
    }
    const rootBox = root.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setTop(box.top - rootBox.top + (box.height - GUTTER_ROW_HEIGHT) / 2);
  }, [rootRef, activeBlockId, menuOpen, retry]);

  // Compute the candidate gap from the pointer's current Y (initial pointer Y +
  // drag delta), measured relative to the shell. Returns null if not measurable.
  const computeDrop = (event: DragMoveEvent | DragEndEvent): { gap: number; y: number } | null => {
    const root = rootRef.current;
    if (!root) return null;
    const activator = event.activatorEvent as PointerEvent;
    const initialY = typeof activator?.clientY === 'number' ? activator.clientY : null;
    if (initialY == null) return null;
    const shellTop = root.getBoundingClientRect().top;
    const y = initialY + event.delta.y - shellTop;
    const rects = blockRects(root);
    return { gap: gapIndexFromY(rects, y), y };
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const drop = computeDrop(event);
    if (!drop) return;
    setDropGap(drop.gap);
    // Indicator sits at the top edge of the block AFTER the gap (or the bottom of
    // the last block when dropping at the end).
    const root = rootRef.current;
    if (!root) return;
    const rects = blockRects(root);
    const line =
      drop.gap < rects.length
        ? rects[drop.gap].top
        : rects.length > 0
          ? rects[rects.length - 1].top + rects[rects.length - 1].height
          : 0;
    setDropY(line);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const drop = computeDrop(event);
    if (drop && activeBlockId) onReorder(activeBlockId, drop.gap);
    setDropGap(null);
    setDropY(null);
  };

  const handleDragCancel = () => {
    setDropGap(null);
    setDropY(null);
  };

  if (!activeBlockId || top == null) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={styles.gutter} style={{ top }} contentEditable={false}>
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          tabIndex={-1}
          aria-label={t('richTextEditor.blockInsert')}
          className={styles.gutterButton}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsertBelow(activeBlockId)}
        >
          <PlusIcon />
        </Button>
        {onConfigure && (
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            tabIndex={-1}
            aria-label={t('richTextEditor.attachmentConfigure')}
            className={styles.gutterButton}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onConfigure(activeBlockId)}
          >
            <GearIcon />
          </Button>
        )}
        <DraggableGrip>
          <RichTextBlockMenu
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            onAction={(a) => onAction(activeBlockId, a)}
            onTurnInto={(c) => onTurnInto(activeBlockId, c)}
            blockType={activeBlockType}
            onConfigure={onConfigure ? () => onConfigure(activeBlockId) : undefined}
          />
        </DraggableGrip>
      </div>
      {dropGap != null && dropY != null ? (
        <div className={styles.dropIndicator} style={{ top: dropY }} contentEditable={false} />
      ) : null}
    </DndContext>
  );
}
