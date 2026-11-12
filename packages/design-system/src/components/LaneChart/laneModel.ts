import {
  PALETTE_SIZE,
  X_AXIS_HEIGHT,
  computeLayout,
  resolveAnnotations,
  resolveSeries,
  type ChartAnnotation,
  type ChartCurve,
  type ChartLayout,
  type ChartReferenceLine,
  type ChartSeriesColor,
  type Rect,
} from '../Chart/chartModel';
import type { ChartViewport } from '../Chart/chartViewport';

/**
 * How a lane draws its measure: `'bar'` (amounts per category, y from 0), `'line'` (a level over time) or `'dots'`
 * (presence: a dot where the value is > 0, no y axis).
 */
export type LaneType = 'bar' | 'line' | 'dots';

/** One measure of a `LaneChart`, with its own y scale and unit. */
export interface Lane {
  /** Stable identifier (React key, table column). */
  key: string;
  /** Measure name, drawn above the lane and used in the tooltip, announcement and data table, e.g. "Food". */
  label: string;
  /** `'bar'`, `'line'` or `'dots'`; see `LaneType`. */
  type: LaneType;
  /** One value per category (`values[i]` belongs to `categories[i]`); `null` is a gap. Shorter arrays are padded with gaps. */
  values: (number | null)[];
  /** Formats this lane's values for its y ticks, the tooltip and the data table (the app owns units and i18n). */
  formatValue: (n: number) => string;
  /** `line` only: `false` fits the y axis to the data instead of starting at 0. Default `true`. Bars always start at 0. */
  includeZero?: boolean;
  /** Whole-number y ticks only, for counts. Default `false`. */
  integerValues?: boolean;
  /** Palette slot 1–8; default the lane's position (1 for the first lane, wrapping after 8). */
  color?: ChartSeriesColor;
  /** `line` only: `'smooth'` (default) or `'linear'`. */
  curve?: ChartCurve;
  /** Horizontal lines at constant values inside this lane, as `Chart`'s `referenceLines`. Ignored on `dots`. */
  referenceLines?: ChartReferenceLine[];
  /** Status glyphs on this lane's categories, as `Chart`'s `annotations`. Ignored on `dots`. */
  annotations?: ChartAnnotation[];
}

/** A lane's palette slot: its `color`, else its position (1-based, wrapping after the palette). */
export const laneSlot = (lane: Lane, i: number): ChartSeriesColor =>
  lane.color ?? (((i % PALETTE_SIZE) + 1) as ChartSeriesColor);

/**
 * A dots lane's dot radius: the token radius, shrunk at high density so neighbouring dots never overlap
 * (at most half the band `step` less a hairline). Pass the step under the current viewport: zooming in grows them back.
 */
export const laneDotRadius = (tokenRadius: number, step: number) =>
  Math.min(tokenRadius, Math.max(0.5, step / 2 - 0.5));

/** All coordinates of a lane (`layout`, `dots`, `labelY`) are local to `top`: draw it in a `translate(0, top)` group. */
export interface LaneGeometry {
  key: string;
  top: number;
  height: number;
  /** Baseline of the lane label, which sits in the top `laneLabelHeight` of the lane. */
  labelY: number;
  /** `null` for a `dots` lane (no y scale). */
  layout: ChartLayout | null;
  dots: { index: number; cx: number; cy: number }[];
}

export interface LaneChartLayout {
  gutterLeft: number;
  /** Union across lanes, in svg coordinates. */
  plot: Rect;
  categoryX: number[];
  step: number;
  /** Drawn once; under the bottom lane (below it, in the reserved `X_AXIS_HEIGHT`, when that lane is dots). */
  xLabels: ChartLayout['xLabels'];
  lanes: LaneGeometry[];
}

export function computeLaneLayout(input: {
  lanes: Lane[];
  categories: string[];
  width: number;
  height: number;
  viewport: ChartViewport | null;
  topGutter: number;
  /** Total lane height, label band included: pass `laneLabelHeight` plus room for a dot. */
  dotsLaneHeight: number;
  laneGap: number;
  laneLabelHeight: number;
}): LaneChartLayout {
  const { lanes, categories, width, height, viewport, topGutter, dotsLaneHeight } = input;
  const { laneGap, laneLabelHeight } = input;
  const bottomIsDots = lanes.length > 0 && lanes[lanes.length - 1].type === 'dots';
  const plotLanes = lanes.filter((l) => l.type !== 'dots');
  const reserved = bottomIsDots ? X_AXIS_HEIGHT : 0;
  const free =
    height -
    topGutter -
    reserved -
    laneGap * Math.max(0, lanes.length - 1) -
    dotsLaneHeight * (lanes.length - plotLanes.length);
  const laneHeight = (l: Lane) => (l.type === 'dots' ? dotsLaneHeight : free / plotLanes.length);

  const layoutFor = (lane: Lane, i: number, h: number, gutterLeft?: number): ChartLayout => {
    const { series } = resolveSeries(
      lane.type as 'bar' | 'line',
      [
        {
          key: lane.key,
          label: lane.label,
          values: lane.values,
          color: laneSlot(lane, i),
        },
      ],
      categories.length,
    );
    return computeLayout({
      type: lane.type as 'bar' | 'line',
      categories,
      series,
      width,
      height: h,
      formatValue: lane.formatValue,
      curve: lane.curve,
      includeZero: lane.includeZero,
      integerValues: lane.integerValues,
      topGutter: laneLabelHeight,
      viewport,
      referenceLines: lane.referenceLines,
      annotations: resolveAnnotations(lane.annotations ?? [], categories).annotations,
      gutterLeft,
      xLabels: i === lanes.length - 1,
    });
  };
  // x-axis stand-in for lanes without a y scale; `gutterLeft` 0 since there are no tick labels.
  const stand = (gutterLeft: number) =>
    computeLayout({
      type: 'line',
      categories,
      series: [],
      width,
      height: X_AXIS_HEIGHT + 1,
      formatValue: String,
      viewport,
      gutterLeft,
    });

  // Pass 1: natural gutters; pass 2: the widest one pinned on every lane.
  const gutterLeft = Math.max(
    0,
    ...lanes.flatMap((l, i) => (l.type === 'dots' ? [] : [layoutFor(l, i, laneHeight(l)).plot.x])),
  );
  let top = topGutter;
  const geometry = lanes.map((lane, i): LaneGeometry => {
    const h = laneHeight(lane);
    const layout = lane.type === 'dots' ? null : layoutFor(lane, i, h, gutterLeft);
    const g = { key: lane.key, top, height: h, labelY: laneLabelHeight, layout, dots: [] };
    top += h + laneGap;
    return g;
  });
  const standIn = stand(gutterLeft);
  const ref = geometry.find((g) => g.layout)?.layout ?? standIn;
  const lastLayout = geometry[geometry.length - 1]?.layout;
  geometry.forEach((g, i) => {
    if (lanes[i].type !== 'dots') return;
    g.dots = lanes[i].values.flatMap((v, index) =>
      v !== null && v > 0
        ? [
            {
              index,
              cx: ref.categoryX[index],
              cy: laneLabelHeight + (g.height - laneLabelHeight) / 2,
            },
          ]
        : [],
    );
  });
  // Every lane, dots included: from the top lane's plot (a dots lane's dot row) to the bottom lane's.
  const first = geometry[0];
  const last = geometry[geometry.length - 1];
  const y0 = first ? first.top + (first.layout?.plot.y ?? laneLabelHeight) : topGutter;
  const y1 = last
    ? last.top + (last.layout ? last.layout.plot.y + last.layout.plot.height : last.height)
    : height - reserved;

  return {
    gutterLeft,
    plot: { x: ref.plot.x, width: ref.plot.width, y: y0, height: y1 - y0 },
    categoryX: ref.categoryX,
    step: ref.step,
    xLabels: lastLayout ? lastLayout.xLabels : standIn.xLabels,
    lanes: geometry,
  };
}
