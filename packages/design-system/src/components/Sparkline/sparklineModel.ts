// sparklineModel.ts — pure geometry + summary for <Sparkline>. No DOM; Node-tested.
import { scaleBand, scaleLinear } from 'd3-scale';
import { area as d3Area, curveMonotoneX, line as d3Line } from 'd3-shape';

/** Sparkline mark type. */
export type SparklineType = 'line' | 'area' | 'bar';

/** Px kept clear on every edge so the stroke and end dot are never clipped. */
export const SPARKLINE_INSET = 3;
/** End-dot radius in px. */
export const SPARKLINE_DOT_RADIUS = 2.5;

/** First / last / min / max of the finite values. */
export interface SparklineSummary {
  first: number;
  last: number;
  min: number;
  max: number;
}

export interface SparklineRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SparklineGeometry {
  /** Stroke path (line + area). */
  line?: string;
  /** Fill path (area only). */
  area?: string;
  /** Bars (bar only). */
  bars?: SparklineRect[];
  /** Marker on the last finite value (line + area). */
  dot?: { cx: number; cy: number };
}

const finite = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

export function summarize(values: readonly (number | null)[]): SparklineSummary | null {
  const nums = values.filter(finite);
  if (nums.length === 0) return null;
  // Loop, not Math.min(...nums): spread overflows the stack on very large arrays.
  let min = nums[0];
  let max = nums[0];
  for (const v of nums) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { first: nums[0], last: nums[nums.length - 1], min, max };
}

export function layoutSparkline(
  values: readonly (number | null)[],
  type: SparklineType,
  width: number,
  height: number,
): SparklineGeometry | null {
  const s = summarize(values);
  if (!s || width <= 0 || height <= 0) return null;
  const pad = SPARKLINE_INSET;
  const n = values.length;

  // Area/bar read as quantities: anchor at zero when nothing is negative.
  const lo = type !== 'line' && s.min >= 0 ? 0 : s.min;
  // All-negative bars hang from a zero line at the top (mirror of the zero baseline).
  const hi = type === 'bar' && s.max < 0 ? 0 : s.max;
  const y = scaleLinear()
    .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]) // flat → mid height
    .range([height - pad, pad]);

  if (type === 'bar') {
    const band = scaleBand<number>()
      .domain(values.map((_, i) => i))
      .range([0, width])
      .paddingInner(0.2);
    const zero = y(Math.min(Math.max(0, y.domain()[0]), y.domain()[1]));
    const bars: SparklineRect[] = [];
    values.forEach((v, i) => {
      if (!finite(v)) return;
      const top = y(v);
      bars.push({
        x: band(i) ?? 0,
        y: Math.min(top, zero),
        width: Math.max(1, band.bandwidth()),
        height: v === 0 ? 0 : Math.abs(zero - top),
      });
    });
    return { bars };
  }

  const xs = scaleLinear()
    .domain([0, Math.max(n - 1, 1)])
    .range([pad, width - pad]);
  const x = (i: number) => (n === 1 ? width / 2 : xs(i));

  const lineGen = d3Line<number | null>()
    .defined(finite)
    .x((_, i) => x(i))
    .y((v) => y(v as number))
    .curve(curveMonotoneX);
  const geometry: SparklineGeometry = { line: lineGen(values as (number | null)[]) ?? undefined };

  if (type === 'area') {
    const areaGen = d3Area<number | null>()
      .defined(finite)
      .x((_, i) => x(i))
      .y0(height - pad)
      .y1((v) => y(v as number))
      .curve(curveMonotoneX);
    geometry.area = areaGen(values as (number | null)[]) ?? undefined;
  }

  let last = n - 1;
  while (last >= 0 && !finite(values[last])) last--;
  geometry.dot = { cx: x(last), cy: y(values[last] as number) };
  return geometry;
}
