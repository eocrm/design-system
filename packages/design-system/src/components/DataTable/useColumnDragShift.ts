import { useRef, type RefObject } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { computeColumnShifts, shiftVarName } from './columnShift';

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
  onDragActiveChange,
}: ColumnDragShiftArgs): void {
  const writtenRef = useRef<string[]>([]);

  const clear = () => {
    writtenRef.current = applyColumnShifts(rootRef.current, {}, writtenRef.current);
    onDragActiveChange(false);
  };

  useDndMonitor({
    onDragStart() {
      if (!enabled) return;
      onDragActiveChange(true);
    },
    onDragMove(event) {
      if (!enabled) return;
      const shifts = computeColumnShifts({
        orderedIds,
        activeId: String(event.active.id),
        overId: event.over ? String(event.over.id) : null,
        widths,
        deltaX: event.delta.x,
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
