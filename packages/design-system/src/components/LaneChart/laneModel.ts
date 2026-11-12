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

export type LaneType = 'bar' | 'line' | 'dots';

export interface Lane {
  key: string;
  label: string;
  type: LaneType;
  values: (number | null)[];
  formatValue: (n: number) => string;
  includeZero?: boolean;
  integerValues?: boolean;
  /** Palette slot; default is the lane's position. */
  color?: ChartSeriesColor;
  curve?: ChartCurve;
  referenceLines?: ChartReferenceLine[];
  annotations?: ChartAnnotation[];
}

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
          color: lane.color ?? (((i % PALETTE_SIZE) + 1) as ChartSeriesColor),
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
  const first = geometry.find((g) => g.layout);
  const last = [...geometry].reverse().find((g) => g.layout);
  const y0 = first ? first.top + first.layout!.plot.y : topGutter;
  const y1 = last ? last.top + last.layout!.plot.y + last.layout!.plot.height : height - reserved;

  return {
    gutterLeft,
    plot: { x: ref.plot.x, width: ref.plot.width, y: y0, height: y1 - y0 },
    categoryX: ref.categoryX,
    step: ref.step,
    xLabels: lastLayout ? lastLayout.xLabels : standIn.xLabels,
    lanes: geometry,
  };
}
