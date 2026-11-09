import { arc } from 'd3-shape';
import { assignSlots, type ChartSeriesColor } from '../Chart/chartModel';

/** One donut segment as supplied by the consumer. */
export interface DonutSegment {
  /** Stable identity (React key). */
  key: string;
  /** Human name shown in the legend, tooltip and data table. */
  label: string;
  /** Magnitude. Non-finite or negative values are treated as 0 (not drawn). */
  value: number;
  /** Palette slot (`--chart-series-N`). Omit to fill free slots in order. */
  color?: ChartSeriesColor;
}

/** A segment with sanitised value, palette slot and angles. */
export interface ResolvedSegment {
  /** The consumer's segment. */
  segment: DonutSegment;
  /** Sanitised value: non-finite or negative becomes 0. */
  value: number;
  /** `value / total`; 0 when the total is 0. */
  share: number;
  /** Palette slot 1-8. */
  slot: number;
  /** Start angle in radians, clockwise from 12 o'clock. Equals `end` when not drawn. */
  start: number;
  /** End angle in radians, clockwise from 12 o'clock. */
  end: number;
  /** True when `value > 0`. */
  drawn: boolean;
}

/** Result of {@link resolveDonut}. */
export interface ResolvedDonut {
  /** Sum of sanitised values. */
  total: number;
  /** One entry per input segment, in input order. */
  segments: ResolvedSegment[];
  /** True when more segments than free palette slots made slots repeat. */
  overflow: boolean;
  /** Keys of segments whose value was non-finite or negative. */
  invalid: string[];
}

/** Minimum angle in radians (about 3.4 degrees) any drawn segment spans, so tiny values stay visible. */
export const MIN_SEGMENT_ANGLE = 0.06;

const TAU = Math.PI * 2;

/** Sanitise values, assign slots and lay segments out clockwise from 12 o'clock. */
export function resolveDonut(segments: readonly DonutSegment[]): ResolvedDonut {
  const invalid: string[] = [];
  const values = segments.map((s) => {
    if (Number.isFinite(s.value) && s.value >= 0) return s.value;
    invalid.push(s.key);
    return 0;
  });
  const total = values.reduce((a, b) => a + b, 0);
  const slots = assignSlots(segments.map((s) => s.color));

  // Spans: proportional, with any span under the minimum pinned to it and the rest rescaled.
  const spans = values.map(() => 0);
  const drawn = values.flatMap((v, i) => (v > 0 ? [i] : []));
  if (drawn.length * MIN_SEGMENT_ANGLE >= TAU) {
    for (const i of drawn) spans[i] = TAU / drawn.length;
  } else {
    const pinned = new Set<number>();
    for (let changed = true; changed; ) {
      changed = false;
      const free = drawn.filter((i) => !pinned.has(i));
      const freeSum = free.reduce((a, i) => a + values[i], 0);
      const room = TAU - pinned.size * MIN_SEGMENT_ANGLE;
      for (const i of free) {
        if ((values[i] / freeSum) * room < MIN_SEGMENT_ANGLE) {
          pinned.add(i);
          changed = true;
        }
      }
      if (!changed) for (const i of free) spans[i] = (values[i] / freeSum) * room;
    }
    for (const i of pinned) spans[i] = MIN_SEGMENT_ANGLE;
  }

  let cursor = 0;
  return {
    total,
    invalid,
    overflow: slots.some((s) => s.overflow),
    segments: segments.map((segment, i) => {
      const start = cursor;
      cursor += spans[i];
      return {
        segment,
        value: values[i],
        share: total > 0 ? values[i] / total : 0,
        slot: slots[i].slot,
        start,
        end: cursor,
        drawn: values[i] > 0,
      };
    }),
  };
}

/** SVG path of one ring segment centred on the origin. A full ring ignores `padAngle` so it cannot vanish. */
export function donutArcPath(
  start: number,
  end: number,
  outer: number,
  inner: number,
  padAngle: number,
): string {
  const pad = end - start >= TAU - 1e-9 ? 0 : padAngle;
  return (
    arc()({
      startAngle: start,
      endAngle: end,
      innerRadius: inner,
      outerRadius: outer,
      padAngle: pad,
    }) ?? ''
  );
}

/** Outer radius is half of `size`; inner is `thickness` less, never negative. */
export function donutRadii(size: number, thickness: number): { outer: number; inner: number } {
  const outer = size / 2;
  return { outer, inner: Math.max(0, outer - thickness) };
}
