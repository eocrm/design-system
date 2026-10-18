/** One matched run: `start` and `length` are UTF-16 code-unit offsets into the text. */
export interface HighlightRange {
  /** Offset of the first matched UTF-16 code unit. */
  start: number;
  /** Number of matched UTF-16 code units. */
  length: number;
}

/** A run of the source text, flagged when it falls inside a highlight range. */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Split `text` into plain / matched segments. Ranges are clamped to the text,
 * empty or non-finite ones are dropped, and overlapping or touching ranges are
 * merged, so the output always covers `text` exactly once, in order.
 */
export function segmentHighlights(
  text: string,
  ranges: readonly HighlightRange[],
): HighlightSegment[] {
  const spans = ranges
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.length))
    .map((r) => [Math.max(0, r.start), Math.min(text.length, r.start + r.length)] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [s, e] of spans) {
    if (e <= cursor) continue; // fully inside an earlier match
    const start = Math.max(s, cursor);
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    const last = segments[segments.length - 1];
    // Overlapping/touching ranges continue the previous match instead of starting a new <mark>.
    if (last?.match && start === cursor) last.text += text.slice(start, e);
    else segments.push({ text: text.slice(start, e), match: true });
    cursor = e;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}
