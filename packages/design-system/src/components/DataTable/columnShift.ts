/**
 * Pure geometry for the whole-column drag preview. No DOM access — everything
 * here is a plain function so the maths can be unit-tested without rendering
 * a table or simulating a pointer.
 */

/** Inputs describing one frame of an in-progress column drag. */
export interface ColumnShiftArgs {
  /** Unpinned, reorderable column ids in their current visual order. */
  orderedIds: string[];
  /** Id of the column being dragged. */
  activeId: string;
  /** Id of the column currently hovered, or `null` when over nothing. */
  overId: string | null;
  /** Rendered width per column id, in px. */
  widths: Record<string, number>;
  /** Pointer delta on the x axis since drag start, in px. */
  deltaX: number;
}

/**
 * Translation in px for each column that moves this frame, keyed by column id.
 * Columns absent from the result do not move — callers treat a missing key as
 * `0` rather than writing an explicit zero for every untouched column.
 *
 * The active column follows the pointer; every column between its origin and
 * the hovered column slides one active-column-width in the opposite direction,
 * opening the gap the active column will drop into.
 */
export function computeColumnShifts({
  orderedIds,
  activeId,
  overId,
  widths,
  deltaX,
}: ColumnShiftArgs): Record<string, number> {
  const shifts: Record<string, number> = {};

  const from = orderedIds.indexOf(activeId);
  if (from === -1) return shifts;

  shifts[activeId] = deltaX;

  if (overId == null || overId === activeId) return shifts;
  const to = orderedIds.indexOf(overId);
  if (to === -1) return shifts;

  // A missing width means the column has no tracked size yet; shifting by 0 is
  // wrong-but-harmless, whereas NaN would poison the CSS value.
  const activeWidth = widths[activeId] ?? 0;

  if (to > from) {
    // Active column travels right: everything it passed slides left to fill in.
    for (let i = from + 1; i <= to; i++) shifts[orderedIds[i]] = -activeWidth;
  } else {
    // Active column travels left: everything it passed slides right.
    for (let i = to; i < from; i++) shifts[orderedIds[i]] = activeWidth;
  }

  return shifts;
}

/**
 * Turn an arbitrary column id into a fragment that is legal inside a CSS
 * custom-property name. Column ids are consumer-supplied and routinely contain
 * dots, spaces, or non-ASCII text, none of which are safe to interpolate.
 *
 * Sanitizing alone would collide (`a.b` and `a b` both become `a_b`), so a
 * stable hash of the original id is appended.
 */
export function cssIdent(columnId: string): string {
  const safe = columnId.replace(/[^a-zA-Z0-9_-]/g, '_');
  // djb2-style rolling hash — deterministic, no crypto needed, collisions are
  // vanishingly unlikely across one table's column set.
  let hash = 0;
  for (let i = 0; i < columnId.length; i++) {
    hash = (hash * 31 + columnId.charCodeAt(i)) | 0;
  }
  return `${safe}-${(hash >>> 0).toString(36)}`;
}

/** Full custom-property name carrying a column's current drag offset. */
export function shiftVarName(columnId: string): string {
  return `--dt-shift-${cssIdent(columnId)}`;
}
