// RichTextBlockControls.tsx — the per-block gutter overlay. Absolutely positioned
// inside the editor shell (position: relative), aligned to the active block's box.
// Lives OUTSIDE the contentEditable so it is never editable content.
import { memo, useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button } from '../Button';
import { useTranslation } from '../../i18n';
import { RichTextBlockMenu, type BlockAction } from './RichTextBlockMenu';
import type { BlockChoice } from './RichTextToolbar';
import type { BlockType } from '../RichText/engine/model';
import { PlusIcon } from './icons';
import { preventSelectionLoss } from './preventSelectionLoss';
import { computeReflow, type BlockRect, type UnitRange } from './blockReflow';
import { gapIndexFromY } from './blockDrop';
import { useShellRelativeRect, useDraggingReporter } from './useOverlayRect';
import { tidy } from '../_internal/dragAnnouncements';
import styles from './RichTextEditor.module.scss';

export interface RichTextBlockControlsProps {
  /** The editor shell element ref — used to locate block boxes + anchor overlays. */
  rootRef: RefObject<HTMLElement | null>;
  /** Block currently hovered or holding the caret; null hides the gutter. */
  activeBlockId: string | null;
  /**
   * A signature of the current block order (e.g. the ids joined). The gutter's
   * vertical position is measured from the active block's DOM box; the active
   * block keeps its id across a reorder, so without an order-derived dependency
   * the measurement would go stale and the controls would linger at the block's
   * OLD row after a drop / insert / delete. Pass an order-derived string so the
   * gutter re-measures whenever the block layout shifts.
   */
  blockOrderKey?: string;
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
   * set, a "Configure" item is added to the ⠿ block menu and fires with the
   * active block id. Omit for blocks that have nothing to configure.
   */
  onConfigure?: (blockId: string) => void;
  /**
   * Set a whole-block color from the ⠿ menu's Color submenu. When set, a Color
   * submenu is added to the menu and fires with the active block id, the color
   * type (`textColor`/`bgColor`), and the palette key (`null` clears). Omit to
   * hide the submenu.
   */
  onColor?: (blockId: string, type: 'textColor' | 'bgColor', key: string | null) => void;
  /**
   * Reorder the active block to land at `targetIndex` — a "gap" (0..N) in the
   * CURRENT block array. Fired when a block drag is dropped. Wired by the editor
   * to the subtree-aware `moveBlockUnitToIndex` engine transform.
   */
  onReorder: (blockId: string, targetIndex: number) => void;
  /**
   * Reports block-drag lifecycle so the editor can suppress hover-driven active-block
   * changes while a drag is in progress (mirrors how `menuOpen` is mirrored into a
   * ref). Called `true` on drag start, `false` on drag end/cancel.
   */
  onDraggingChange?: (dragging: boolean) => void;
}

// Stable draggable id — there is only ever one active gutter handle at a time.
const GUTTER_DRAGGABLE_ID = 'rte-block-gutter';

/** Strip all transient drag styles a reflow applied. */
function clearReflow(
  snap: { els: HTMLElement[]; unit: UnitRange } | null,
  shell: HTMLElement | null,
): void {
  if (snap) {
    for (const el of snap.els) el.style.transform = '';
    for (let i = snap.unit.u0; i <= snap.unit.u1; i += 1) {
      snap.els[i]?.classList.remove(styles.blockLifted);
    }
  }
  shell?.classList.remove(styles.reflowing);
}

/**
 * The gutter strip, wired as the dnd-kit drag handle (the WHOLE strip — ＋ / ⠿
 * and the space around them). A sub-4px press still reaches the buttons (insert /
 * open menu); a press-drag past the 4px activation lifts the row.
 * Spreads only `listeners` — never dnd-kit's `attributes` — so the gutter stays out
 * of the tab order (keyboard reorder is the editor's ⌘/Ctrl+⇧↑/↓ shortcuts).
 */
function DraggableGutter({
  top,
  height,
  innerRef,
  children,
}: {
  top: number;
  height: number | null;
  /** Captures the gutter DOM node so the drag can translate it with the lifted row. */
  innerRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const { setNodeRef, listeners } = useDraggable({ id: GUTTER_DRAGGABLE_ID });
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      innerRef.current = node;
    },
    [setNodeRef, innerRef],
  );
  return (
    <div
      ref={setRefs}
      className={styles.gutter}
      style={{ top, height: height ?? undefined }}
      contentEditable={false}
      {...listeners}
    >
      {children}
    </div>
  );
}

/**
 * Internal: the gutter overlay for the active block. Measures the block element's
 * vertical offset within the shell and renders the `＋` insert button + the block
 * menu there. Renders nothing when there is no active block. The whole gutter is
 * the drag handle: dragging it reorders the active block via an in-place reflow,
 * while a plain click on ＋/⠿ still triggers that button. Block configuration
 * (e.g. attachment settings) lives in the ⠿ menu's "Configure" item, not a
 * separate gutter button.
 */
export const RichTextBlockControls = memo(function RichTextBlockControls({
  rootRef,
  activeBlockId,
  blockOrderKey,
  activeBlockType,
  menuOpen,
  onMenuOpenChange,
  onInsertBelow,
  onAction,
  onTurnInto,
  onConfigure,
  onColor,
  onReorder,
  onDraggingChange,
}: RichTextBlockControlsProps) {
  const t = useTranslation();
  // Drag snapshot, captured once at drag start (measuring transformed DOM would feed
  // back on itself). null when not dragging.
  const dragRef = useRef<{
    rects: BlockRect[];
    els: HTMLElement[];
    unit: UnitRange;
    parentIdx: number[];
  } | null>(null);
  // Block id captured at drag start — reorder by this, not the live activeBlockId.
  const draggedIdRef = useRef<string | null>(null);
  // The gutter DOM node, so the drag can translate it in lockstep with the lifted row.
  const gutterElRef = useRef<HTMLDivElement | null>(null);
  // The dragged block's own text, captured at drag start so the announcement can
  // name it after the reflow has been cleared.
  const dragLabelRef = useRef('');

  // Reports block-drag lifecycle + fires (false) on a mid-drag unmount so nothing
  // leaks (dnd-kit fires neither end nor cancel when the controls unmount).
  const reportDragging = useDraggingReporter(onDraggingChange);

  // If the controls unmount mid-drag (blockControls turned off, or the editor
  // unmounts), clear any applied reflow transforms. The dragging-state report is
  // handled by useDraggingReporter; this effect owns the DOM-style cleanup. Order:
  // this effect is registered AFTER the reporter, so its cleanup runs FIRST —
  // clearReflow then onDraggingChange(false), matching the original order.
  useEffect(() => {
    return () => {
      clearReflow(dragRef.current, rootRef.current);
      dragRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Measure the active block's box relative to the shell. getEl folds in
  // activeBlockId (null → no target); blockOrderKey + menuOpen drive re-measure via
  // `key` — a reorder/insert/delete keeps the active block's id but moves its row, so
  // an order-derived key re-measures rather than leaving the gutter stranded.
  const blockEl = useCallback(
    () =>
      activeBlockId
        ? (rootRef.current?.querySelector<HTMLElement>(
            `[data-block-id="${CSS.escape(activeBlockId)}"]`,
          ) ?? null)
        : null,
    [rootRef, activeBlockId],
  );
  const rect = useShellRelativeRect(rootRef, blockEl, `${blockOrderKey ?? ''}|${menuOpen}`);
  const top = rect?.top ?? null;
  const height = rect?.height ?? null;

  const handleDragStart = (_event: DragStartEvent) => {
    const root = rootRef.current;
    if (!activeBlockId || !root) return;

    const shellTop = root.getBoundingClientRect().top;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-block-id]'));
    const rects: BlockRect[] = nodes.map((el) => {
      const b = el.getBoundingClientRect();
      return { top: b.top - shellTop, height: b.height };
    });
    // The dragged unit = the active block element PLUS its nested descendant blocks
    // (renderDoc nests deeper list items inside the parent <li>) — a contiguous run.
    const activeEl = nodes.find((el) => el.getAttribute('data-block-id') === activeBlockId);
    const unitIds = new Set<string>([activeBlockId]);
    activeEl?.querySelectorAll<HTMLElement>('[data-block-id]').forEach((d) => {
      const id = d.getAttribute('data-block-id');
      if (id) unitIds.add(id);
    });
    const idxs: number[] = [];
    nodes.forEach((el, i) => {
      const id = el.getAttribute('data-block-id');
      if (id && unitIds.has(id)) idxs.push(i);
    });
    if (idxs.length === 0) return;
    const unit: UnitRange = { u0: idxs[0], u1: idxs[idxs.length - 1] };

    // For each box, the index of its nearest [data-block-id] ANCESTOR (or -1). CSS
    // transforms inherit, so a nested box's own translate is offset against its
    // ancestor's in handleDragMove to land at exactly the desired shift.
    const indexOf = new Map<HTMLElement, number>(nodes.map((el, i) => [el, i]));
    const parentIdx = nodes.map((el) => {
      const anc = el.parentElement?.closest<HTMLElement>('[data-block-id]') ?? null;
      return anc && indexOf.has(anc) ? (indexOf.get(anc) as number) : -1;
    });

    draggedIdRef.current = activeBlockId;
    dragLabelRef.current = tidy(nodes[unit.u0].textContent ?? '');
    onMenuOpenChange(false); // a drag should never leave the block menu open
    reportDragging(true);
    dragRef.current = { rects, els: nodes, unit, parentIdx };
    root.classList.add(styles.reflowing);
    nodes[unit.u0].classList.add(styles.blockLifted);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const snap = dragRef.current;
    const root = rootRef.current;
    if (!snap || !root) return;
    const activator = event.activatorEvent as PointerEvent;
    const initialY = typeof activator?.clientY === 'number' ? activator.clientY : null;
    if (initialY == null) return;
    const pointerY = initialY + event.delta.y - root.getBoundingClientRect().top;
    const reflow = computeReflow(snap.rects, snap.unit, event.delta.y, pointerY);
    // Transforms inherit: set each box's OWN transform to the desired shift minus its
    // ancestor's desired shift, so inheritance composes to exactly shifts[i].
    for (let i = 0; i < snap.els.length; i += 1) {
      const pid = snap.parentIdx[i];
      const own = reflow.shifts[i] - (pid >= 0 ? reflow.shifts[pid] : 0);
      snap.els[i].style.transform = own ? `translateY(${own}px)` : '';
    }
    // Carry the gutter (＋ / ⠿) along with the lifted row by the same clamped
    // travel, so the controls feel attached to the row being dragged. The gutter is
    // not nested, so it shifts by the unit's net movement (liftDy) directly.
    if (gutterElRef.current) {
      gutterElRef.current.style.transform = reflow.liftDy ? `translateY(${reflow.liftDy}px)` : '';
    }
  };

  const endDrag = () => {
    clearReflow(dragRef.current, rootRef.current);
    if (gutterElRef.current) gutterElRef.current.style.transform = '';
    dragRef.current = null;
    draggedIdRef.current = null;
    reportDragging(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const snap = dragRef.current;
    const root = rootRef.current;
    const id = draggedIdRef.current;
    let gap: number | null = null;
    if (snap && root) {
      const activator = event.activatorEvent as PointerEvent;
      const initialY = typeof activator?.clientY === 'number' ? activator.clientY : null;
      if (initialY != null) {
        const pointerY = initialY + event.delta.y - root.getBoundingClientRect().top;
        gap = gapIndexFromY(snap.rects, pointerY);
      }
    }
    endDrag(); // clear transforms BEFORE the reorder re-render so no inline styles linger
    if (id != null && gap != null) onReorder(id, gap);
  };

  const handleDragCancel = () => {
    endDrag();
  };

  // Localized announcements (Hard rule 9, #390). This context deliberately does
  // NOT go through `useDragAccessibility`: it registers no droppables (the drop
  // slot is computed from the pointer against the document flow), so `over` is
  // always null and the shared over-driven messages would all be wrong here.
  // Same `drag.*` copy, three of the five callbacks.
  const accessibility = useMemo(() => {
    const item = () => dragLabelRef.current || t('drag.unnamed');
    return {
      announcements: {
        onDragStart: () => t('drag.pickedUp', { item: item() }),
        // Silent: with no droppables, dnd-kit's per-move announcement would be
        // a permanent, false "not over a drop target".
        onDragOver: () => undefined,
        onDragEnd: () => t('drag.moved', { item: item() }),
        onDragCancel: () => t('drag.cancelled', { item: item() }),
      },
      screenReaderInstructions: { draggable: t('drag.instructions') },
    };
  }, [t]);

  if (!activeBlockId || top == null) return null;

  return (
    <DndContext
      accessibility={accessibility}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DraggableGutter top={top} height={height} innerRef={gutterElRef}>
        <Button
          size="sm"
          variant="ghost"
          iconOnly
          tabIndex={-1}
          aria-label={t('richTextEditor.blockInsert')}
          className={styles.gutterButton}
          onMouseDown={preventSelectionLoss}
          onClick={() => onInsertBelow(activeBlockId)}
        >
          <PlusIcon />
        </Button>
        <RichTextBlockMenu
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onAction={(a) => onAction(activeBlockId, a)}
          onTurnInto={(c) => onTurnInto(activeBlockId, c)}
          blockType={activeBlockType}
          onConfigure={onConfigure ? () => onConfigure(activeBlockId) : undefined}
          onColor={onColor ? (type, key) => onColor(activeBlockId, type, key) : undefined}
        />
      </DraggableGutter>
    </DndContext>
  );
});
