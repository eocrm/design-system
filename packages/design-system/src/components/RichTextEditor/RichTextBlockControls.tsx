// RichTextBlockControls.tsx — the per-block gutter overlay. Absolutely positioned
// inside the editor shell (position: relative), aligned to the active block's box.
// Lives OUTSIDE the contentEditable so it is never editable content.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
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
import { GearIcon, PlusIcon } from './icons';
import { computeReflow, type BlockRect, type UnitRange } from './blockReflow';
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
  /**
   * Reports grip-drag lifecycle so the editor can suppress hover-driven active-block
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
 * The gutter strip, wired as the dnd-kit drag handle (the WHOLE strip — ＋ / ⚙ / ⠿
 * and the space around them). A sub-4px press still reaches the buttons (insert /
 * configure / open menu); a press-drag past the 4px activation lifts the row.
 * Spreads only `listeners` — never dnd-kit's `attributes` — so the gutter stays out
 * of the tab order (keyboard reorder is the editor's ⌘/Ctrl+⇧↑/↓ shortcuts).
 */
function DraggableGutter({
  top,
  height,
  children,
}: {
  top: number;
  height: number | null;
  children: React.ReactNode;
}) {
  const { setNodeRef, listeners } = useDraggable({ id: GUTTER_DRAGGABLE_ID });
  return (
    <div
      ref={setNodeRef}
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
 * while a plain click on ＋/⚙/⠿ still triggers that button.
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
  onDraggingChange,
}: RichTextBlockControlsProps) {
  const t = useTranslation();
  const [top, setTop] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  // Bumped to re-run measurement when the root ref / block element is not yet
  // attached on the first layout-effect pass (the parent's element ref can attach
  // after this child's effect runs on mount).
  const [retry, setRetry] = useState(0);
  // Drag snapshot, captured once at drag start (measuring transformed DOM would feed
  // back on itself). null when not dragging.
  const dragRef = useRef<{ rects: BlockRect[]; els: HTMLElement[]; unit: UnitRange } | null>(null);
  // Latest drop gap from the most recent reflow, read on drag end.
  const gapRef = useRef(0);
  // Block id captured at drag start — reorder by this, not the live activeBlockId.
  const draggedIdRef = useRef<string | null>(null);

  // Latest onDraggingChange, read by the unmount cleanup without re-subscribing.
  const onDraggingChangeRef = useRef(onDraggingChange);
  onDraggingChangeRef.current = onDraggingChange;

  // If the controls unmount mid-drag (blockControls turned off, or the editor
  // unmounts), dnd-kit fires neither end nor cancel — clear any applied transforms
  // and report drag end so nothing leaks.
  useEffect(() => {
    return () => {
      clearReflow(dragRef.current, rootRef.current);
      dragRef.current = null;
      onDraggingChangeRef.current?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useLayoutEffect(() => {
    if (!activeBlockId) {
      setTop(null);
      setHeight(null);
      setRetry(0);
      return;
    }
    const root = rootRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(activeBlockId)}"]`);
    if (!root || !el) {
      setTop(null);
      setHeight(null);
      if (retry < 2) setRetry((n) => n + 1);
      return;
    }
    const rootBox = root.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setTop(box.top - rootBox.top);
    setHeight(box.height);
  }, [rootRef, activeBlockId, menuOpen, retry]);

  const handleDragStart = (_event: DragStartEvent) => {
    const root = rootRef.current;
    if (!activeBlockId || !root) return;
    draggedIdRef.current = activeBlockId;
    onMenuOpenChange(false); // a drag should never leave the block menu open
    onDraggingChange?.(true);

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

    dragRef.current = { rects, els: nodes, unit };
    root.classList.add(styles.reflowing);
    for (let i = unit.u0; i <= unit.u1; i += 1) nodes[i].classList.add(styles.blockLifted);
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
    gapRef.current = reflow.gap;
    for (let i = 0; i < snap.els.length; i += 1) {
      const dy = reflow.shifts[i];
      snap.els[i].style.transform = dy ? `translateY(${dy}px)` : '';
    }
  };

  const endDrag = () => {
    clearReflow(dragRef.current, rootRef.current);
    dragRef.current = null;
    draggedIdRef.current = null;
    gapRef.current = 0;
    onDraggingChange?.(false);
  };

  const handleDragEnd = (_event: DragEndEvent) => {
    const id = draggedIdRef.current;
    const gap = gapRef.current;
    endDrag(); // clear transforms BEFORE the reorder re-render so no inline styles linger
    if (id != null) onReorder(id, gap);
  };

  const handleDragCancel = () => {
    endDrag();
  };

  if (!activeBlockId || top == null) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DraggableGutter top={top} height={height}>
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
        <RichTextBlockMenu
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onAction={(a) => onAction(activeBlockId, a)}
          onTurnInto={(c) => onTurnInto(activeBlockId, c)}
          blockType={activeBlockType}
          onConfigure={onConfigure ? () => onConfigure(activeBlockId) : undefined}
        />
      </DraggableGutter>
    </DndContext>
  );
}
