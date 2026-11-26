import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  getScrollableAncestors,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type Announcements,
  type DndContextProps,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type PointerSensorOptions,
} from '@dnd-kit/core';
import { add, getEventCoordinates, type Coordinates } from '@dnd-kit/utilities';
import { useTranslation } from '../../i18n/useTranslation';
import type { TreeItem } from './treeModel';
import { dropTarget, hitTest, type DropTarget, type TreeViewMove } from './treeMove';

type NodeItem = Extract<TreeItem, { kind: 'node' }>;

/** Hover this long inside a collapsed expandable node to expand it. */
const HOVER_EXPAND_MS = 700;

/** Mouse and pen only: touch goes to the long-press TouchSensor, so a touch drag scrolls instead of dragging. */
class MousePenSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: ReactPointerEvent, options: PointerSensorOptions) =>
        event.nativeEvent.pointerType !== 'touch' &&
        PointerSensor.activators[0].handler(event, options),
    },
  ];
}

// TreeView announces in its own polite region (shared with keyboard moves); dnd-kit's is left silent.
const SILENT: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

/** A node's row as the drag source (whole row; the sensors' constraints keep clicks and taps selecting). */
export function DragRow({
  dragId,
  ...props
}: HTMLAttributes<HTMLDivElement> & { dragId?: string }) {
  const { setNodeRef, listeners } = useDraggable({ id: dragId! });
  return createElement('div', { ...props, ...listeners, ref: setNodeRef });
}

interface Options {
  flat: TreeItem[];
  rootEl: RefObject<HTMLDivElement | null>;
  /** Rendered treeitems by key; a list item's first child is its row. */
  itemEls: RefObject<Map<string, HTMLDivElement>>;
  canDrop?: (id: string, parentId: string | null) => boolean;
  onExpandedChange: (id: string, expanded: boolean) => void;
  announce: (text: string) => void;
  onDrop: (item: NodeItem, move: TreeViewMove) => void;
}

/** Pointer and touch drag-to-move for TreeView's list view: `DndContext` props plus the live drag state. */
export function useTreeDrag({
  flat,
  rootEl,
  itemEls,
  canDrop,
  onExpandedChange,
  announce,
  onDrop,
}: Options) {
  const t = useTranslation();
  const sensors = useSensors(
    useSensor(MousePenSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const shown = useRef<DropTarget | null>(null);
  // Last pointer position in viewport px. dnd-kit's `delta` folds in autoscroll, so track the pointer itself.
  const pointer = useRef<Coordinates | null>(null);
  const scroller = useRef<Element | null>(null);
  // dnd-kit's live region and English instructions render into this detached node, never the document.
  const [parked] = useState(() =>
    typeof document === 'undefined' ? undefined : document.createElement('div'),
  );
  const expandRef = useRef(onExpandedChange);
  expandRef.current = onExpandedChange;

  const find = (id: string) =>
    flat.find((i): i is NodeItem => i.kind === 'node' && i.node.id === id);

  useEffect(() => {
    if (activeId === null) return;
    const track = (e: Event) => {
      pointer.current = getEventCoordinates(e) ?? pointer.current;
    };
    document.addEventListener('pointermove', track, true);
    document.addEventListener('touchmove', track, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointermove', track, true);
      document.removeEventListener('touchmove', track, true);
    };
  }, [activeId]);

  // Hover-to-expand: over the middle of a collapsed, expandable node.
  const over =
    target?.indicator.zone === 'inside' ? flat.find((i) => i.key === target.indicator.key) : null;
  const expandId =
    over?.kind === 'node' && over.node.hasChildren && !over.expanded ? over.node.id : null;
  useEffect(() => {
    if (expandId === null) return;
    const timer = setTimeout(() => expandRef.current(expandId, true), HOVER_EXPAND_MS);
    return () => clearTimeout(timer);
  }, [expandId]);

  const hit = (id: string, activatorEvent: Event, delta: Coordinates) => {
    const root = rootEl.current;
    const start = getEventCoordinates(activatorEvent);
    const p = pointer.current ?? (start && add(start, delta));
    if (!root || !p) return null;
    const box = root.getBoundingClientRect();
    // Rows scrolled out of the tree's scroll container are not under the pointer.
    const s = scroller.current;
    const clip = s && s !== document.scrollingElement ? s.getBoundingClientRect() : box;
    const bounds = {
      top: Math.max(box.top, clip.top),
      bottom: Math.min(box.bottom, clip.bottom),
      left: Math.max(box.left, clip.left),
      right: Math.min(box.right, clip.right),
    };
    const rows = flat.flatMap((i) => {
      const r = itemEls.current.get(i.key)?.firstElementChild?.getBoundingClientRect();
      return r ? [{ key: i.key, top: r.top, bottom: r.bottom }] : [];
    });
    const h = hitTest(rows, bounds, p.x, p.y);
    return h && dropTarget(flat, id, h.key, h.zone, canDrop);
  };

  const overText = (name: string, d: DropTarget) => {
    const at = flat.find((i) => i.key === d.indicator.key);
    if (at?.kind !== 'node') return null;
    let zone = d.indicator.zone;
    let label = at.node.label;
    // "After" an expanded node lands before its first child.
    if (zone === 'after' && d.indicator.level > at.level) {
      const first = at.children[0];
      if (first?.kind === 'node') [zone, label] = ['before', first.node.label];
      else zone = 'inside';
    }
    const key =
      zone === 'before'
        ? 'treeView.dragOverBefore'
        : zone === 'after'
          ? 'treeView.dragOverAfter'
          : 'treeView.dragOverInside';
    return t(key, { name, target: label });
  };

  const finish = () => {
    setActiveId(null);
    setTarget(null);
    shown.current = null;
    pointer.current = null;
  };

  const cancelled = (id: string) =>
    announce(t('drag.cancelled', { item: find(id)?.node.label || t('drag.unnamed') }));

  // Stable: dnd-kit re-subscribes its monitor whenever these change identity.
  const autoScroll = useMemo(
    // Only the tree's own scroll container (the dragged row's nearest scrollable ancestor), never beyond it.
    () => ({ canScroll: (el: Element) => el === scroller.current }),
    [],
  );
  const accessibility = useMemo(
    () => ({ announcements: SILENT, container: parked, restoreFocus: false }),
    [parked],
  );

  const dndProps: Omit<DndContextProps, 'children'> = {
    sensors,
    autoScroll,
    accessibility,
    onDragStart: ({ active }: DragStartEvent) => {
      const id = String(active.id);
      const item = find(id);
      setActiveId(id);
      setTarget(null);
      shown.current = null;
      pointer.current = null;
      const row = item && itemEls.current.get(item.key)?.firstElementChild;
      scroller.current = row ? (getScrollableAncestors(row, 1)[0] ?? null) : null;
      announce(t('drag.pickedUp', { item: item?.node.label || t('drag.unnamed') }));
    },
    onDragMove: ({ active, activatorEvent, delta }: DragMoveEvent) => {
      const id = String(active.id);
      const next = hit(id, activatorEvent, delta);
      const prev = shown.current;
      const a = next?.indicator;
      const b = prev?.indicator;
      if (a?.key === b?.key && a?.zone === b?.zone && a?.level === b?.level) return;
      shown.current = next;
      setTarget(next);
      const text = next && overText(find(id)?.node.label || t('drag.unnamed'), next);
      if (text) announce(text);
    },
    onDragEnd: ({ active, activatorEvent, delta }: DragEndEvent) => {
      const id = String(active.id);
      // Re-hit on release: a hover-expand may have moved rows since the last pointer move.
      const final = hit(id, activatorEvent, delta);
      const item = find(id);
      finish();
      if (final && item) onDrop(item, final.move);
      else cancelled(id);
    },
    onDragCancel: ({ active }) => {
      finish();
      cancelled(String(active.id));
    },
  };

  return {
    dndProps,
    activeId,
    target,
    activeLabel: activeId ? find(activeId)?.node.label : undefined,
  };
}
