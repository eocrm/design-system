import { useRef, type RefObject } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { clampX, computeColumnShifts, shiftVarName, type DragRangeX } from './columnShift';

/**
 * Measure how far the active column may travel, in px, from the REAL rendered
 * geometry of the header cells inside `root`.
 *
 * Declared widths (`columnSizingPx` / the `<col>` elements) cannot be used for
 * this. `DataTable.module.scss` sets `table-layout: fixed; width: max-content;
 * min-width: 100%`, so whenever the column sum is narrower than the scroll wrap
 * the table stretches and every rendered column is WIDER than declared. Summing
 * declared widths then under-reports the travel and makes the last slot
 * unreachable — the exact regression this replaced.
 *
 * The bound is the unpinned band, not the table: pinned columns are excluded
 * from reordering and `reorderRespectingPins` rejects a drop across a pin
 * boundary, so travelling over a pin would take the column somewhere it can
 * never land. `orderedIds` is therefore the unpinned columns only.
 *
 * All three rects are read in the same instant from the same scrolling
 * container, so the differences are correct table-space offsets no matter where
 * the wrap happens to be scrolled.
 *
 * Returns a zeroed range (pin in place) when `root` or any of the three header
 * cells cannot be found — an unmeasurable drag must not be an unbounded one.
 */
export function measureDragRangeX(
  root: HTMLElement | null,
  orderedIds: string[],
  activeId: string,
): DragRangeX {
  const zero = { min: 0, max: 0 };
  if (!root || orderedIds.length === 0) return zero;

  // Column ids are consumer-supplied and routinely contain dots, spaces, or
  // non-ASCII text — CSS.escape is what keeps them legal in a selector.
  const rectOf = (id: string) =>
    root.querySelector(`th[data-dt-column-id=${CSS.escape(id)}]`)?.getBoundingClientRect();

  const active = rectOf(activeId);
  const first = rectOf(orderedIds[0]);
  const last = rectOf(orderedIds[orderedIds.length - 1]);
  if (!active || !first || !last) return zero;

  return { min: first.left - active.left, max: last.right - active.right };
}

/**
 * Write one custom property per shifted column onto `root`, and remove the
 * properties for any column that shifted on the previous frame but not this
 * one. Returns the ids written, to be passed back as `previousIds` next frame.
 *
 * Custom properties are set on the table element, NOT a transform — a
 * transformed ancestor would establish a containing block and break
 * `position: sticky` on pinned cells. Variables inherit harmlessly.
 */
export function applyColumnShifts(
  root: HTMLElement | null,
  shifts: Record<string, number>,
  previousIds: string[],
): string[] {
  if (!root) return [];

  for (const id of previousIds) {
    if (!(id in shifts)) root.style.removeProperty(shiftVarName(id));
  }

  const written: string[] = [];
  for (const [id, px] of Object.entries(shifts)) {
    // Round: sub-pixel precision is invisible and would rewrite the style
    // attribute on every pointer event for no visual gain.
    root.style.setProperty(shiftVarName(id), `${Math.round(px)}px`);
    written.push(id);
  }
  return written;
}

/** Inputs for {@link useColumnDragShift}. */
export interface ColumnDragShiftArgs {
  /** The `<table>` element the custom properties are written to. */
  rootRef: RefObject<HTMLElement | null>;
  /** False when `dragWholeColumn` is off — the hook then does nothing. */
  enabled: boolean;
  /**
   * ALL unpinned column ids in current visual order — including columns with
   * `enableReorder: false`. Do NOT filter by reorderability: a non-reorderable
   * column cannot be *picked up*, but it is still displaced when a reorderable
   * column is dragged past it (and the drop moves it for real). Omit it and it
   * never shifts, so it and its neighbour render on top of each other.
   */
  orderedIds: string[];
  /** Rendered width per column id, px. */
  widths: Record<string, number>;
  /**
   * Caller-owned slot for the travel range measured at drag start, so the
   * `DndContext` modifier (which lives in the PARENT of this hook and therefore
   * cannot read a return value from it) clamps against the same numbers.
   * Written on drag start, nulled on drag end/cancel.
   */
  dragRangeRef: RefObject<DragRangeX | null>;
  /**
   * Caller-owned slot for the last member of `orderedIds` this drag resolved as
   * its target, or null before it resolves one. Written here — nulled at drag
   * start, set on every `onDragOver` whose target is in the band — and read
   * both here, to keep the displaced neighbours parked when dnd-kit hands over
   * something the drop cannot use, and by the drop handler in the parent, so
   * the commit lands on the slot the preview is showing. See the
   * `lastSlotIdRef` comment in `DataTable` for what "cannot use" covers.
   */
  lastSlotIdRef: RefObject<string | null>;
  /** Called once at drag start (true) and once at drag end/cancel (false). */
  onDragActiveChange: (active: boolean) => void;
}

/**
 * Subscribes to the surrounding `DndContext` and publishes per-column drag
 * offsets as CSS custom properties on the table element.
 *
 * MUST be called from a component rendered inside `<DndContext>`. Mount it in
 * a leaf that renders `null`, never in `DataTable` itself — `useDndMonitor`'s
 * callbacks fire on every pointer move, and keeping them in a leaf guarantees
 * the table body is never re-rendered mid-drag.
 */
export function useColumnDragShift({
  rootRef,
  enabled,
  orderedIds,
  widths,
  dragRangeRef,
  lastSlotIdRef,
  onDragActiveChange,
}: ColumnDragShiftArgs): void {
  const writtenRef = useRef<string[]>([]);

  const clear = () => {
    writtenRef.current = applyColumnShifts(rootRef.current, {}, writtenRef.current);
    dragRangeRef.current = null;
    onDragActiveChange(false);
  };

  useDndMonitor({
    onDragStart(event) {
      // Measured even when `enabled` is false: the header-only path does not
      // use this hook's shift variables, but its DndContext modifier reads the
      // very same range out of `dragRangeRef`.
      dragRangeRef.current = measureDragRangeX(
        rootRef.current,
        orderedIds,
        String(event.active.id),
      );
      // Ungated for the same reason: the drop handler reads this on BOTH paths.
      // Cleared here rather than at drag end so one drag can never inherit the
      // previous drag's target, and so the drop handler is free to read it
      // without depending on which of the two end callbacks dnd-kit runs first.
      lastSlotIdRef.current = null;
      if (!enabled) return;
      onDragActiveChange(true);
    },
    onDragOver(event) {
      // Band members only. A pinned column is a live droppable (dnd-kit's
      // boolean `disabled` stands down the draggable alone) and, being sticky,
      // it covers the band's last columns on a scrolled table — so it wins
      // collisions it can never accept a drop from.
      const id = event.over ? String(event.over.id) : null;
      if (id != null && orderedIds.includes(id)) lastSlotIdRef.current = id;
    },
    onDragMove(event) {
      if (!enabled) return;
      const shifts = computeColumnShifts({
        orderedIds,
        activeId: String(event.active.id),
        // #383: the last BAND slot, which is `over` itself whenever `over` is
        // one — `onDragOver` above has already recorded it. Reading `event.over`
        // raw is what used to collapse the preview: `computeColumnShifts` finds
        // no index for an out-of-band id, returns the active column's offset
        // alone, and every displaced neighbour snaps back, leaving the dragged
        // column overlapping the slot it is about to take. The drop commits
        // this same id, so preview and commit cannot disagree.
        overId: lastSlotIdRef.current,
        widths,
        // Clamping HERE, not only in the modifier, is what actually bounds the
        // column. dnd-kit computes `delta` as
        // `scrollAdjustedTranslate = add(modifiedTranslate, scrollAdjustment)`
        // — the scroll adjustment is added AFTER modifiers run, so a
        // modifier-only clamp is escaped by horizontal auto-scroll. Worse, it
        // ran away: the translated header inflated `scrollWidth`, which let
        // `scrollLeft` grow, which grew `scrollAdjustment`. `delta` is the
        // post-adjustment value, so clamping it is authoritative and the
        // feedback loop cannot start.
        // Fail CLOSED: an unmeasurable drag is a pinned one, never an
        // unbounded one. Unreachable today (onDragStart always sets the ref)
        // but the `??` keeps the guarantee if that ever stops being true.
        deltaX: clampX(event.delta.x, dragRangeRef.current ?? { min: 0, max: 0 }),
      });
      writtenRef.current = applyColumnShifts(rootRef.current, shifts, writtenRef.current);
    },
    // Deliberately ungated (unlike onDragStart/onDragMove above): `enabled`
    // can flip to false mid-drag, and if cleanup were also gated the
    // properties written at drag start would never be removed and
    // onDragActiveChange(false) would never fire — the table would be stuck
    // showing a shifted column. clear() is harmless as a no-op when nothing
    // was written, so running it unconditionally is always safe.
    onDragEnd() {
      clear();
    },
    onDragCancel() {
      clear();
    },
  });
}
