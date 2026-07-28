// dragAnnouncements.ts — localized screen-reader copy for dnd-kit drags.
//
// dnd-kit's built-in announcements are hard-coded English AND interpolate raw
// ids ("Draggable item deal-7 was moved over droppable area col-3"), which is
// both a Hard rule 9 violation and useless to a listener. Every `<DndContext>`
// in the library passes `accessibility={useDragAccessibility(...)}` instead.
//
// Internal — not exported from `src/index.ts`.
import { isValidElement, useMemo, useRef, type ReactNode } from 'react';
import type { Active, Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import { useTranslation } from '../../i18n';

/**
 * Flatten a children subtree to the text a sighted user reads, so an item can
 * announce itself by name instead of by id. Walks `props.children` only —
 * text rendered by a custom component (which this cannot call) is invisible,
 * and the caller falls back to `drag.unnamed`.
 *
 * It cannot tell decorative markup apart from content, so literal text inside a
 * `<Sortable.Handle>` (`<Sortable.Handle>⠿</Sortable.Handle>`) is included. An
 * icon component — the normal case — contributes nothing, so this is only worth
 * avoiding if you put real words in a handle.
 */
export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return '';
}

/** Collapse whitespace and cap the length so an announcement stays listenable. */
export function tidy(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat;
}

/** The `active` / `over` shape dnd-kit hands to an announcement callback. */
export type DragEntry = Pick<Active, 'id' | 'data'>;

/** What a component knows about the slot an id occupies (or would land in). */
export interface DragTarget {
  /** Human name. Empty / omitted → the message says "the item" instead. */
  label?: string;
  /** 1-based slot within `container`. */
  index: number;
  /** Number of slots in `container`, counting the incoming item. */
  total: number;
  /** Human name of the list the slot belongs to. Omit in single-list components. */
  container?: string;
}

/**
 * Default `describe`: the label a component published as `data.dragLabel`, plus
 * the index / items `useSortable` already publishes under `data.sortable`.
 * Returns `null` for anything that is not a sortable item.
 */
export function sortableTarget(entry: DragEntry): DragTarget | null {
  const data = entry.data.current;
  const sortable = data?.sortable as { index: number; items: unknown[] } | undefined;
  if (!sortable || sortable.index < 0) return null;
  return {
    label: typeof data?.dragLabel === 'string' ? data.dragLabel : undefined,
    index: sortable.index + 1,
    total: sortable.items.length,
  };
}

/**
 * Describes the slot an `active` / `over` entry names. `activeId` is passed so
 * a container droppable can answer "where would THIS card land in me" — the
 * multi-list components need it to position a drop onto an empty column.
 */
export type DescribeDragTarget = (entry: DragEntry, activeId: Active['id']) => DragTarget | null;

/**
 * Build the `accessibility` prop for a `<DndContext>`: localized announcements
 * for the whole drag lifecycle plus localized keyboard instructions.
 *
 * @param describe   Resolves an entry to a human slot. Return `null` when the
 *                   entry names no droppable slot — that announces "not over a
 *                   drop target" / "nothing moved".
 * @param isRejectedDrop Optional. Consulted on drag end BEFORE `over`: return
 *                   `true` when the component refuses to commit the release, so
 *                   it announces a cancel rather than a drop that never
 *                   happened (Kanban's outside-the-board release, #390).
 */
export function useDragAccessibility(
  describe: DescribeDragTarget,
  isRejectedDrop?: () => boolean,
): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
  const t = useTranslation();

  // Latched during render so the returned object can stay stable across the
  // re-renders a live drag causes (dnd-kit re-subscribes its monitor listener
  // whenever `announcements` changes identity). Both writes are idempotent —
  // a StrictMode double render stores the same functions.
  const describeRef = useRef(describe);
  describeRef.current = describe;
  const rejectedRef = useRef(isRejectedDrop);
  rejectedRef.current = isRejectedDrop;

  return useMemo(() => {
    const nameOf = (entry: DragEntry, activeId: Active['id']) =>
      tidy(describeRef.current(entry, activeId)?.label ?? '') || t('drag.unnamed');

    const at = (
      key: 'movedOver' | 'dropped',
      item: string,
      target: DragTarget,
    ): string | undefined => {
      const { index, total, container } = target;
      return container == null
        ? t(`drag.${key}`, { item, index, total })
        : t(key === 'movedOver' ? 'drag.movedOverIn' : 'drag.droppedIn', {
            item,
            index,
            total,
            container,
          });
    };

    return {
      announcements: {
        onDragStart: ({ active }) => t('drag.pickedUp', { item: nameOf(active, active.id) }),
        onDragOver: ({ active, over }) => {
          const item = nameOf(active, active.id);
          const target = over ? describeRef.current(over, active.id) : null;
          return target ? at('movedOver', item, target) : t('drag.movedOutside', { item });
        },
        onDragEnd: ({ active, over }) => {
          const item = nameOf(active, active.id);
          if (rejectedRef.current?.()) return t('drag.cancelled', { item });
          const target = over ? describeRef.current(over, active.id) : null;
          return target ? at('dropped', item, target) : t('drag.droppedNowhere', { item });
        },
        onDragCancel: ({ active }) => t('drag.cancelled', { item: nameOf(active, active.id) }),
      } satisfies Announcements,
      screenReaderInstructions: { draggable: t('drag.instructions') },
    };
  }, [t]);
}
