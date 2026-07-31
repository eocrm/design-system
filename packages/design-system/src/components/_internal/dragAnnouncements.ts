// dragAnnouncements.ts — localized screen-reader copy for dnd-kit drags.
//
// dnd-kit's built-in announcements are hard-coded English AND interpolate raw
// ids ("Draggable item deal-7 was moved over droppable area col-3"), which is
// both a Hard rule 9 violation and useless to a listener. Every `<DndContext>`
// in the library passes `accessibility={useDragAccessibility(...)}` instead.
//
// Internal — not exported from `src/index.ts`.
import { useMemo, useRef, type RefObject } from 'react';
import type { Active, Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import { useTranslation } from '../../i18n';

/** Collapse whitespace and cap the length so an announcement stays listenable. */
export function tidy(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat;
}

/**
 * What a draggable publishes on its dnd-kit `data` so the announcements can
 * name it. Read with `dragLabelOf`.
 */
export interface DragLabelData {
  /** Consumer's explicit `aria-label`. Wins outright when set. */
  dragLabel?: string;
  /** The rendered node to read text from when there is no explicit label. */
  dragNode?: RefObject<HTMLElement | null>;
}

/**
 * The name to announce for a draggable: the consumer's `aria-label` if there is
 * one, else the node's rendered text.
 *
 * Reading the DOM rather than walking the React children is deliberate. A card
 * with a `<DropdownMenu>` / `<Tooltip>` / `<ConfirmationPopover>` in it has the
 * closed panel's contents in its children tree but NOT in the document, so a
 * children walk announces "Draft Q3 OKRs View Archive" while the DOM announces
 * "Draft Q3 OKRs". Collapsed and portalled subtrees drop out by construction.
 */
export function dragLabelOf(data: Record<string, unknown> | undefined): string | undefined {
  const { dragLabel, dragNode } = (data ?? {}) as DragLabelData;
  if (typeof dragLabel === 'string' && dragLabel.trim()) return tidy(dragLabel);
  const node = dragNode?.current;
  if (!node) return undefined;
  const text = tidy(domText(node));
  return text || undefined;
}

/**
 * `textContent` for announcements: separates element boundaries with a space
 * (raw `textContent` glues siblings — "Acme Corp$50,000") and skips
 * `aria-hidden` subtrees, which are decoration a screen reader is already told
 * to ignore.
 */
function domText(el: Element): string {
  let out = '';
  for (const child of el.childNodes) {
    if (child.nodeType === 3) out += child.nodeValue ?? '';
    else if (child.nodeType === 1 && (child as Element).getAttribute('aria-hidden') !== 'true')
      out += ` ${domText(child as Element)}`;
  }
  return out;
}

/**
 * The accessible name a consumer gave a container (a Kanban column, a
 * SortableGroup list) — `aria-label`, or the text of whatever `aria-labelledby`
 * points at, since naming a column by its visible `<Title>` is the natural
 * choice. Returns undefined when neither is set; the caller falls back to a
 * positional stand-in.
 */
export function containerName(props: {
  'aria-label'?: string;
  'aria-labelledby'?: string;
}): string | undefined {
  const label = props['aria-label'];
  if (typeof label === 'string' && label.trim()) return tidy(label);
  const ids = props['aria-labelledby'];
  if (!ids || typeof document === 'undefined') return undefined;
  const text = ids
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
  return text.trim() ? tidy(text) : undefined;
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
 * Default `describe`: the name from `dragLabelOf`, plus the index / items
 * `useSortable` already publishes under `data.sortable`. Returns `null` for
 * anything that is not a sortable item (including a missing entry).
 */
export function sortableTarget(entry: DragEntry | null): DragTarget | null {
  const data = entry?.data.current;
  const sortable = data?.sortable as { index: number; items: unknown[] } | undefined;
  if (!sortable || sortable.index < 0) return null;
  return {
    label: dragLabelOf(data),
    index: sortable.index + 1,
    total: sortable.items.length,
  };
}

/**
 * Describes the slot an `active` / `over` entry names. `activeId` is passed so
 * a container droppable can answer "where would THIS card land in me" — the
 * multi-list components need it to position a drop onto an empty column.
 *
 * `entry` is null when dnd-kit resolved no `over` at all. Most components
 * return null straight back; a component whose drop has its OWN fallback for
 * that case (DataTable's last-resolved band slot, #383) must answer with that
 * slot here too, or it announces "nothing moved" about a real reorder.
 */
export type DescribeDragTarget = (
  entry: DragEntry | null,
  activeId: Active['id'],
) => DragTarget | null;

/**
 * Build the `accessibility` prop for a `<DndContext>`: localized announcements
 * for the whole drag lifecycle plus localized keyboard instructions.
 *
 * @param describe   Resolves an entry (or `null` when there is no `over`) to a
 *                   human slot. Return `null` when nothing would land anywhere
 *                   — that announces "not over a drop target" / "nothing
 *                   moved".
 * @param isRejectedDrop Optional. Consulted before describing `over` and again
 *                   on drag end: return `true` when the component refuses to
 *                   commit the current target, so it announces that the item
 *                   is outside during the drag and cancels on release
 *                   (Kanban's outside-the-board release, #390).
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
      describeRef.current(entry, activeId)?.label || t('drag.unnamed');

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
          if (rejectedRef.current?.()) return t('drag.movedOutside', { item });
          const target = describeRef.current(over, active.id);
          return target ? at('movedOver', item, target) : t('drag.movedOutside', { item });
        },
        onDragEnd: ({ active, over }) => {
          const item = nameOf(active, active.id);
          if (rejectedRef.current?.()) return t('drag.cancelled', { item });
          const target = describeRef.current(over, active.id);
          return target ? at('dropped', item, target) : t('drag.droppedNowhere', { item });
        },
        onDragCancel: ({ active }) => t('drag.cancelled', { item: nameOf(active, active.id) }),
      } satisfies Announcements,
      screenReaderInstructions: { draggable: t('drag.instructions') },
    };
  }, [t]);
}
